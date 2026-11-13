import * as emailTemplateService from '../services/emailTemplate.service.js';
import { successResponse } from '../utils/response.js';

export async function createTemplate(req, res) {
  const template = await emailTemplateService.createTemplate(req.body, req.user);
  return successResponse(res, template, {}, 201);
}

export async function getTemplates(req, res) {
  const templates = await emailTemplateService.getTemplates();
  return successResponse(res, templates);
}

export async function getTemplateById(req, res) {
  const template = await emailTemplateService.getTemplateById(req.params.id);
  return successResponse(res, template);
}

export async function updateTemplate(req, res) {
  const updated = await emailTemplateService.updateTemplate(req.params.id, req.body, req.user);
  return successResponse(res, updated);
}

export async function deleteTemplate(req, res) {
  const result = await emailTemplateService.deleteTemplate(req.params.id, req.user);
  return successResponse(res, result);
}

export default {
  createTemplate,
  getTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
};

