import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import * as authController from '../controllers/auth.controller.js';
import {
  setupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  acceptInviteSchema,
} from '../validators/auth.validator.js';

const router = Router();

// Public first-run setup & status
router.get('/setup-status', asyncHandler(authController.getSetupStatus));
router.post('/setup', validate({ body: setupSchema }), asyncHandler(authController.setup));
router.post(
  '/accept-invite',
  validate({ body: acceptInviteSchema }),
  asyncHandler(authController.acceptInvite)
);

// Authentication session management (rate-limited)
router.post(
  '/login',
  authLimiter,
  validate({ body: loginSchema }),
  asyncHandler(authController.login)
);
router.post('/logout', asyncHandler(authController.logout));

// Current authenticated user profile
router.get('/me', authenticate, authController.getMe);

// Password recovery & management
router.post(
  '/forgot-password',
  authLimiter,
  validate({ body: forgotPasswordSchema }),
  asyncHandler(authController.forgotPassword)
);
router.post(
  '/reset-password',
  validate({ body: resetPasswordSchema }),
  asyncHandler(authController.resetPassword)
);
router.post(
  '/change-password',
  authenticate,
  validate({ body: changePasswordSchema }),
  asyncHandler(authController.changePassword)
);

export default router;
