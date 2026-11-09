import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import {
  remindUpcomingFollowUps,
  unsnoozeFollowUps,
  sendDailyDigests,
} from '../src/jobs/scheduler.js';

describe('Notifications & Background Scheduler Integration', () => {
  let adminCookie = '';
  let rep1Cookie = '';
  let rep2Cookie = '';
  let rep1User = null;
  let rep2User = null;
  let adminUser = null;

  const testRunId = Date.now();
  let createdNotificationIds = [];
  let createdFollowUpIds = [];
  let createdLeadIds = [];

  before(async () => {
    // 1. Authenticate Admin
    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@smartconnect.com',
      password: 'Admin@123',
    });
    adminCookie = adminLogin.headers['set-cookie']
      .find((c) => c.startsWith('token='))
      .split(';')[0];
    adminUser = adminLogin.body.data.user;

    // 2. Authenticate Rep 1 (Alex)
    const rep1Login = await request(app).post('/api/v1/auth/login').send({
      email: 'alex.rep@smartconnect.com',
      password: 'Admin@123',
    });
    rep1Cookie = rep1Login.headers['set-cookie'].find((c) => c.startsWith('token=')).split(';')[0];
    rep1User = rep1Login.body.data.user;

    // 3. Authenticate Rep 2 (Jordan)
    const rep2Login = await request(app).post('/api/v1/auth/login').send({
      email: 'jordan.rep@smartconnect.com',
      password: 'Admin@123',
    });
    rep2Cookie = rep2Login.headers['set-cookie'].find((c) => c.startsWith('token=')).split(';')[0];
    rep2User = rep2Login.body.data.user;

    // Clean up any lingering notifications for test users to start with predictable state
    await prisma.notification.deleteMany({
      where: { userId: { in: [rep1User.id, rep2User.id] } },
    });
  });

  after(async () => {
    if (createdNotificationIds.length > 0) {
      await prisma.notification.deleteMany({
        where: { id: { in: createdNotificationIds } },
      });
    }
    if (createdFollowUpIds.length > 0) {
      await prisma.followUp.deleteMany({
        where: { id: { in: createdFollowUpIds } },
      });
    }
    if (createdLeadIds.length > 0) {
      await prisma.lead.deleteMany({
        where: { id: { in: createdLeadIds } },
      });
    }
  });

  it('GET /api/v1/notifications lists user notifications with unread first', async () => {
    // Create one read and one unread notification for Rep 1
    const nRead = await prisma.notification.create({
      data: {
        userId: rep1User.id,
        type: 'SYSTEM',
        title: `Read Notification ${testRunId}`,
        body: 'Already read content',
        readAt: new Date(Date.now() - 3600 * 1000),
      },
    });
    const nUnread = await prisma.notification.create({
      data: {
        userId: rep1User.id,
        type: 'SYSTEM',
        title: `Unread Notification ${testRunId}`,
        body: 'Fresh content',
        readAt: null,
      },
    });
    createdNotificationIds.push(nRead.id, nUnread.id);

    const res = await request(app).get('/api/v1/notifications').set('Cookie', rep1Cookie);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.meta.total >= 2);

    // Verify ordering: unread items (readAt is null) come before read items
    const items = res.body.data;
    const unreadIdx = items.findIndex((item) => item.id === nUnread.id);
    const readIdx = items.findIndex((item) => item.id === nRead.id);
    assert.ok(unreadIdx !== -1 && readIdx !== -1);
    assert.ok(unreadIdx < readIdx, 'Unread notification should appear before read notification');
  });

  it('GET /api/v1/notifications/unread-count returns accurate unread count', async () => {
    const res = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Cookie', rep1Cookie);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(typeof res.body.data.count === 'number');
    assert.ok(res.body.data.count >= 1);
  });

  it('PATCH /api/v1/notifications/:id/read marks notification as read', async () => {
    const notif = await prisma.notification.create({
      data: {
        userId: rep1User.id,
        type: 'ALERT',
        title: `Mark me read ${testRunId}`,
        body: 'Body text',
      },
    });
    createdNotificationIds.push(notif.id);

    // Try reading with Rep 2 (should fail 404 because not owned by Rep 2)
    const forbiddenRes = await request(app)
      .patch(`/api/v1/notifications/${notif.id}/read`)
      .set('Cookie', rep2Cookie);
    assert.strictEqual(forbiddenRes.status, 404);

    // Read with Rep 1 (owner)
    const successRes = await request(app)
      .patch(`/api/v1/notifications/${notif.id}/read`)
      .set('Cookie', rep1Cookie);

    assert.strictEqual(successRes.status, 200);
    assert.strictEqual(successRes.body.success, true);
    assert.ok(successRes.body.data.readAt !== null);
  });

  it('PATCH /api/v1/notifications/read-all marks all unread notifications as read', async () => {
    // Create two unread notifications for Rep 1
    const n1 = await prisma.notification.create({
      data: { userId: rep1User.id, type: 'INFO', title: 'N1', body: 'B1' },
    });
    const n2 = await prisma.notification.create({
      data: { userId: rep1User.id, type: 'INFO', title: 'N2', body: 'B2' },
    });
    createdNotificationIds.push(n1.id, n2.id);

    const res = await request(app)
      .patch('/api/v1/notifications/read-all')
      .set('Cookie', rep1Cookie);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.count >= 2);

    // Check count is now 0
    const countRes = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Cookie', rep1Cookie);
    assert.strictEqual(countRes.body.data.count, 0);
  });

  it('Trigger: Creating lead assigned to another user notifies the owner', async () => {
    // Admin creates a lead assigned to Rep 2
    const stages = await prisma.pipelineStage.findMany({ take: 1 });
    const res = await request(app)
      .post('/api/v1/leads')
      .set('Cookie', adminCookie)
      .send({
        title: `Enterprise Opportunity ${testRunId}`,
        stageId: stages[0].id,
        ownerId: rep2User.id,
        value: 12500,
      });

    assert.strictEqual(res.status, 201);
    createdLeadIds.push(res.body.data.id);

    // Verify Rep 2 received notification
    const rep2Notifs = await prisma.notification.findMany({
      where: {
        userId: rep2User.id,
        type: 'LEAD_ASSIGNED',
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    assert.strictEqual(rep2Notifs.length, 1);
    assert.ok(rep2Notifs[0].body.includes(`Enterprise Opportunity ${testRunId}`));
    createdNotificationIds.push(rep2Notifs[0].id);
  });

  it('Trigger: Creating and reassigning follow-up notifies the assignee', async () => {
    // Admin creates follow-up assigned to Rep 1
    const createRes = await request(app)
      .post('/api/v1/follow-ups')
      .set('Cookie', adminCookie)
      .send({
        title: `Review quarterly proposal ${testRunId}`,
        dueAt: new Date(Date.now() + 86400000).toISOString(),
        assigneeId: rep1User.id,
      });

    assert.strictEqual(createRes.status, 201);
    const followUpId = createRes.body.data.id;
    createdFollowUpIds.push(followUpId);

    // Rep 1 should have received FOLLOW_UP_ASSIGNED notification
    const rep1Notifs = await prisma.notification.findMany({
      where: {
        userId: rep1User.id,
        type: 'FOLLOW_UP_ASSIGNED',
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    assert.strictEqual(rep1Notifs.length, 1);
    createdNotificationIds.push(rep1Notifs[0].id);

    // Admin reassigns follow-up from Rep 1 to Rep 2
    const reassignRes = await request(app)
      .patch(`/api/v1/follow-ups/${followUpId}/reassign`)
      .set('Cookie', adminCookie)
      .send({
        assigneeId: rep2User.id,
      });
    assert.strictEqual(reassignRes.status, 200);

    // Rep 2 should have received FOLLOW_UP_ASSIGNED notification
    const rep2Notifs = await prisma.notification.findMany({
      where: {
        userId: rep2User.id,
        type: 'FOLLOW_UP_ASSIGNED',
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    assert.strictEqual(rep2Notifs.length, 1);
    createdNotificationIds.push(rep2Notifs[0].id);
  });

  it('Scheduler Job: remindUpcomingFollowUps() notifies for due tasks and is idempotent', async () => {
    // Create follow-up due in 10 minutes (within 15 min window), status PENDING, remindedAt null
    const dueSoon = new Date(Date.now() + 10 * 60 * 1000);
    const fu = await prisma.followUp.create({
      data: {
        title: `Due very soon task ${testRunId}`,
        dueAt: dueSoon,
        status: 'PENDING',
        remindedAt: null,
        assigneeId: rep1User.id,
        createdById: adminUser.id,
      },
    });
    createdFollowUpIds.push(fu.id);

    // 1st run: Should detect and remind the task
    const result1 = await remindUpcomingFollowUps();
    assert.ok(result1.count >= 1);

    // Verify followUp updated with remindedAt
    const updatedFu = await prisma.followUp.findUnique({ where: { id: fu.id } });
    assert.ok(updatedFu.remindedAt !== null);

    // Verify in-app reminder notification was created for Rep 1
    const reminderNotif = await prisma.notification.findFirst({
      where: {
        userId: rep1User.id,
        type: 'FOLLOW_UP_REMINDER',
        title: { contains: `Due very soon task ${testRunId}` },
      },
    });
    assert.ok(reminderNotif !== null);
    createdNotificationIds.push(reminderNotif.id);

    // 2nd run: Idempotency check - followUp already has remindedAt set, so count should be 0
    const result2 = await remindUpcomingFollowUps();
    assert.strictEqual(result2.count, 0);
  });

  it('Scheduler Job: unsnoozeFollowUps() un-snoozes tasks whose snoozedUntil has elapsed', async () => {
    // Create a follow-up with status SNOOZED and snoozedUntil in the past (e.g. 5 minutes ago)
    const pastSnooze = new Date(Date.now() - 5 * 60 * 1000);
    const snoozedFu = await prisma.followUp.create({
      data: {
        title: `Past snoozed task ${testRunId}`,
        dueAt: pastSnooze,
        snoozedUntil: pastSnooze,
        status: 'SNOOZED',
        assigneeId: rep1User.id,
        createdById: adminUser.id,
      },
    });
    createdFollowUpIds.push(snoozedFu.id);

    const unsnoozeResult = await unsnoozeFollowUps();
    assert.ok(unsnoozeResult.count >= 1);

    // Verify record state in database
    const refreshed = await prisma.followUp.findUnique({ where: { id: snoozedFu.id } });
    assert.strictEqual(refreshed.status, 'PENDING');
    assert.strictEqual(refreshed.snoozedUntil, null);
  });

  it('Scheduler Job: sendDailyDigests() executes cleanly across active users', async () => {
    const digestResult = await sendDailyDigests();
    assert.ok(typeof digestResult.count === 'number');
    assert.ok(digestResult.count >= 1);
  });
});
