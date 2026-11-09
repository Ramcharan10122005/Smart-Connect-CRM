import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';

describe('Analytics, Dashboard, Reports & Data-Exchange Integration', () => {
  let adminCookie = '';
  let rep1Cookie = '';
  let managerCookie = '';
  let rep1User = null;
  let adminUser = null;

  const testRunId = Date.now();
  let createdContactIds = [];
  let createdLeadIds = [];
  let createdCompanyIds = [];

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

    // 2. Authenticate Manager
    const managerLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'sarah.manager@smartconnect.com',
      password: 'Admin@123',
    });
    managerCookie = managerLogin.headers['set-cookie']
      .find((c) => c.startsWith('token='))
      .split(';')[0];

    // 3. Authenticate Rep 1
    const rep1Login = await request(app).post('/api/v1/auth/login').send({
      email: 'alex.rep@smartconnect.com',
      password: 'Admin@123',
    });
    rep1Cookie = rep1Login.headers['set-cookie'].find((c) => c.startsWith('token=')).split(';')[0];
    rep1User = rep1Login.body.data.user;

    // Create test customer contact for rep1
    const testCustomer = await prisma.contact.create({
      data: {
        firstName: 'Elena',
        lastName: `Rostova ${testRunId}`,
        email: `elena.${testRunId}@analytics-test.io`,
        lifecycleStage: 'CUSTOMER',
        ownerId: rep1User.id,
      },
    });
    createdContactIds.push(testCustomer.id);

    // Create test lead for rep1
    const stages = await prisma.pipelineStage.findMany({ take: 2 });
    const testLead = await prisma.lead.create({
      data: {
        title: `Enterprise Analytics Contract ${testRunId}`,
        stageId: stages[0].id,
        ownerId: rep1User.id,
        value: 45000,
        status: 'OPEN',
      },
    });
    createdLeadIds.push(testLead.id);
  });

  after(async () => {
    if (createdContactIds.length > 0) {
      await prisma.contact.deleteMany({
        where: { id: { in: createdContactIds } },
      });
    }
    if (createdLeadIds.length > 0) {
      await prisma.lead.deleteMany({
        where: { id: { in: createdLeadIds } },
      });
    }
    if (createdCompanyIds.length > 0) {
      await prisma.company.deleteMany({
        where: { id: { in: createdCompanyIds } },
      });
    }
  });

  // -----------------------------------------------------------
  // 1. Dashboard Endpoints
  // -----------------------------------------------------------

  it('GET /api/v1/dashboard/summary returns full KPI metrics envelope scoped by role', async () => {
    // Rep 1 summary
    const repRes = await request(app).get('/api/v1/dashboard/summary').set('Cookie', rep1Cookie);

    assert.strictEqual(repRes.status, 200);
    assert.strictEqual(repRes.body.success, true);
    const data = repRes.body.data;

    assert.ok(typeof data.totalCustomers === 'number');
    assert.ok(typeof data.newCustomersThisMonth === 'number');
    assert.ok(typeof data.customerGrowthRate === 'number');
    assert.ok(typeof data.openLeads === 'number');
    assert.ok(typeof data.weightedPipelineValue === 'number');
    assert.ok(typeof data.wonValueThisMonth === 'number');
    assert.ok(typeof data.leadWinRate === 'number');
    assert.ok(typeof data.overdueFollowUps === 'number');
    assert.ok(data.totalCustomers >= 1);

    // Admin summary (manager/admin with optional ownerId)
    const adminRes = await request(app)
      .get(`/api/v1/dashboard/summary?ownerId=${rep1User.id}`)
      .set('Cookie', adminCookie);

    assert.strictEqual(adminRes.status, 200);
    assert.strictEqual(adminRes.body.data.totalCustomers, data.totalCustomers);
  });

  it('GET /api/v1/dashboard/charts returns chart series for pipeline, sources, and velocity', async () => {
    const res = await request(app).get('/api/v1/dashboard/charts').set('Cookie', rep1Cookie);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    const data = res.body.data;

    assert.ok(Array.isArray(data.leadsByStage));
    assert.ok(Array.isArray(data.leadsBySource));
    assert.ok(Array.isArray(data.monthlyWonRevenue));
    assert.strictEqual(data.monthlyWonRevenue.length, 12);
    assert.ok(Array.isArray(data.newLeadsPerWeek));
    assert.strictEqual(data.newLeadsPerWeek.length, 12);
    assert.ok(Array.isArray(data.activitiesPerType));
  });

  it('GET /api/v1/dashboard/leaderboard enforces RBAC: Rep 403, Admin 200', async () => {
    // Rep is forbidden
    const repRes = await request(app)
      .get('/api/v1/dashboard/leaderboard')
      .set('Cookie', rep1Cookie);
    assert.strictEqual(repRes.status, 403);

    // Admin receives leaderboard sorted by wonValue
    const adminRes = await request(app)
      .get('/api/v1/dashboard/leaderboard')
      .set('Cookie', adminCookie);

    assert.strictEqual(adminRes.status, 200);
    assert.strictEqual(adminRes.body.success, true);
    assert.ok(Array.isArray(adminRes.body.data));
    assert.ok(adminRes.body.data.length > 0);
    const topRep = adminRes.body.data[0];
    assert.ok(topRep.user);
    assert.ok(typeof topRep.leadsWon === 'number');
    assert.ok(typeof topRep.wonValue === 'number');
    assert.ok(typeof topRep.activitiesLogged === 'number');
    assert.ok(typeof topRep.followUpsCompleted === 'number');
  });

  it('GET /api/v1/dashboard/upcoming returns upcoming tasks and recent activities', async () => {
    const res = await request(app).get('/api/v1/dashboard/upcoming').set('Cookie', rep1Cookie);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.upcomingFollowUps));
    assert.ok(Array.isArray(res.body.data.recentActivities));
    assert.ok(res.body.data.upcomingFollowUps.length <= 10);
    assert.ok(res.body.data.recentActivities.length <= 10);
  });

  // -----------------------------------------------------------
  // 2. Reports Endpoints (JSON and Streamed CSV)
  // -----------------------------------------------------------

  it('Reports: Sales performance (JSON & CSV export)', async () => {
    // JSON
    const jsonRes = await request(app)
      .get('/api/v1/reports/sales-performance')
      .set('Cookie', adminCookie);
    assert.strictEqual(jsonRes.status, 200);
    assert.ok(jsonRes.body.data.summary);
    assert.ok(typeof jsonRes.body.data.summary.leadsCreated === 'number');
    assert.ok(typeof jsonRes.body.data.summary.winRate === 'number');

    // CSV
    const csvRes = await request(app)
      .get('/api/v1/reports/sales-performance.csv')
      .set('Cookie', adminCookie);
    assert.strictEqual(csvRes.status, 200);
    assert.ok(csvRes.headers['content-type'].includes('text/csv'));
    assert.ok(csvRes.text.includes('Period,Leads Won,Won Revenue'));
  });

  it('Reports: Lead funnel (JSON & CSV export)', async () => {
    const jsonRes = await request(app)
      .get('/api/v1/reports/lead-funnel')
      .set('Cookie', adminCookie);
    assert.strictEqual(jsonRes.status, 200);
    assert.ok(Array.isArray(jsonRes.body.data.funnel));

    const csvRes = await request(app)
      .get('/api/v1/reports/lead-funnel.csv')
      .set('Cookie', adminCookie);
    assert.strictEqual(csvRes.status, 200);
    assert.ok(csvRes.headers['content-type'].includes('text/csv'));
    assert.ok(csvRes.text.includes('Stage,Type,Probability (%)'));
  });

  it('Reports: Lead sources performance (JSON & CSV export)', async () => {
    const jsonRes = await request(app)
      .get('/api/v1/reports/lead-sources')
      .set('Cookie', adminCookie);
    assert.strictEqual(jsonRes.status, 200);
    assert.ok(Array.isArray(jsonRes.body.data.sources));

    const csvRes = await request(app)
      .get('/api/v1/reports/lead-sources.csv')
      .set('Cookie', adminCookie);
    assert.strictEqual(csvRes.status, 200);
    assert.ok(csvRes.headers['content-type'].includes('text/csv'));
    assert.ok(csvRes.text.includes('Lead Source,Total Leads,Won Leads'));
  });

  it('Reports: Rep activity report (JSON & CSV export)', async () => {
    const jsonRes = await request(app)
      .get('/api/v1/reports/rep-activity')
      .set('Cookie', adminCookie);
    assert.strictEqual(jsonRes.status, 200);
    assert.ok(Array.isArray(jsonRes.body.data.reps));

    const csvRes = await request(app)
      .get('/api/v1/reports/rep-activity.csv')
      .set('Cookie', adminCookie);
    assert.strictEqual(csvRes.status, 200);
    assert.ok(csvRes.headers['content-type'].includes('text/csv'));
    assert.ok(csvRes.text.includes('Rep Name,Email,Role,Calls Logged'));
  });

  it('Reports: Customer growth (JSON & CSV export)', async () => {
    const jsonRes = await request(app)
      .get('/api/v1/reports/customer-growth')
      .set('Cookie', adminCookie);
    assert.strictEqual(jsonRes.status, 200);
    assert.ok(Array.isArray(jsonRes.body.data.growth));

    const csvRes = await request(app)
      .get('/api/v1/reports/customer-growth.csv')
      .set('Cookie', adminCookie);
    assert.strictEqual(csvRes.status, 200);
    assert.ok(csvRes.headers['content-type'].includes('text/csv'));
    assert.ok(csvRes.text.includes('Period,New Customers,Cumulative Customers'));
  });

  // -----------------------------------------------------------
  // 3. Contacts & Leads CSV Import & Export
  // -----------------------------------------------------------

  it('POST /api/v1/contacts/import/preview parses CSV, suggests mapping, and validates rows', async () => {
    const sampleCsv = `First Name,Last Name,Email,Phone,Company,City
Peter,Parker,spiderman.${testRunId}@marvel.com,+1-555-0101,Daily Bugle,New York
InvalidRow,,not-an-email,+1-555-0102,Stark Ind,Queens
,MissingFirst,valid.${testRunId}@stark.com,+1-555-0103,Stark Ind,NYC`;

    const res = await request(app)
      .post('/api/v1/contacts/import/preview')
      .set('Cookie', adminCookie)
      .attach('file', Buffer.from(sampleCsv, 'utf8'), 'test-contacts.csv');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    const data = res.body.data;

    assert.ok(data.detectedColumns.includes('First Name'));
    assert.ok(data.detectedColumns.includes('Email'));
    assert.strictEqual(data.mappingSuggestion['First Name'], 'firstName');
    assert.strictEqual(data.mappingSuggestion['Email'], 'email');
    assert.strictEqual(data.mappingSuggestion['Company'], 'companyName');
    assert.strictEqual(data.sampleRows.length, 3);
    assert.strictEqual(data.totalRows, 3);

    // Validation errors should flag row 2 (invalid email) and row 3 (missing first name)
    assert.ok(data.validationErrors.length >= 2);
    const emailErr = data.validationErrors.find((e) => e.field === 'email');
    const firstErr = data.validationErrors.find((e) => e.field === 'firstName');
    assert.ok(emailErr);
    assert.ok(firstErr);
  });

  it('POST /api/v1/contacts/import/commit commits valid contacts and skips duplicate emails', async () => {
    const email1 = `imported.one.${testRunId}@acme.com`;
    const email2 = `imported.two.${testRunId}@acme.com`;

    // Pre-create one contact to verify duplicate skipping
    const preExisting = await prisma.contact.create({
      data: {
        firstName: 'PreExisting',
        lastName: 'Contact',
        email: email1,
      },
    });
    createdContactIds.push(preExisting.id);

    const payload = {
      mapping: {
        'First Name': 'firstName',
        'Last Name': 'lastName',
        Email: 'email',
        Company: 'companyName',
      },
      rows: [
        {
          'First Name': 'NewUser',
          'Last Name': 'Success',
          Email: email2,
          Company: `ImportCo ${testRunId}`,
        },
        {
          'First Name': 'DuplicateUser',
          'Last Name': 'Skipped',
          Email: email1,
          Company: `ImportCo ${testRunId}`,
        },
        { 'First Name': '', 'Last Name': 'NoName', Email: `noname.${testRunId}@acme.com` },
      ],
    };

    const res = await request(app)
      .post('/api/v1/contacts/import/commit')
      .set('Cookie', adminCookie)
      .send(payload);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.created, 1);
    assert.strictEqual(res.body.data.skipped, 1);
    assert.strictEqual(res.body.data.failed, 1);

    // Find created contact to clean up
    const newlyCreated = await prisma.contact.findFirst({ where: { email: email2 } });
    assert.ok(newlyCreated);
    createdContactIds.push(newlyCreated.id);
    if (newlyCreated.companyId) createdCompanyIds.push(newlyCreated.companyId);
  });

  it('GET /api/v1/contacts/export.csv streams CSV filtered data', async () => {
    const res = await request(app).get('/api/v1/contacts/export.csv').set('Cookie', adminCookie);

    assert.strictEqual(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/csv'));
    assert.ok(res.text.includes('First Name,Last Name,Email,Phone,Job Title,Company'));
  });

  it('GET /api/v1/leads/export.csv streams CSV filtered leads', async () => {
    const res = await request(app).get('/api/v1/leads/export.csv').set('Cookie', adminCookie);

    assert.strictEqual(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/csv'));
    assert.ok(res.text.includes('Title,First Name,Last Name,Email,Phone,Company'));
  });

  // -----------------------------------------------------------
  // 4. Global Search
  // -----------------------------------------------------------

  it('GET /api/v1/search?q= returns top 5 scoped matches for contacts, companies, leads', async () => {
    // Search with query matching our test fixtures
    const res = await request(app)
      .get(`/api/v1/search?q=Enterprise Analytics Contract ${testRunId}`)
      .set('Cookie', adminCookie);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    const data = res.body.data;

    assert.ok(Array.isArray(data.contacts));
    assert.ok(Array.isArray(data.companies));
    assert.ok(Array.isArray(data.leads));
    assert.ok(data.leads.length >= 1);
    assert.strictEqual(data.leads[0].title, `Enterprise Analytics Contract ${testRunId}`);

    // Empty query returns empty arrays
    const emptyRes = await request(app).get('/api/v1/search?q=').set('Cookie', adminCookie);
    assert.strictEqual(emptyRes.status, 200);
    assert.deepStrictEqual(emptyRes.body.data, { contacts: [], companies: [], leads: [] });
  });
});
