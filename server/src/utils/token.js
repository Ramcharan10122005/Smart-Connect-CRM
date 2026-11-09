import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import env from '../config/env.js';

export function generateJwt(payload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

export function verifyJwt(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

export function generateRandomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export default {
  generateJwt,
  verifyJwt,
  generateRandomToken,
  hashToken,
};
