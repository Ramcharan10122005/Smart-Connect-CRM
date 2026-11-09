import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';

describe('Leads & Pipeline Module Integration', () => {
  let adminCookie = '';
  let repCookie = '';
  let repUser = null;

  let newStage = null;
  let qualifiedStage = null;
  let wonStage = null;
  let lostStage = null;
  let testLead = null;
  const testRunId = Date.now();

  before(async () => {
    // 1. Authenticate Admin
    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@smartconnect.com',
      password: 'Admin@123',
    });
    adminCookie = adminLogin.headers['set-cookie']
      .find((c) => c.startsWith('token='))
      .split(';')[0];

    // 2. Authenticate Rep
    const repLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'alex.rep@smartconnect.com',
      password: 'Admin@123',
    });
    repCookie = repLogin.headers['set-cookie'].find((c) => c.startsWith('token=')).split(';')[0];
    repUser = repLogin.body.data.user;

    // 3. Resolve pipeline stages
    const stages = await prisma.pipelineStage.findMany({ orderBy: { position: 'asc' } });
    newStage = stages.find((s) => s.type === 'OPEN' && s.position === 1) || stages[0];
    qualifiedStage = stages.find((s) => s.name === 'Qualified') || stages[2];
    wonStage = stages.find((s) => s.type === 'WON');
    lostStage = stages.find((s) => s.type === 'LOST');

    // 4. Create a test lead owned by Rep
    testLead = await prisma.lead.create({
      data: {
        title: `Big Enterprise Deal ${testRunId}`,
        firstName: 'Marcus',
        lastName: 'Vance',
        email: `marcus.vance.${testRunId}@innovatech.com`,
        phone: '+1 555-4321',
        companyName: `InnovaTech Solutions ${testRunId}`,
        value: 20000,
        currency: 'USD',
        stageId: newStage.id,
        ownerId: repUser.id,
        priority: 'HIGH',
        score: 40,
        status: 'OPEN',
      },
    });
  });

  after(async () => {
    if (testLead) {
      await prisma.leadStageHistory.deleteMany({ where: { leadId: testLead.id } });
      await prisma.activity.deleteMany({ where: { leadId: testLead.id } });
      const current = await prisma.lead.findUnique({ where: { id: testLead.id } });
      if (current?.convertedContactId) {
        await prisma.contact.deleteMany({ where: { id: current.convertedContactId } });
      }
      await prisma.lead.deleteMany({ where: { id: testLead.id } });
    }
    // Clean up created company if any
    await prisma.company.deleteMany({
      where: { name: `InnovaTech Solutions ${testRunId}` },
    });
  });

  // ---------------------------------------------------------------------------
  // 1. STAGE MOVE & STAGE HISTORY TESTS
  // ---------------------------------------------------------------------------
  it('PATCH /leads/:id/stage moves lead stage, logs LeadStageHistory and SYSTEM activity', async () => {
    const res = await request(app)
      .patch(`/api/v1/leads/${testLead.id}/stage`)
      .set('Cookie', repCookie)
      .send({ stageId: qualifiedStage.id });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.stageId, qualifiedStage.id);

    // Verify LeadStageHistory recorded
    const history = await prisma.leadStageHistory.findFirst({
      where: { leadId: testLead.id, toStageId: qualifiedStage.id },
    });
    assert.ok(history, 'LeadStageHistory entry should exist');
    assert.strictEqual(history.fromStageId, newStage.id);

    // Verify SYSTEM activity recorded
    const activity = await prisma.activity.findFirst({
      where: { leadId: testLead.id, type: 'SYSTEM' },
      orderBy: { occurredAt: 'desc' },
    });
    assert.ok(activity);
    assert.ok(activity.body.includes(qualifiedStage.name));
  });

  // ---------------------------------------------------------------------------
  // 2. LOST REASON VALIDATION TESTS
  // ---------------------------------------------------------------------------
  it('Moving lead to LOST stage without lostReason fails with 400 Bad Request', async () => {
    const res = await request(app)
      .patch(`/api/v1/leads/${testLead.id}/stage`)
      .set('Cookie', repCookie)
      .send({ stageId: lostStage.id }); // Missing lostReason

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'BAD_REQUEST');
    assert.ok(res.body.error.message.includes('lostReason is required'));
  });

  it('Moving lead to LOST stage with lostReason succeeds and sets status to LOST', async () => {
    const res = await request(app)
      .patch(`/api/v1/leads/${testLead.id}/stage`)
      .set('Cookie', repCookie)
      .send({
        stageId: lostStage.id,
        lostReason: 'Budget constraints following Q4 spending freeze',
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.stageId, lostStage.id);
    assert.strictEqual(res.body.data.status, 'LOST');
    assert.strictEqual(res.body.data.lostReason, 'Budget constraints following Q4 spending freeze');
  });

  // ---------------------------------------------------------------------------
  // 3. LEAD CONVERSION TESTS
  // ---------------------------------------------------------------------------
  it('POST /leads/:id/convert converts lead into Contact & Company, updates status to WON and copies activities', async () => {
    // Reopen lead first
    await prisma.lead.update({
      where: { id: testLead.id },
      data: { stageId: qualifiedStage.id, status: 'OPEN', lostReason: null },
    });

    // Add sample activity to the lead
    await prisma.activity.create({
      data: {
        type: 'CALL',
        subject: 'Demo discussion',
        leadId: testLead.id,
        createdById: repUser.id,
      },
    });

    const res = await request(app)
      .post(`/api/v1/leads/${testLead.id}/convert`)
      .set('Cookie', repCookie);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);

    const { contact, company, lead } = res.body.data;
    assert.ok(contact, 'Contact should be returned');
    assert.strictEqual(contact.firstName, 'Marcus');
    assert.strictEqual(contact.lastName, 'Vance');
    assert.strictEqual(contact.lifecycleStage, 'CUSTOMER');

    assert.ok(company, 'Company should be auto-created and returned');
    assert.strictEqual(company.name, `InnovaTech Solutions ${testRunId}`);

    assert.strictEqual(lead.status, 'WON');
    assert.strictEqual(lead.convertedContactId, contact.id);

    // Verify activity now references the new contact & company
    const updatedActivity = await prisma.activity.findFirst({
      where: { leadId: testLead.id, type: 'CALL' },
    });
    assert.strictEqual(updatedActivity.contactId, contact.id);
    assert.strictEqual(updatedActivity.companyId, company.id);
  });

  // ---------------------------------------------------------------------------
  // 4. KANBAN BOARD & WEIGHTED PIPELINE VALUE TESTS
  // ---------------------------------------------------------------------------
  it('GET /leads/board returns stages with count, totalValue, and weighted pipeline values', async () => {
    const res = await request(app).get('/api/v1/leads/board').set('Cookie', repCookie);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);

    const { stages, summary } = res.body.data;
    assert.ok(Array.isArray(stages), 'stages array must be returned');
    assert.ok(summary.totalPipelineValue >= 0);
    assert.ok(summary.totalWeightedPipelineValue >= 0);

    for (const s of stages) {
      assert.ok(s.stage.name);
      assert.strictEqual(typeof s.count, 'number');
      assert.strictEqual(typeof s.totalValue, 'number');
      assert.strictEqual(typeof s.weightedValue, 'number');

      // Verify formula: weightedValue = totalValue * (probability / 100)
      const expectedWeighted = Math.round(s.totalValue * (s.stage.probability / 100));
      assert.strictEqual(s.weightedValue, expectedWeighted);
    }
  });

  // ---------------------------------------------------------------------------
  // 5. STAGES REORDER & MANAGEMENT (ADMIN ONLY)
  // ---------------------------------------------------------------------------
  it('PATCH /pipeline-stages/reorder allows Admin to reorder stages', async () => {
    const allStages = await prisma.pipelineStage.findMany({ orderBy: { position: 'asc' } });
    const reversedIds = allStages.map((s) => s.id).reverse();

    const res = await request(app)
      .patch('/api/v1/pipeline-stages/reorder')
      .set('Cookie', adminCookie)
      .send({ stageIds: reversedIds });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);

    // Revert back order
    const originalIds = allStages.map((s) => s.id);
    await request(app)
      .patch('/api/v1/pipeline-stages/reorder')
      .set('Cookie', adminCookie)
      .send({ stageIds: originalIds });
  });
});
