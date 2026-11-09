import * as sourceService from '../services/leadSource.service.js';
import { successResponse } from '../utils/response.js';

export async function getLeadSources(req, res) {
  const sources = await sourceService.getLeadSources();
  return successResponse(res, sources);
}

export async function createLeadSource(req, res) {
  const source = await sourceService.createLeadSource(req.body, req.user);
  return successResponse(res, source, {}, 201);
}

export async function updateLeadSource(req, res) {
  const source = await sourceService.updateLeadSource(req.params.id, req.body, req.user);
  return successResponse(res, source);
}

export async function deleteLeadSource(req, res) {
  const result = await sourceService.deleteLeadSource(req.params.id, req.user);
  return successResponse(res, result);
}

export default {
  getLeadSources,
  createLeadSource,
  updateLeadSource,
  deleteLeadSource,
};
