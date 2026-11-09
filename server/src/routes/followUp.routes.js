import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import * as followUpController from '../controllers/followUp.controller.js';
import {
  createFollowUpSchema,
  completeFollowUpSchema,
  snoozeFollowUpSchema,
  reassignFollowUpSchema,
  getFollowUpsQuerySchema,
} from '../validators/followUp.validator.js';

const router = Router();

router.use(authenticate);

// Current user follow-up summary counts (today, overdue, upcoming)
router.get('/summary', asyncHandler(followUpController.getFollowUpSummary));

// List follow-ups with filters & views (today, upcoming, overdue, completed)
router.get(
  '/',
  validate({ query: getFollowUpsQuerySchema }),
  asyncHandler(followUpController.getFollowUps)
);

// Create follow-up
router.post(
  '/',
  validate({ body: createFollowUpSchema }),
  asyncHandler(followUpController.createFollowUp)
);

// Follow-up actions
router.patch(
  '/:id/complete',
  validate({ body: completeFollowUpSchema }),
  asyncHandler(followUpController.completeFollowUp)
);

router.patch(
  '/:id/snooze',
  validate({ body: snoozeFollowUpSchema }),
  asyncHandler(followUpController.snoozeFollowUp)
);

router.patch(
  '/:id/reassign',
  validate({ body: reassignFollowUpSchema }),
  asyncHandler(followUpController.reassignFollowUp)
);

export default router;
