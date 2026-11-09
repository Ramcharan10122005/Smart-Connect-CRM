import { describe, it } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';

describe('Authentication & Role-Based Access Control', () => {
  let adminCookie = '';
  let repCookie = '';
  let managerCookie = '';
  let adminUserId = '';

  it('POST /api/v1/auth/setup should fail when users already exist in the database', async () => {
    const res = await request(app).post('/api/v1/auth/setup').send({
      name: 'Second Admin',
      email: 'secondadmin@smartconnect.com',
      password: 'StrongPass123',
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'BAD_REQUEST');
  });

  it('POST /api/v1/auth/login should fail with 401 when given wrong password', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@smartconnect.com',
      password: 'WrongPassword123',
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
  });

  it('POST /api/v1/auth/login should succeed with valid credentials and return httpOnly cookie', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@smartconnect.com',
      password: 'Admin@123',
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.user.email, 'admin@smartconnect.com');
    assert.strictEqual(res.body.data.user.role, 'ADMIN');

    // Extract httpOnly cookie
    const cookies = res.headers['set-cookie'];
    assert.ok(cookies, 'set-cookie header should be present');
    const tokenCookie = cookies.find((c) => c.startsWith('token='));
    assert.ok(tokenCookie, 'token cookie should be set');
    assert.ok(tokenCookie.includes('HttpOnly'), 'cookie should have HttpOnly attribute');

    adminCookie = tokenCookie.split(';')[0];
    adminUserId = res.body.data.user.id;
  });

  it('GET /api/v1/auth/me should return 401 without cookie', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
  });

  it('GET /api/v1/auth/me should return 200 with current user profile when authenticated', async () => {
    const res = await request(app).get('/api/v1/auth/me').set('Cookie', adminCookie);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.email, 'admin@smartconnect.com');
    assert.strictEqual(res.body.data.role, 'ADMIN');
  });

  it('Role restriction: REP cannot view users list or invite users (403 Forbidden)', async () => {
    // Login as REP
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'alex.rep@smartconnect.com',
      password: 'Admin@123',
    });
    assert.strictEqual(loginRes.status, 200);
    const cookies = loginRes.headers['set-cookie'];
    repCookie = cookies.find((c) => c.startsWith('token=')).split(';')[0];

    // REP attempts GET /api/v1/users -> 403 Forbidden
    const getRes = await request(app).get('/api/v1/users').set('Cookie', repCookie);
    assert.strictEqual(getRes.status, 403);
    assert.strictEqual(getRes.body.error.code, 'FORBIDDEN');

    // REP attempts POST /api/v1/users -> 403 Forbidden
    const postRes = await request(app).post('/api/v1/users').set('Cookie', repCookie).send({
      name: 'Unauthorized User',
      email: 'unauth@smartconnect.com',
      role: 'REP',
    });
    assert.strictEqual(postRes.status, 403);
  });

  it('Role restriction: MANAGER can list users but cannot invite users', async () => {
    // Login as MANAGER
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'sarah.manager@smartconnect.com',
      password: 'Admin@123',
    });
    assert.strictEqual(loginRes.status, 200);
    const cookies = loginRes.headers['set-cookie'];
    managerCookie = cookies.find((c) => c.startsWith('token=')).split(';')[0];

    // MANAGER can GET /api/v1/users -> 200 OK
    const getRes = await request(app).get('/api/v1/users').set('Cookie', managerCookie);
    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getRes.body.success, true);
    assert.ok(Array.isArray(getRes.body.data));

    // MANAGER cannot POST /api/v1/users -> 403 Forbidden
    const postRes = await request(app).post('/api/v1/users').set('Cookie', managerCookie).send({
      name: 'Manager Invite',
      email: 'manager.invite@smartconnect.com',
      role: 'REP',
    });
    assert.strictEqual(postRes.status, 403);
  });

  it('ADMIN can invite a new user via POST /api/v1/users', async () => {
    const inviteEmail = `invited.${Date.now()}@smartconnect.com`;
    const res = await request(app).post('/api/v1/users').set('Cookie', adminCookie).send({
      name: 'New Sales Rep',
      email: inviteEmail,
      role: 'REP',
      phone: '+1 555-9999',
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.email, inviteEmail);
    assert.strictEqual(res.body.data.role, 'REP');
  });

  it('Self-protection: ADMIN cannot deactivate or demote themselves', async () => {
    // Attempt self-deactivation
    const deactRes = await request(app)
      .patch(`/api/v1/users/${adminUserId}`)
      .set('Cookie', adminCookie)
      .send({ isActive: false });

    assert.strictEqual(deactRes.status, 400);
    assert.strictEqual(deactRes.body.error.code, 'BAD_REQUEST');

    // Attempt self-demotion
    const demoteRes = await request(app)
      .patch(`/api/v1/users/${adminUserId}`)
      .set('Cookie', adminCookie)
      .send({ role: 'REP' });

    assert.strictEqual(demoteRes.status, 400);
    assert.strictEqual(demoteRes.body.error.code, 'BAD_REQUEST');
  });

  it('PATCH /api/v1/users/me allows logged-in user to update own profile', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Cookie', repCookie)
      .send({
        name: 'Alex Rivera Updated',
        phone: '+1 555-8888',
        notificationPreferences: { email: true, inApp: false },
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.name, 'Alex Rivera Updated');
    assert.strictEqual(res.body.data.phone, '+1 555-8888');
    assert.deepStrictEqual(res.body.data.notificationPreferences, { email: true, inApp: false });
  });

  it('POST /api/v1/auth/forgot-password returns consistent response', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'alex.rep@smartconnect.com' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.message.includes('password reset instructions'));
  });

  it('POST /api/v1/auth/logout should clear the token cookie', async () => {
    const res = await request(app).post('/api/v1/auth/logout').set('Cookie', adminCookie);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);

    const cookies = res.headers['set-cookie'];
    assert.ok(cookies);
    const tokenCookie = cookies.find((c) => c.startsWith('token='));
    assert.ok(tokenCookie.includes('token=;') || tokenCookie.includes('Max-Age=0'));
  });
});
