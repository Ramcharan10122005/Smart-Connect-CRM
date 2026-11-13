import * as automationService from '../services/automation.service.js';
import { successResponse } from '../utils/response.js';

export async function getRules(req, res) {
  const rules = await automationService.getRules();
  return successResponse(res, rules);
}

export async function getRuleById(req, res) {
  const rule = await automationService.getRuleById(req.params.id);
  return successResponse(res, rule);
}

export async function createRule(req, res) {
  const rule = await automationService.createRule(req.body, req.user);
  return successResponse(res, rule, {}, 201);
}

export async function updateRule(req, res) {
  const updated = await automationService.updateRule(req.params.id, req.body, req.user);
  return successResponse(res, updated);
}

export async function deleteRule(req, res) {
  const result = await automationService.deleteRule(req.params.id, req.user);
  return successResponse(res, result);
}

export async function getAutomationLogs(req, res) {
  const { logs, meta } = await automationService.getAutomationLogs(req.query);
  return successResponse(res, logs, meta);
}

export async function runScheduledNow(req, res) {
  const result = await automationService.runScheduledAutomations();
  return successResponse(res, result);
}

export default {
  getRules,
  getRuleById,
  createRule,
  updateRule,
  deleteRule,
  getAutomationLogs,
  runScheduledNow,
};

