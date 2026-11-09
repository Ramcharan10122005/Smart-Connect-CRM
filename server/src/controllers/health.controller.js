import { successResponse } from '../utils/response.js';

export function getHealth(req, res) {
  return successResponse(res, {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}
