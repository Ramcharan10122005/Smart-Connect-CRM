import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import * as userController from '../controllers/user.controller.js';
import {
  inviteUserSchema,
  updateUserSchema,
  updateMeSchema,
  getUsersQuerySchema,
} from '../validators/user.validator.js';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// Update own profile and notification preferences (any authenticated user)
router.patch('/me', validate({ body: updateMeSchema }), asyncHandler(userController.updateMe));

// List users (ADMIN and MANAGER only)
router.get(
  '/',
  requireRole('ADMIN', 'MANAGER'),
  validate({ query: getUsersQuerySchema }),
  asyncHandler(userController.getUsers)
);

// Invite user (ADMIN only)
router.post(
  '/',
  requireRole('ADMIN'),
  validate({ body: inviteUserSchema }),
  asyncHandler(userController.inviteUser)
);

// Update user role, status, or details (ADMIN only)
router.patch(
  '/:id',
  requireRole('ADMIN'),
  validate({ body: updateUserSchema }),
  asyncHandler(userController.updateUser)
);

export default router;
