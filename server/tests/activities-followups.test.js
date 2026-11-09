import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';

describe('Activities & Follow-ups Module Integration', () => {
  let adminCookie = '';
  let rep1Cookie = '';
  let rep2Cookie = '';
  let rep1User = null;
  let rep2User = null;

  let testContact = null;
  let testLead = null;
  let testFollowUp = null;
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

    // 2. Authenticate Rep 1
    const rep1Login = await request(app).post('/api/v1/auth/login').send({
      email: 'alex.rep@smartconnect.com',
      password: 'Admin@123',
    });
    rep1Cookie = rep1Login.headers['set-cookie'].find((c) => c.startsWith('token=')).split(';')[0];
    rep1User = rep1Login.body.data.user;

    // 3. Authenticate Rep 2
    const rep2Login = await request(app).post('/api/v1/auth/login').send({
      email: 'jordan.rep@smartconnect.com',
      password: 'Admin@123',
    });
    rep2Cookie = rep2Login.headers['set-cookie'].find((c) => c.startsWith('token=')).split(';')[0];
    rep2User = rep2Login.body.data.user;

    // 4. Create test contact
    testContact = await prisma.contact.create({
      data: {
        firstName: 'Diana',
        lastName: `Prince ${testRunId}`,
        email: `diana.${testRunId}@themyscira.gov`,
        ownerId: rep1User.id,
      },
    });

    // 5. Create test lead
    const stage = await prisma.pipelineStage.findFirst({ orderBy: { position: 'asc' } });
    testLead = await prisma.lead.create({
      data: {
        title: `Enterprise Cloud Project ${testRunId}`,
        stageId: stage.id,
        ownerId: rep1User.id,
        contactId: testContact.id,
        value: 15000,
      },
    });
  });

  after(async () => {
    if (testContact) {
      await prisma.activity.deleteMany({ where: { contactId: testContact.id } });
      await prisma.followUp.deleteMany({ where: { contactId: testContact.id } });
      await prisma.contact.deleteMany({ where: { id: testContact.id } });
    }
    if (testLead) {
      await prisma.activity.deleteMany({ where: { leadId: testLead.id } });
      await prisma.followUp.deleteMany({ where: { leadId: testLead.id } });
      await prisma.leadStageHistory.deleteMany({ where: { leadId: testLead.id } });
      await prisma.lead.deleteMany({ where: { id: testLead.id } });
    }
  });

  // ---------------------------------------------------------------------------
  // 1. ACTIVITIES CREATION & LINKING TESTS
  // ---------------------------------------------------------------------------
  it('Creating activity requires at least one of contactId, companyId, or leadId', async () => {
    const res = await request(app).post('/api/v1/activities').set('Cookie', rep1Cookie).send({
      type: 'CALL',
      subject: 'Call with nobody',
    });

    assert.strictEqual(res.status, 422);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('Creating activity auto-updates contact.lastContactedAt', async () => {
    const beforeContact = await prisma.contact.findUnique({ where: { id: testContact.id } });
    assert.strictEqual(beforeContact.lastContactedAt, null);

    const callTime = new Date();
    const res = await request(app).post('/api/v1/activities').set('Cookie', rep1Cookie).send({
      type: 'CALL',
      subject: 'Discovery Call with Diana',
      body: 'Discussed cloud migration strategy',
      contactId: testContact.id,
      durationMinutes: 25,
      occurredAt: callTime,
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.contactId, testContact.id);

    const afterContact = await prisma.contact.findUnique({ where: { id: testContact.id } });
    assert.ok(afterContact.lastContactedAt !== null);
  });

  it('SYSTEM activities cannot be edited or deleted', async () => {
    const sysActivity = await prisma.activity.create({
      data: {
        type: 'SYSTEM',
        subject: 'Audit System Log',
        body: 'Automated stage change',
        contactId: testContact.id,
        createdById: rep1User.id,
      },
    });

    // Attempt edit
    const editRes = await request(app)
      .patch(`/api/v1/activities/${sysActivity.id}`)
      .set('Cookie', rep1Cookie)
      .send({ subject: 'Attempted Modification' });

    assert.strictEqual(editRes.status, 400);
    assert.strictEqual(editRes.body.error.code, 'BAD_REQUEST');
    assert.ok(editRes.body.error.message.includes('SYSTEM activities cannot be edited'));

    // Attempt delete
    const deleteRes = await request(app)
      .delete(`/api/v1/activities/${sysActivity.id}`)
      .set('Cookie', rep1Cookie);

    assert.strictEqual(deleteRes.status, 400);
    assert.ok(deleteRes.body.error.message.includes('SYSTEM activities cannot be deleted'));

    // Cleanup
    await prisma.activity.delete({ where: { id: sysActivity.id } });
  });

  // ---------------------------------------------------------------------------
  // 2. TIMELINE MERGE TESTS
  // ---------------------------------------------------------------------------
  it('GET /activities/timeline returns merged chronological timeline', async () => {
    const res = await request(app)
      .get(`/api/v1/activities/timeline?contactId=${testContact.id}`)
      .set('Cookie', rep1Cookie);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);
    assert.strictEqual(res.body.data[0].timelineType, 'ACTIVITY');
  });

  // ---------------------------------------------------------------------------
  // 3. FOLLOW-UPS CREATION, SNOOZE, REASSIGN TESTS
  // ---------------------------------------------------------------------------
  it('Creates follow-up and fetches summary counts', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const res = await request(app).post('/api/v1/follow-ups').set('Cookie', rep1Cookie).send({
      title: 'Review cloud architecture proposal',
      dueAt: tomorrow,
      priority: 'HIGH',
      recurrence: 'WEEKLY',
      contactId: testContact.id,
      leadId: testLead.id,
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    testFollowUp = res.body.data;
    assert.strictEqual(testFollowUp.recurrence, 'WEEKLY');
    assert.strictEqual(testFollowUp.priority, 'HIGH');

    // Test GET /follow-ups/summary
    const summaryRes = await request(app)
      .get('/api/v1/follow-ups/summary')
      .set('Cookie', rep1Cookie);

    assert.strictEqual(summaryRes.status, 200);
    assert.strictEqual(typeof summaryRes.body.data.today, 'number');
    assert.strictEqual(typeof summaryRes.body.data.overdue, 'number');
    assert.strictEqual(typeof summaryRes.body.data.upcoming, 'number');
  });

  it('PATCH /follow-ups/:id/snooze updates dueAt with preset', async () => {
    const res = await request(app)
      .patch(`/api/v1/follow-ups/${testFollowUp.id}/snooze`)
      .set('Cookie', rep1Cookie)
      .send({ preset: 'tomorrow_9am' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.status, 'SNOOZED');
    assert.ok(res.body.data.snoozedUntil !== null);
  });

  it('PATCH /follow-ups/:id/reassign updates assigneeId', async () => {
    const res = await request(app)
      .patch(`/api/v1/follow-ups/${testFollowUp.id}/reassign`)
      .set('Cookie', rep1Cookie)
      .send({ assigneeId: rep2User.id });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.assigneeId, rep2User.id);
  });

  // ---------------------------------------------------------------------------
  // 4. COMPLETION, RECURRENCE & INLINE ACTIVITY LOGGING
  // ---------------------------------------------------------------------------
  it('Completing recurring follow-up marks done, spawns next occurrence, and optionally logs activity', async () => {
    const res = await request(app)
      .patch(`/api/v1/follow-ups/${testFollowUp.id}/complete`)
      .set('Cookie', rep2Cookie)
      .send({
        logActivity: true,
        note: 'Proposal reviewed and approved by engineering team',
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.followUp.status, 'DONE');

    // Verify next occurrence spawned because recurrence was WEEKLY
    assert.ok(res.body.data.nextOccurrence, 'Next occurrence should be created for recurring task');
    assert.strictEqual(res.body.data.nextOccurrence.status, 'PENDING');
    assert.strictEqual(res.body.data.nextOccurrence.recurrence, 'WEEKLY');

    // Verify activity was logged in one call
    assert.ok(res.body.data.activity, 'Activity should be logged');
    assert.ok(res.body.data.activity.body.includes('Proposal reviewed'));

    // Clean up spawned occurrence
    await prisma.followUp.delete({ where: { id: res.body.data.nextOccurrence.id } });
  });
});
