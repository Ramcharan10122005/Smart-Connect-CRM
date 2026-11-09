import * as activityService from '../services/activity.service.js';
import { successResponse } from '../utils/response.js';

export async function createActivity(req, res) {
  const activity = await activityService.createActivity(req.body, req.user);
  return successResponse(res, activity, {}, 201);
}

export async function getActivities(req, res) {
  const { activities, meta } = await activityService.getActivities(req.query);
  return successResponse(res, activities, meta);
}

export async function getTimeline(req, res) {
  const timeline = await activityService.getMergedTimeline(req.query);
  return successResponse(res, timeline);
}

export async function updateActivity(req, res) {
  const updated = await activityService.updateActivity(req.params.id, req.body, req.user);
  return successResponse(res, updated);
}

export async function deleteActivity(req, res) {
  const result = await activityService.deleteActivity(req.params.id, req.user);
  return successResponse(res, result);
}

export default {
  createActivity,
  getActivities,
  getTimeline,
  updateActivity,
  deleteActivity,
};
