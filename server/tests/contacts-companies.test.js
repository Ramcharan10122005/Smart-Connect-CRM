import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';

describe('Companies & Contacts Modules Integration', () => {
  let adminCookie = '';
  let rep1Cookie = '';
  let rep2Cookie = '';
  let rep1User = null;
  let rep2User = null;

  let rep1Contact = null;
  let rep2Contact = null;
  let testCompany = null;
  let testTag = null;
  const testRunId = Date.now();

  before(async () => {
    // 1. Authenticate ADMIN
    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@smartconnect.com',
      password: 'Admin@123',
    });
    adminCookie = adminLogin.headers['set-cookie']
      .find((c) => c.startsWith('token='))
      .split(';')[0];

    // 2. Authenticate REP 1 (Alex Rivera)
    const rep1Login = await request(app).post('/api/v1/auth/login').send({
      email: 'alex.rep@smartconnect.com',
      password: 'Admin@123',
    });
    rep1Cookie = rep1Login.headers['set-cookie'].find((c) => c.startsWith('token=')).split(';')[0];
    rep1User = rep1Login.body.data.user;

    // 3. Authenticate REP 2 (Jordan Lee)
    const rep2Login = await request(app).post('/api/v1/auth/login').send({
      email: 'jordan.rep@smartconnect.com',
      password: 'Admin@123',
    });
    rep2Cookie = rep2Login.headers['set-cookie'].find((c) => c.startsWith('token=')).split(';')[0];
    rep2User = rep2Login.body.data.user;

    // 4. Create explicit test company owned by Rep 1
    testCompany = await prisma.company.create({
      data: {
        name: `Acme Test Corp ${testRunId}`,
        domain: `acme-test-${testRunId}.org`,
        industry: 'Fintech',
        ownerId: rep1User.id,
      },
    });

    // 5. Create explicit test tag
    testTag = await prisma.tag.upsert({
      where: { name: 'IntegrationTestTag' },
      update: {},
      create: { name: 'IntegrationTestTag', color: '#10B981' },
    });

    // 6. Create Contact owned by Rep 1
    rep1Contact = await prisma.contact.create({
      data: {
        firstName: 'Alice',
        lastName: 'RepOneClient',
        email: `alice.rep1.${testRunId}@acme-test.org`,
        ownerId: rep1User.id,
        companyId: testCompany.id,
        lifecycleStage: 'PROSPECT',
      },
    });

    // 7. Create Contact owned by Rep 2
    rep2Contact = await prisma.contact.create({
      data: {
        firstName: 'Bob',
        lastName: 'RepTwoClient',
        email: `bob.rep2.${testRunId}@acme-test.org`,
        ownerId: rep2User.id,
        lifecycleStage: 'CUSTOMER',
      },
    });
  });

  after(async () => {
    if (rep1Contact) {
      await prisma.contactTag.deleteMany({ where: { contactId: rep1Contact.id } });
      await prisma.activity.deleteMany({ where: { contactId: rep1Contact.id } });
      await prisma.contact.deleteMany({ where: { id: rep1Contact.id } });
    }
    if (rep2Contact) {
      await prisma.contact.deleteMany({ where: { id: rep2Contact.id } });
    }
    if (testCompany) {
      await prisma.company.deleteMany({ where: { id: testCompany.id } });
    }
  });

  // ---------------------------------------------------------------------------
  // 1. SCOPING & RBAC TESTS
  // ---------------------------------------------------------------------------
  it('Scoping: REP 1 cannot read REP 2 contact (returns 404 / access denied)', async () => {
    const res = await request(app)
      .get(`/api/v1/contacts/${rep2Contact.id}`)
      .set('Cookie', rep1Cookie);

    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'NOT_FOUND');
  });

  it('Scoping: REP 1 can read own contact', async () => {
    const res = await request(app)
      .get(`/api/v1/contacts/${rep1Contact.id}`)
      .set('Cookie', rep1Cookie);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.id, rep1Contact.id);
    assert.strictEqual(res.body.data.firstName, 'Alice');
  });

  it('Scoping: ADMIN has organization-wide visibility and can read contacts of any rep', async () => {
    const res1 = await request(app)
      .get(`/api/v1/contacts/${rep1Contact.id}`)
      .set('Cookie', adminCookie);
    assert.strictEqual(res1.status, 200);

    const res2 = await request(app)
      .get(`/api/v1/contacts/${rep2Contact.id}`)
      .set('Cookie', adminCookie);
    assert.strictEqual(res2.status, 200);
  });

  // ---------------------------------------------------------------------------
  // 2. DUPLICATE DETECTION TESTS
  // ---------------------------------------------------------------------------
  it('Duplicate Detection: creating a contact with existing email returns 409 Conflict with existingId', async () => {
    const res = await request(app).post('/api/v1/contacts').set('Cookie', adminCookie).send({
      firstName: 'Alice Duplicate',
      lastName: 'Client',
      email: rep1Contact.email,
    });

    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'CONFLICT');
    assert.strictEqual(res.body.error.details.existingId, rep1Contact.id);
  });

  it('Duplicate Detection: creating contact with force=true bypasses duplicate check', async () => {
    const res = await request(app)
      .post('/api/v1/contacts?force=true')
      .set('Cookie', adminCookie)
      .send({
        firstName: 'Alice Forced',
        lastName: 'Client',
        email: rep1Contact.email,
        force: true,
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.firstName, 'Alice Forced');

    // Clean up forced duplicate
    await prisma.contact.delete({ where: { id: res.body.data.id } });
  });

  // ---------------------------------------------------------------------------
  // 3. OVERVIEW ENDPOINTS TESTS
  // ---------------------------------------------------------------------------
  it('GET /contacts/:id/overview returns contact 360 profile with summary stats', async () => {
    // Log an activity for rep1Contact to ensure activity statistics populate
    await prisma.activity.create({
      data: {
        type: 'CALL',
        subject: 'Introductory Discovery Call',
        body: 'Discussed requirements',
        contactId: rep1Contact.id,
        createdById: rep1User.id,
        occurredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
    });

    const res = await request(app)
      .get(`/api/v1/contacts/${rep1Contact.id}/overview`)
      .set('Cookie', rep1Cookie);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    const data = res.body.data;
    assert.ok(data.contact);
    assert.ok(data.company);
    assert.ok(Array.isArray(data.timeline));
    assert.ok(data.summaryStats);
    assert.ok(data.summaryStats.totalInteractions >= 1);
    assert.strictEqual(data.summaryStats.daysSinceLastContact, 2);
  });

  it('GET /companies/:id/overview returns company 360 with linked contacts & leads', async () => {
    const res = await request(app)
      .get(`/api/v1/companies/${testCompany.id}/overview`)
      .set('Cookie', rep1Cookie);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.name, testCompany.name);
    assert.ok(Array.isArray(res.body.data.contacts));
    assert.ok(Array.isArray(res.body.data.leads));
    assert.ok(Array.isArray(res.body.data.activities));
  });

  // ---------------------------------------------------------------------------
  // 4. BULK OPERATIONS TESTS
  // ---------------------------------------------------------------------------
  it('POST /contacts/bulk executes bulk operations within user permission scope', async () => {
    const c1 = await prisma.contact.create({
      data: { firstName: 'Bulk1', lastName: 'Test', ownerId: rep1User.id },
    });
    const c2 = await prisma.contact.create({
      data: { firstName: 'Bulk2', lastName: 'Test', ownerId: rep1User.id },
    });

    // 1. Bulk add tag
    const tagRes = await request(app)
      .post('/api/v1/contacts/bulk')
      .set('Cookie', rep1Cookie)
      .send({
        action: 'add_tag',
        contactIds: [c1.id, c2.id],
        tagId: testTag.id,
      });
    assert.strictEqual(tagRes.status, 200);

    // 2. Bulk soft delete
    const deleteRes = await request(app)
      .post('/api/v1/contacts/bulk')
      .set('Cookie', rep1Cookie)
      .send({
        action: 'delete',
        contactIds: [c1.id, c2.id],
      });
    assert.strictEqual(deleteRes.status, 200);

    const checkC1 = await prisma.contact.findUnique({ where: { id: c1.id } });
    assert.ok(checkC1.deletedAt !== null, 'Contact 1 should be soft deleted');

    // Clean up
    await prisma.contactTag.deleteMany({ where: { contactId: { in: [c1.id, c2.id] } } });
    await prisma.contact.deleteMany({ where: { id: { in: [c1.id, c2.id] } } });
  });

  // ---------------------------------------------------------------------------
  // 5. TAG ATTACH / DETACH TESTS
  // ---------------------------------------------------------------------------
  it('Attach & detach tags on contact and company', async () => {
    const attachRes = await request(app)
      .post(`/api/v1/contacts/${rep1Contact.id}/tags`)
      .set('Cookie', rep1Cookie)
      .send({ tagId: testTag.id });
    assert.strictEqual(attachRes.status, 200);

    const detachRes = await request(app)
      .delete(`/api/v1/contacts/${rep1Contact.id}/tags/${testTag.id}`)
      .set('Cookie', rep1Cookie);
    assert.strictEqual(detachRes.status, 200);
  });
});
