import * as notificationService from '../services/notification.service.js';
import { successResponse } from '../utils/response.js';

export async function getNotifications(req, res) {
  const { notifications, meta } = await notificationService.getNotifications(req.query, req.user);
  return successResponse(res, notifications, meta);
}

export async function getUnreadCount(req, res) {
  const result = await notificationService.getUnreadCount(req.user.id);
  return successResponse(res, result);
}

export async function markAsRead(req, res) {
  const notification = await notificationService.markAsRead(req.params.id, req.user.id);
  return successResponse(res, notification);
}

export async function markAllAsRead(req, res) {
  const result = await notificationService.markAllAsRead(req.user.id);
  return successResponse(res, result);
}

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
