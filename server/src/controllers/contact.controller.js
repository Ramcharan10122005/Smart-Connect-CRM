import * as contactService from '../services/contact.service.js';
import { successResponse } from '../utils/response.js';

export async function getContacts(req, res) {
  const { contacts, meta } = await contactService.getContacts(req.query, req.user);
  return successResponse(res, contacts, meta);
}

export async function getContactById(req, res) {
  const contact = await contactService.getContactById(req.params.id, req.user);
  return successResponse(res, contact);
}

export async function getContactOverview(req, res) {
  const overview = await contactService.getContactOverview(req.params.id, req.user);
  return successResponse(res, overview);
}

export async function createContact(req, res) {
  const force = req.query.force === 'true' || req.body.force === true;
  const contact = await contactService.createContact({ ...req.body, force }, req.user);
  return successResponse(res, contact, {}, 201);
}

export async function updateContact(req, res) {
  const contact = await contactService.updateContact(req.params.id, req.body, req.user);
  return successResponse(res, contact);
}

export async function deleteContact(req, res) {
  const result = await contactService.deleteContact(req.params.id, req.user);
  return successResponse(res, result);
}

export async function bulkContactAction(req, res) {
  const result = await contactService.bulkContactAction(req.body, req.user);
  return successResponse(res, result);
}

export default {
  getContacts,
  getContactById,
  getContactOverview,
  createContact,
  updateContact,
  deleteContact,
  bulkContactAction,
};
