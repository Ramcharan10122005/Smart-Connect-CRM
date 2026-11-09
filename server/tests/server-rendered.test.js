import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';

describe('Server-Rendered EJS Views Integration', () => {
  let adminCookie = '';
  let rep1Cookie = '';
  let rep2Cookie = '';
  let rep1User = null;
  let defaultForm = null;

  const testRunId = Date.now();
  let createdContactIds = [];
  let createdLeadIds = [];
  let createdNotificationIds = [];

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

    // 4. Fetch or ensure default capture form
    defaultForm = await prisma.captureForm.findFirst({
      where: { key: 'default-inbound-lead-form' },
    });

    if (!defaultForm) {
      defaultForm = await prisma.captureForm.create({
        data: {
          key: 'default-inbound-lead-form',
          name: 'Default Inbound Lead Capture',
          defaultOwnerId: rep1User.id,
          isActive: true,
        },
      });
    }
  });

  after(async () => {
    if (createdLeadIds.length > 0) {
      await prisma.activity.deleteMany({
        where: { leadId: { in: createdLeadIds } },
      });
      await prisma.lead.deleteMany({
        where: { id: { in: createdLeadIds } },
      });
    }
    if (createdContactIds.length > 0) {
      await prisma.contact.deleteMany({
        where: { id: { in: createdContactIds } },
      });
    }
    if (createdNotificationIds.length > 0) {
      await prisma.notification.deleteMany({
        where: { id: { in: createdNotificationIds } },
      });
    }
  });

  // -----------------------------------------------------------
  // 1. Public Lead-Capture Form
  // -----------------------------------------------------------

  it('GET /capture/:key renders responsive branded form and sets iframe headers & CSRF cookie', async () => {
    const res = await request(app).get(`/capture/${defaultForm.key}`);

    assert.strictEqual(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/html'));
    assert.strictEqual(res.headers['x-frame-options'], undefined);
    assert.ok(res.headers['content-security-policy']?.includes('frame-ancestors *'));

    // Verify HTML contains form fields and title
    assert.ok(res.text.includes(defaultForm.name));
    assert.ok(res.text.includes('name="name"'));
    assert.ok(res.text.includes('name="email"'));
    assert.ok(res.text.includes('name="website_hp"')); // Honeypot field
    assert.ok(res.text.includes('name="_csrf"'));

    // Check CSRF cookie is set
    const cookies = res.headers['set-cookie'] || [];
    assert.ok(cookies.some((c) => c.startsWith('_csrf=')));
  });

  it('GET /capture/:key with embed=true suppresses outer header navigation', async () => {
    const res = await request(app).get(`/capture/${defaultForm.key}?embed=true`);
    assert.strictEqual(res.status, 200);
    assert.ok(!res.text.includes('<header class="site-header">'));
  });

  it('GET /capture/:key returns 404 EJS page for non-existent form', async () => {
    const res = await request(app).get('/capture/non-existent-form-key');
    assert.strictEqual(res.status, 404);
    assert.ok(res.text.includes('404'));
    assert.ok(res.text.includes('Page Not Found'));
  });

  it('POST /capture/:key creates Lead, NOTE activity, and notifies owner', async () => {
    // 1. Initial GET to obtain fresh CSRF token
    const getRes = await request(app).get(`/capture/${defaultForm.key}`);
    const csrfCookie = getRes.headers['set-cookie'].find((c) => c.startsWith('_csrf='));
    const csrfMatch = getRes.text.match(/name="_csrf" value="([^"]+)"/);
    assert.ok(csrfMatch, 'CSRF token input must exist in form');
    const csrfToken = csrfMatch[1];

    const leadEmail = `lead.${testRunId}@prospective-client.com`;

    // 2. Submit form
    const postRes = await request(app)
      .post(`/capture/${defaultForm.key}`)
      .set('Cookie', csrfCookie)
      .send({
        _csrf: csrfToken,
        website_hp: '', // empty honeypot
        name: `Bruce Wayne ${testRunId}`,
        email: leadEmail,
        phone: '+1 555-0199',
        company: `Wayne Enterprises ${testRunId}`,
        message: 'Looking for a complete enterprise CRM rollout by Q4.',
      });

    assert.strictEqual(postRes.status, 200);
    assert.ok(postRes.text.includes('Thank You!'));

    // 3. Verify lead was created in database
    const createdLead = await prisma.lead.findFirst({
      where: { email: leadEmail },
      include: { owner: true, company: true },
    });

    assert.ok(createdLead, 'Lead must be created in database');
    assert.strictEqual(createdLead.firstName, 'Bruce');
    assert.strictEqual(createdLead.lastName, `Wayne ${testRunId}`);
    assert.strictEqual(createdLead.companyName, `Wayne Enterprises ${testRunId}`);
    createdLeadIds.push(createdLead.id);

    // 4. Verify NOTE activity was created with the message
    const noteActivity = await prisma.activity.findFirst({
      where: {
        leadId: createdLead.id,
        type: 'NOTE',
      },
    });
    assert.ok(noteActivity, 'NOTE activity must be created for the inquiry');
    assert.ok(noteActivity.body.includes('Looking for a complete enterprise CRM rollout by Q4.'));

    // 5. Verify notification was dispatched to the default owner
    if (createdLead.ownerId) {
      const notif = await prisma.notification.findFirst({
        where: {
          userId: createdLead.ownerId,
          type: 'LEAD_CAPTURED',
        },
        orderBy: { createdAt: 'desc' },
      });
      assert.ok(notif, 'Notification must be created for default owner');
      createdNotificationIds.push(notif.id);
    }
  });

  it('POST /capture/:key traps honeypot bots silently without creating database records', async () => {
    const getRes = await request(app).get(`/capture/${defaultForm.key}`);
    const csrfCookie = getRes.headers['set-cookie'].find((c) => c.startsWith('_csrf='));
    const csrfMatch = getRes.text.match(/name="_csrf" value="([^"]+)"/);
    const csrfToken = csrfMatch[1];

    const botEmail = `spambot.${testRunId}@malicious-domain.xyz`;

    const postRes = await request(app)
      .post(`/capture/${defaultForm.key}`)
      .set('Cookie', csrfCookie)
      .send({
        _csrf: csrfToken,
        website_hp: 'http://spam-link.biz', // BOT FILLED HONEYPOT!
        name: 'Spam Bot',
        email: botEmail,
        message: 'Buy cheap watches now!',
      });

    // Returns thank-you without creating record
    assert.strictEqual(postRes.status, 200);
    assert.ok(postRes.text.includes('Thank You!'));

    const botLead = await prisma.lead.findFirst({
      where: { email: botEmail },
    });
    assert.strictEqual(botLead, null, 'Honeypot bot submission must NOT create a lead');
  });

  it('POST /capture/:key rejects invalid CSRF tokens with 403', async () => {
    const postRes = await request(app).post(`/capture/${defaultForm.key}`).send({
      _csrf: 'tampered-or-missing-csrf-token',
      name: 'Legit User',
      email: 'legit@example.com',
    });

    assert.strictEqual(postRes.status, 403);
    assert.ok(postRes.text.includes('Form session expired or invalid'));
  });

  it('POST /capture/:key validates inputs and re-renders form with 422 on validation error', async () => {
    const getRes = await request(app).get(`/capture/${defaultForm.key}`);
    const csrfCookie = getRes.headers['set-cookie'].find((c) => c.startsWith('_csrf='));
    const csrfMatch = getRes.text.match(/name="_csrf" value="([^"]+)"/);
    const csrfToken = csrfMatch[1];

    const postRes = await request(app)
      .post(`/capture/${defaultForm.key}`)
      .set('Cookie', csrfCookie)
      .send({
        _csrf: csrfToken,
        website_hp: '',
        name: '', // missing name!
        email: 'invalid-email-format', // invalid email!
      });

    assert.strictEqual(postRes.status, 422);
    assert.ok(postRes.text.includes('Full name is required'));
    assert.ok(postRes.text.includes('A valid email address is required'));
  });

  // -----------------------------------------------------------
  // 2. Printable Customer Report
  // -----------------------------------------------------------

  it('GET /print/contact/:id renders print-optimized page with contact, company, leads, and tasks', async () => {
    // Create test contact for Rep 1 with company, open lead, activity, and follow-up
    const testCo = await prisma.company.create({
      data: {
        name: `Stark Industries ${testRunId}`,
        ownerId: rep1User.id,
      },
    });

    const testContact = await prisma.contact.create({
      data: {
        firstName: 'Anthony',
        lastName: `Stark ${testRunId}`,
        email: `tony.${testRunId}@stark.com`,
        jobTitle: 'Chief Executive Officer',
        companyId: testCo.id,
        ownerId: rep1User.id,
        lifecycleStage: 'CUSTOMER',
      },
    });
    createdContactIds.push(testContact.id);

    const stages = await prisma.pipelineStage.findMany({ take: 1 });
    const testLead = await prisma.lead.create({
      data: {
        title: `Clean Energy Arc Contract ${testRunId}`,
        stageId: stages[0].id,
        contactId: testContact.id,
        ownerId: rep1User.id,
        value: 120000,
        status: 'OPEN',
      },
    });
    createdLeadIds.push(testLead.id);

    const testAct = await prisma.activity.create({
      data: {
        type: 'MEETING',
        subject: `Quarterly Review Meeting ${testRunId}`,
        contactId: testContact.id,
        createdById: rep1User.id,
      },
    });

    const testFu = await prisma.followUp.create({
      data: {
        title: `Follow up on NDA ${testRunId}`,
        dueAt: new Date(Date.now() + 86400000),
        contactId: testContact.id,
        assigneeId: rep1User.id,
      },
    });

    // 1. Rep 1 (owner) can view print page
    const repRes = await request(app)
      .get(`/print/contact/${testContact.id}`)
      .set('Cookie', rep1Cookie);

    assert.strictEqual(repRes.status, 200);
    assert.ok(repRes.headers['content-type'].includes('text/html'));
    assert.ok(repRes.text.includes('Anthony'));
    assert.ok(repRes.text.includes(`Stark Industries ${testRunId}`));
    assert.ok(repRes.text.includes(`Clean Energy Arc Contract ${testRunId}`));
    assert.ok(repRes.text.includes(`Quarterly Review Meeting ${testRunId}`));
    assert.ok(repRes.text.includes(`Follow up on NDA ${testRunId}`));
    assert.ok(repRes.text.includes('window.print()'));

    // 2. Admin has org-wide access and can view any contact's print page
    const adminRes = await request(app)
      .get(`/print/contact/${testContact.id}`)
      .set('Cookie', adminCookie);
    assert.strictEqual(adminRes.status, 200);

    // 3. Rep 2 is restricted by role scoping (contact belongs to Rep 1) -> 404
    const rep2Res = await request(app)
      .get(`/print/contact/${testContact.id}`)
      .set('Cookie', rep2Cookie);
    assert.strictEqual(rep2Res.status, 404);
    assert.ok(rep2Res.text.includes('Contact Not Found'));
  });

  // -----------------------------------------------------------
  // 3. Non-API Error Pages
  // -----------------------------------------------------------

  it('Non-API route 404 renders branded EJS error page instead of JSON', async () => {
    const res = await request(app).get('/some-random-unknown-public-page');

    assert.strictEqual(res.status, 404);
    assert.ok(res.headers['content-type'].includes('text/html'));
    assert.ok(res.text.includes('Page Not Found'));
    assert.ok(res.text.includes('Return to Homepage'));
  });
});
