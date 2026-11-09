import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as notificationController from '../controllers/notification.controller.js';
import {
  listNotificationsQuerySchema,
  notificationIdParamSchema,
} from '../validators/notification.validator.js';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

router.get(
  '/',
  validate({ query: listNotificationsQuerySchema }),
  asyncHandler(notificationController.getNotifications)
);
router.get('/unread-count', asyncHandler(notificationController.getUnreadCount));
router.patch('/read-all', asyncHandler(notificationController.markAllAsRead));
router.patch(
  '/:id/read',
  validate({ params: notificationIdParamSchema }),
  asyncHandler(notificationController.markAsRead)
);

export default router;
