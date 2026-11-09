import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import * as activityController from '../controllers/activity.controller.js';
import {
  createActivitySchema,
  updateActivitySchema,
  getActivitiesQuerySchema,
  getTimelineQuerySchema,
} from '../validators/activity.validator.js';

const router = Router();

router.use(authenticate);

// List activities with filters
router.get(
  '/',
  validate({ query: getActivitiesQuerySchema }),
  asyncHandler(activityController.getActivities)
);

// Merged chronological timeline (activities + stage changes + completed follow-ups)
router.get(
  '/timeline',
  validate({ query: getTimelineQuerySchema }),
  asyncHandler(activityController.getTimeline)
);

// Single activity lifecycle
router.post(
  '/',
  validate({ body: createActivitySchema }),
  asyncHandler(activityController.createActivity)
);
router.patch(
  '/:id',
  validate({ body: updateActivitySchema }),
  asyncHandler(activityController.updateActivity)
);
router.delete('/:id', asyncHandler(activityController.deleteActivity));

export default router;
