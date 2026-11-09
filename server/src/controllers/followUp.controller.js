import * as followUpService from '../services/followUp.service.js';
import { successResponse } from '../utils/response.js';

export async function createFollowUp(req, res) {
  const followUp = await followUpService.createFollowUp(req.body, req.user);
  return successResponse(res, followUp, {}, 201);
}

export async function getFollowUps(req, res) {
  const { followUps, meta } = await followUpService.getFollowUps(req.query, req.user);
  return successResponse(res, followUps, meta);
}

export async function getFollowUpSummary(req, res) {
  const summary = await followUpService.getFollowUpSummary(req.user);
  return successResponse(res, summary);
}

export async function completeFollowUp(req, res) {
  const result = await followUpService.completeFollowUp(req.params.id, req.body, req.user);
  return successResponse(res, result);
}

export async function snoozeFollowUp(req, res) {
  const updated = await followUpService.snoozeFollowUp(req.params.id, req.body, req.user);
  return successResponse(res, updated);
}

export async function reassignFollowUp(req, res) {
  const updated = await followUpService.reassignFollowUp(req.params.id, req.body, req.user);
  return successResponse(res, updated);
}

export default {
  createFollowUp,
  getFollowUps,
  getFollowUpSummary,
  completeFollowUp,
  snoozeFollowUp,
  reassignFollowUp,
};
