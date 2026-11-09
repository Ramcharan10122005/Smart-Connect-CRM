import * as tagService from '../services/tag.service.js';
import { successResponse } from '../utils/response.js';

export async function getTags(req, res) {
  const tags = await tagService.getTags();
  return successResponse(res, tags);
}

export async function createTag(req, res) {
  const tag = await tagService.createTag(req.body);
  return successResponse(res, tag, {}, 201);
}

export async function updateTag(req, res) {
  const tag = await tagService.updateTag(req.params.id, req.body);
  return successResponse(res, tag);
}

export async function deleteTag(req, res) {
  await tagService.deleteTag(req.params.id);
  return successResponse(res, { message: 'Tag deleted successfully' });
}

export async function attachContactTag(req, res) {
  const contact = await tagService.attachTagToContact(req.params.id, req.body, req.user);
  return successResponse(res, contact);
}

export async function detachContactTag(req, res) {
  const result = await tagService.detachTagFromContact(req.params.id, req.params.tagId, req.user);
  return successResponse(res, result);
}

export async function attachCompanyTag(req, res) {
  const company = await tagService.attachTagToCompany(req.params.id, req.body, req.user);
  return successResponse(res, company);
}

export async function detachCompanyTag(req, res) {
  const result = await tagService.detachTagFromCompany(req.params.id, req.params.tagId, req.user);
  return successResponse(res, result);
}

export default {
  getTags,
  createTag,
  updateTag,
  deleteTag,
  attachContactTag,
  detachContactTag,
  attachCompanyTag,
  detachCompanyTag,
};
