import { describe, it } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';
import { parsePaginationParams, buildPaginationMeta } from '../src/utils/queryHelper.js';
import { ApiError } from '../src/utils/ApiError.js';

describe('Express Foundation & Architecture Verification', () => {
  it('GET /api/v1/health should return standardized 200 envelope', async () => {
    const res = await request(app).get('/api/v1/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.status, 'ok');
    assert.strictEqual(res.body.error, null);
    assert.deepStrictEqual(res.body.meta, {});
  });

  it('GET /api/v1/unknown-route should trigger 404 envelope', async () => {
    const res = await request(app).get('/api/v1/unknown-route');
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.data, null);
    assert.strictEqual(res.body.error.code, 'NOT_FOUND');
  });

  it('queryHelper: should correctly parse and clamp pagination params', () => {
    const parsed = parsePaginationParams({ page: '3', limit: '500', sort: 'name', order: 'asc' });
    assert.strictEqual(parsed.page, 3);
    assert.strictEqual(parsed.limit, 100); // clamped to max 100
    assert.strictEqual(parsed.skip, 200);
    assert.strictEqual(parsed.take, 100);
    assert.strictEqual(parsed.sort, 'name');
    assert.strictEqual(parsed.order, 'asc');
    assert.deepStrictEqual(parsed.orderBy, { name: 'asc' });

    const meta = buildPaginationMeta(145, 3, 50);
    assert.strictEqual(meta.page, 3);
    assert.strictEqual(meta.limit, 50);
    assert.strictEqual(meta.total, 145);
    assert.strictEqual(meta.totalPages, 3);
  });

  it('ApiError: should create instances with correct status codes and codes', () => {
    const badReq = ApiError.badRequest('Invalid ID');
    assert.strictEqual(badReq.statusCode, 400);
    assert.strictEqual(badReq.code, 'BAD_REQUEST');

    const unauth = ApiError.unauthorized();
    assert.strictEqual(unauth.statusCode, 401);

    const forbidden = ApiError.forbidden();
    assert.strictEqual(forbidden.statusCode, 403);

    const notFound = ApiError.notFound();
    assert.strictEqual(notFound.statusCode, 404);

    const conflict = ApiError.conflict();
    assert.strictEqual(conflict.statusCode, 409);

    const unprocessable = ApiError.unprocessable();
    assert.strictEqual(unprocessable.statusCode, 422);
  });
});
