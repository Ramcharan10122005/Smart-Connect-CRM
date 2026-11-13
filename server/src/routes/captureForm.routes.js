import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import * as captureFormController from '../controllers/captureForm.controller.js';

const router = Router();

router.use(authenticate);

// List capture forms (ADMIN only)
router.get('/', requireRole('ADMIN'), asyncHandler(captureFormController.getCaptureForms));

// Update capture form settings (ADMIN only)
router.patch('/:id', requireRole('ADMIN'), asyncHandler(captureFormController.updateCaptureForm));

export default router;

