import * as authService from '../services/auth.service.js';
import { successResponse } from '../utils/response.js';
import env from '../config/env.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/',
};

export async function setup(req, res) {
  const { user, token } = await authService.setupFirstAdmin(req.body);
  res.cookie('token', token, COOKIE_OPTIONS);
  return successResponse(res, { user, token }, {}, 201);
}

export async function getSetupStatus(req, res) {
  const status = await authService.getSetupStatus();
  return successResponse(res, status);
}

export async function acceptInvite(req, res) {
  const { user, token } = await authService.acceptInvite(req.body);
  res.cookie('token', token, COOKIE_OPTIONS);
  return successResponse(res, { user, token });
}

export async function login(req, res) {
  const ipAddress = req.ip || req.connection?.remoteAddress;
  const userAgent = req.headers['user-agent'];
  const { user, token } = await authService.login({
    ...req.body,
    ipAddress,
    userAgent,
  });

  res.cookie('token', token, COOKIE_OPTIONS);
  return successResponse(res, { user, token });
}

export function logout(req, res) {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
  });
  return successResponse(res, { message: 'Logged out successfully' });
}

export function getMe(req, res) {
  return successResponse(res, req.user);
}

export async function forgotPassword(req, res) {
  const result = await authService.forgotPassword(req.body);
  return successResponse(res, result);
}

export async function resetPassword(req, res) {
  const result = await authService.resetPassword(req.body);
  return successResponse(res, result);
}

export async function changePassword(req, res) {
  const result = await authService.changePassword({
    userId: req.user.id,
    currentPassword: req.body.currentPassword,
    newPassword: req.body.newPassword,
  });
  return successResponse(res, result);
}

export default {
  setup,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
};
