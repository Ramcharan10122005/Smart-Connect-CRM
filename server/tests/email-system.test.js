process.env.NODE_ENV = 'test';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { renderTemplateVariables } from '../src/utils/templateRenderer.js';
import { generateUnsubscribeToken, verifyUnsubscribeToken } from '../src/services/emailSend.service.js';

describe('Email System & Template Integration', () => {
  let adminToken;
  let repToken;
  let testContact;
  let testLead;
  let testTemplate;

  before(async () => {
    // 1. Log in as Admin
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@smartconnect.com', password: 'Admin@123' });
    adminToken = adminRes.body.data.token;

    // 2. Log in as Rep
    const repRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'alex.rep@smartconnect.com', password: 'Admin@123' });
    repToken = repRes.body.data.token;

    // 3. Create test contact for email tests
    testContact = await prisma.contact.create({
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        email: `jane.emailtest.${Date.now()}@example.com`,
        emailOptOut: false,
      },
    });

    // 4. Create test lead
    const stage = await prisma.pipelineStage.findFirst({ orderBy: { position: 'asc' } });
    testLead = await prisma.lead.create({
      data: {
        title: 'Email Lead Deal',
        contactId: testContact.id,
        stageId: stage.id,
      },
    });
  });

  after(async () => {
    if (testContact) {
      await prisma.emailLog.deleteMany({ where: { contactId: testContact.id } });
      await prisma.activity.deleteMany({ where: { contactId: testContact.id } });
      await prisma.lead.deleteMany({ where: { contactId: testContact.id } });
      await prisma.contact.deleteMany({ where: { id: testContact.id } });
    }
    if (testTemplate) {
      await prisma.emailTemplate.deleteMany({ where: { id: testTemplate.id } });
    }
  });

  // -------------------------------------------------------------
  // 1. UNIT TEST: TEMPLATE VARIABLE RENDERING
  // -------------------------------------------------------------
  it('renders variables {{firstName}}, {{companyName}}, {{ownerName}} correctly with whitespace & case-insensitivity', () => {
    const rawTemplate = 'Hello {{firstName}} from {{ companyName }}! My name is {{OWNERNAME}} and {{missingVar}} is blank.';
    const vars = {
      firstName: 'Jane',
      companyName: 'Acme Corp',
      ownerName: 'Alex Rivera',
    };

    const rendered = renderTemplateVariables(rawTemplate, vars);
    assert.equal(
      rendered,
      'Hello Jane from Acme Corp! My name is Alex Rivera and  is blank.'
    );
  });

  it('renders empty string for null, undefined, or missing values', () => {
    const raw = 'Dear {{firstName}}, at {{companyName}}.';
    const rendered = renderTemplateVariables(raw, {});
    assert.equal(rendered, 'Dear , at .');
  });

  // -------------------------------------------------------------
  // 2. TEMPLATE CRUD & RBAC
  // -------------------------------------------------------------
  it('allows ADMIN to create an email template', async () => {
    const res = await request(app)
      .post('/api/v1/email-templates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Test Template ${Date.now()}`,
        subject: 'Checking in with {{firstName}}',
        body: 'Hi {{firstName}},\n\nJust checking in on {{companyName}}.\n\nBest,\n{{ownerName}}',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    testTemplate = res.body.data;
  });

  it('prevents REP from creating an email template (RBAC 403)', async () => {
    const res = await request(app)
      .post('/api/v1/email-templates')
      .set('Authorization', `Bearer ${repToken}`)
      .send({
        name: `Rep Forbidden Template ${Date.now()}`,
        subject: 'Forbidden',
        body: 'Forbidden',
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  it('allows all authenticated users (including REP) to view templates', async () => {
    const res = await request(app)
      .get('/api/v1/email-templates')
      .set('Authorization', `Bearer ${repToken}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);
  });

  // -------------------------------------------------------------
  // 3. SEND EMAIL & ACTIVITY / LOGGING
  // -------------------------------------------------------------
  it('sends email to active contact, creates EmailLog, and logs EMAIL activity', async () => {
    const res = await request(app)
      .post('/api/v1/emails/send')
      .set('Authorization', `Bearer ${repToken}`)
      .send({
        to: testContact.email,
        subject: 'Proposal Review',
        body: 'Hi Jane, please find our proposal details attached.',
        contactId: testContact.id,
        leadId: testLead.id,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.emailLog);
    assert.equal(res.body.data.emailLog.to, testContact.email);
    assert.equal(res.body.data.emailLog.status, 'SENT');

    // Verify Email Activity was logged
    const activity = await prisma.activity.findFirst({
      where: { contactId: testContact.id, type: 'EMAIL' },
    });
    assert.ok(activity);
    assert.ok(activity.subject.includes('Proposal Review'));

    // Verify contact lastContactedAt was updated
    const updatedContact = await prisma.contact.findUnique({
      where: { id: testContact.id },
    });
    assert.ok(updatedContact.lastContactedAt);
  });

  // -------------------------------------------------------------
  // 4. OPT-OUT & UNSUBSCRIBE BLOCKING
  // -------------------------------------------------------------
  it('handles public unsubscribe via token and marks contact as emailOptOut: true', async () => {
    const token = generateUnsubscribeToken({ contactId: testContact.id, email: testContact.email });

    // Verify token unpacks correctly
    const payload = verifyUnsubscribeToken(token);
    assert.equal(payload.contactId, testContact.id);

    // Call public unsubscribe endpoint
    const res = await request(app)
      .get(`/unsubscribe/${token}`)
      .set('Accept', 'application/json');

    assert.equal(res.status, 200);

    // Check contact in DB
    const contact = await prisma.contact.findUnique({ where: { id: testContact.id } });
    assert.equal(contact.emailOptOut, true);
    assert.ok(contact.optOutAt);
  });

  it('blocks sending email to an opted-out contact with a clear 400 error', async () => {
    const res = await request(app)
      .post('/api/v1/emails/send')
      .set('Authorization', `Bearer ${repToken}`)
      .send({
        to: testContact.email,
        subject: 'Another message',
        body: 'Should be blocked',
        contactId: testContact.id,
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(
      res.body.error.message.toLowerCase().includes('opted out'),
      `Expected error message to mention opt out, got: ${res.body.error.message}`
    );
  });

  it('blocks sending email if recipient email matches an opted-out contact even without contactId', async () => {
    const res = await request(app)
      .post('/api/v1/emails/send')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        to: testContact.email,
        subject: 'Bypass attempt without contactId',
        body: 'Should still be blocked',
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(
      res.body.error.message.toLowerCase().includes('opted out'),
      `Expected error message to mention opt out, got: ${res.body.error.message}`
    );
  });
});
