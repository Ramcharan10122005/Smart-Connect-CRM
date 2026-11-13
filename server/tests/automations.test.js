process.env.NODE_ENV = 'test';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import {
  matchesConditions,
  hasAlreadyExecuted,
  executeRule,
  runScheduledAutomations,
} from '../src/services/automation.service.js';

describe('Automation Engine Integration', () => {
  let adminToken;
  let repToken;
  let testLead;
  let testContact;
  let testStage;
  let createdRules = [];

  before(async () => {
    // 1. Log in Admin
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@smartconnect.com', password: 'Admin@123' });
    adminToken = adminRes.body.data.token;

    // 2. Log in Rep
    const repRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'alex.rep@smartconnect.com', password: 'Admin@123' });
    repToken = repRes.body.data.token;

    // 3. Get first pipeline stage
    testStage = await prisma.pipelineStage.findFirst({ orderBy: { position: 'asc' } });

    // 4. Create test contact & lead
    testContact = await prisma.contact.create({
      data: {
        firstName: 'Auto',
        lastName: 'Tester',
        email: `auto.test.${Date.now()}@example.com`,
      },
    });

    testLead = await prisma.lead.create({
      data: {
        title: 'Auto Test Lead',
        value: 15000,
        contactId: testContact.id,
        stageId: testStage.id,
      },
    });
  });

  after(async () => {
    // Cleanup rules and logs created in tests
    for (const rule of createdRules) {
      await prisma.automationLog.deleteMany({ where: { ruleId: rule.id } });
      await prisma.automationRule.deleteMany({ where: { id: rule.id } });
    }
    if (testLead) {
      await prisma.automationLog.deleteMany({ where: { entityId: testLead.id } });
      await prisma.followUp.deleteMany({ where: { leadId: testLead.id } });
      await prisma.activity.deleteMany({ where: { leadId: testLead.id } });
      await prisma.leadStageHistory.deleteMany({ where: { leadId: testLead.id } });
      await prisma.lead.deleteMany({ where: { id: testLead.id } });
    }
    if (testContact) {
      await prisma.automationLog.deleteMany({ where: { entityId: testContact.id } });
      await prisma.contact.deleteMany({ where: { id: testContact.id } });
    }
  });

  // -------------------------------------------------------------
  // 1. RULE CRUD & RBAC
  // -------------------------------------------------------------
  it('allows ADMIN to create an automation rule via API', async () => {
    const res = await request(app)
      .post('/api/v1/automations/rules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Test Rule ${Date.now()}`,
        trigger: 'LEAD_CREATED',
        conditions: { minValue: 1000 },
        action: 'CREATE_FOLLOWUP',
        actionConfig: { title: 'Call high value lead', dueInDays: 1, priority: 'HIGH' },
        isActive: true,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    createdRules.push(res.body.data);
  });

  it('prevents REP from creating or managing rules (RBAC 403)', async () => {
    const res = await request(app)
      .post('/api/v1/automations/rules')
      .set('Authorization', `Bearer ${repToken}`)
      .send({
        name: 'Forbidden Rule',
        trigger: 'LEAD_CREATED',
        action: 'CREATE_FOLLOWUP',
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  // -------------------------------------------------------------
  // 2. STALE DETECTION TEST
  // -------------------------------------------------------------
  it('detects stale leads in stage and executes configured action', async () => {
    // Set lead updatedAt to 10 days ago
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    await prisma.lead.update({
      where: { id: testLead.id },
      data: { updatedAt: tenDaysAgo },
    });

    // Create a stale rule (stale after 7 days)
    const staleRule = await prisma.automationRule.create({
      data: {
        name: `Stale Check Rule ${Date.now()}`,
        trigger: 'LEAD_STALE_IN_STAGE',
        conditions: { days: 7, stageId: testStage.id },
        action: 'CREATE_FOLLOWUP',
        actionConfig: { title: 'Check in on stale lead', dueInDays: 1 },
        isActive: true,
      },
    });
    createdRules.push(staleRule);

    // Run scheduled automations
    const result = await runScheduledAutomations();
    assert.ok(result.processed >= 1);

    // Verify follow-up was created for the stale lead
    const createdFollowUp = await prisma.followUp.findFirst({
      where: { leadId: testLead.id, title: 'Check in on stale lead' },
    });
    assert.ok(createdFollowUp, 'Follow-up should have been created for stale lead');

    // Verify automation log was recorded with SUCCESS
    const log = await prisma.automationLog.findFirst({
      where: { ruleId: staleRule.id, entityId: testLead.id },
    });
    assert.ok(log);
    assert.equal(log.status, 'SUCCESS');
  });

  // -------------------------------------------------------------
  // 3. IDEMPOTENCY TEST
  // -------------------------------------------------------------
  it('ensures rule is idempotent and does not fire twice for the same record', async () => {
    const staleRule = createdRules.find((r) => r.trigger === 'LEAD_STALE_IN_STAGE');
    assert.ok(staleRule);

    // Verify hasAlreadyExecuted returns true
    const alreadyRan = await hasAlreadyExecuted(staleRule, 'Lead', testLead.id, {
      record: testLead,
    });
    assert.equal(alreadyRan, true, 'Rule should be marked as already executed for this lead');

    // Re-executing the rule should return SKIPPED
    const execResult = await executeRule(staleRule, 'Lead', testLead, { stageId: testLead.stageId });
    assert.equal(execResult.status, 'SKIPPED');
    assert.equal(execResult.reason, 'ALREADY_EXECUTED');

    // Verify no second duplicate follow-up was created
    const count = await prisma.followUp.count({
      where: { leadId: testLead.id, title: 'Check in on stale lead' },
    });
    assert.equal(count, 1, 'Exactly one follow-up should exist');
  });

  // -------------------------------------------------------------
  // 4. LOOP GUARD TEST
  // -------------------------------------------------------------
  it('loop guard prevents a rule from triggering itself recursively', async () => {
    const loopRule = await prisma.automationRule.create({
      data: {
        name: `Self Triggering Rule ${Date.now()}`,
        trigger: 'LEAD_STAGE_CHANGED',
        action: 'CREATE_FOLLOWUP',
        actionConfig: { title: 'Loop test' },
        isActive: true,
      },
    });
    createdRules.push(loopRule);

    // Simulate an execution chain where loopRule is already in progress
    const executionChain = ['other-rule-id', loopRule.id];

    const result = await executeRule(
      loopRule,
      'Lead',
      testLead,
      { toStageId: 'target-stage' },
      executionChain
    );

    assert.equal(result.status, 'FAILED');
    assert.ok(result.error.toLowerCase().includes('loop detected'));

    // Verify a FAILED log was recorded highlighting the loop guard
    const log = await prisma.automationLog.findFirst({
      where: { ruleId: loopRule.id, status: 'FAILED' },
    });
    assert.ok(log);
    assert.ok(log.error.toLowerCase().includes('loop detected'));
  });

  // -------------------------------------------------------------
  // 5. MAX EXECUTION DEPTH GUARD
  // -------------------------------------------------------------
  it('halts execution chains exceeding maximum depth limit', async () => {
    const depthRule = await prisma.automationRule.create({
      data: {
        name: `Depth Rule ${Date.now()}`,
        trigger: 'LEAD_CREATED',
        action: 'CREATE_FOLLOWUP',
        isActive: true,
      },
    });
    createdRules.push(depthRule);

    const deepChain = ['rule-1', 'rule-2', 'rule-3', 'rule-4', 'rule-5'];
    const result = await executeRule(depthRule, 'Lead', testLead, {}, deepChain);

    assert.equal(result.status, 'SKIPPED');
    assert.ok(result.error.includes('Max execution depth'));
  });
});

