import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import * as stageController from '../controllers/pipelineStage.controller.js';
import {
  createStageSchema,
  updateStageSchema,
  reorderStagesSchema,
  deleteStageQuerySchema,
} from '../validators/pipelineStage.validator.js';

const router = Router();

router.use(authenticate);

// Publicly readable for all CRM roles
router.get('/', asyncHandler(stageController.getPipelineStages));

// Admin-restricted configuration
router.post(
  '/',
  requireRole('ADMIN'),
  validate({ body: createStageSchema }),
  asyncHandler(stageController.createPipelineStage)
);

router.patch(
  '/reorder',
  requireRole('ADMIN'),
  validate({ body: reorderStagesSchema }),
  asyncHandler(stageController.reorderPipelineStages)
);

router.patch(
  '/:id',
  requireRole('ADMIN'),
  validate({ body: updateStageSchema }),
  asyncHandler(stageController.updatePipelineStage)
);

router.delete(
  '/:id',
  requireRole('ADMIN'),
  validate({ query: deleteStageQuerySchema }),
  asyncHandler(stageController.deletePipelineStage)
);

export default router;
