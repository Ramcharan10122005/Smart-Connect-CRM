import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import * as automationController from '../controllers/automation.controller.js';
import {
  createAutomationRuleSchema,
  updateAutomationRuleSchema,
} from '../validators/automation.validator.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('ADMIN', 'MANAGER'));

router.get('/rules', asyncHandler(automationController.getRules));
router.get('/rules/:id', asyncHandler(automationController.getRuleById));

router.post(
  '/rules',
  validate({ body: createAutomationRuleSchema }),
  asyncHandler(automationController.createRule)
);

router.patch(
  '/rules/:id',
  validate({ body: updateAutomationRuleSchema }),
  asyncHandler(automationController.updateRule)
);

router.delete('/rules/:id', asyncHandler(automationController.deleteRule));

router.get('/logs', asyncHandler(automationController.getAutomationLogs));
router.post('/run-scheduled', asyncHandler(automationController.runScheduledNow));

export default router;

