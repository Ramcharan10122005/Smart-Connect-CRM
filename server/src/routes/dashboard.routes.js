import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as dashboardController from '../controllers/dashboard.controller.js';
import { dashboardQuerySchema } from '../validators/dashboard.validator.js';

const router = Router();

// All dashboard endpoints require authentication
router.use(authenticate);

router.get(
  '/summary',
  validate({ query: dashboardQuerySchema }),
  asyncHandler(dashboardController.getSummary)
);

router.get(
  '/charts',
  validate({ query: dashboardQuerySchema }),
  asyncHandler(dashboardController.getCharts)
);

router.get('/leaderboard', asyncHandler(dashboardController.getLeaderboard));

router.get(
  '/upcoming',
  validate({ query: dashboardQuerySchema }),
  asyncHandler(dashboardController.getUpcoming)
);

export default router;
