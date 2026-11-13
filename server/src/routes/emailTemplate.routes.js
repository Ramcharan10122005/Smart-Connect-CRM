import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import * as emailTemplateController from '../controllers/emailTemplate.controller.js';
import {
  createEmailTemplateSchema,
  updateEmailTemplateSchema,
} from '../validators/email.validator.js';

const router = Router();

router.use(authenticate);

// All authenticated users can read templates (to select in composer)
router.get('/', asyncHandler(emailTemplateController.getTemplates));
router.get('/:id', asyncHandler(emailTemplateController.getTemplateById));

// Only ADMIN and MANAGER can create, update, or delete templates
router.post(
  '/',
  requireRole('ADMIN', 'MANAGER'),
  validate({ body: createEmailTemplateSchema }),
  asyncHandler(emailTemplateController.createTemplate)
);

router.patch(
  '/:id',
  requireRole('ADMIN', 'MANAGER'),
  validate({ body: updateEmailTemplateSchema }),
  asyncHandler(emailTemplateController.updateTemplate)
);

router.delete(
  '/:id',
  requireRole('ADMIN', 'MANAGER'),
  asyncHandler(emailTemplateController.deleteTemplate)
);

export default router;

