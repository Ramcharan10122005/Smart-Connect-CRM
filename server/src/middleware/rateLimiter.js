import rateLimit from 'express-rate-limit';
import env from '../config/env.js';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'test' ? 1000 : 15, // 15 attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    error: {
      message: 'Too many authentication attempts. Please try again after 15 minutes.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      details: null,
    },
    meta: {},
  },
});

export const emailSendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: env.NODE_ENV === 'test' ? 1000 : 50, // 50 emails per hour
  keyGenerator: (req) => req.user?.id || req.ip,
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    error: {
      message: 'Email sending rate limit exceeded. You can send up to 50 emails per hour.',
      code: 'EMAIL_RATE_LIMIT_EXCEEDED',
      details: null,
    },
    meta: {},
  },
});

export default {
  authLimiter,
  emailSendLimiter,
};
