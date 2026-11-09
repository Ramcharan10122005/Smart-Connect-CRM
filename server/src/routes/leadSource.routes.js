import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import * as sourceController from '../controllers/leadSource.controller.js';
import {
  createLeadSourceSchema,
  updateLeadSourceSchema,
} from '../validators/leadSource.validator.js';

const router = Router();

router.use(authenticate);

// Readable for all authenticated CRM users
router.get('/', asyncHandler(sourceController.getLeadSources));

// Admin management
router.post(
  '/',
  requireRole('ADMIN'),
  validate({ body: createLeadSourceSchema }),
  asyncHandler(sourceController.createLeadSource)
);

router.patch(
  '/:id',
  requireRole('ADMIN'),
  validate({ body: updateLeadSourceSchema }),
  asyncHandler(sourceController.updateLeadSource)
);

router.delete('/:id', requireRole('ADMIN'), asyncHandler(sourceController.deleteLeadSource));

export default router;
