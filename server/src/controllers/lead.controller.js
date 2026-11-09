import * as leadService from '../services/lead.service.js';
import { successResponse } from '../utils/response.js';
import { sendCSVResponse } from '../utils/csv.js';

export async function getLeads(req, res) {
  const { leads, meta } = await leadService.getLeads(req.query, req.user);
  return successResponse(res, leads, meta);
}

export async function getLeadBoard(req, res) {
  const board = await leadService.getLeadBoard(req.query, req.user);
  return successResponse(res, board);
}

export async function getLeadById(req, res) {
  const lead = await leadService.getLeadById(req.params.id, req.user);
  return successResponse(res, lead);
}

export async function createLead(req, res) {
  const lead = await leadService.createLead(req.body, req.user);
  return successResponse(res, lead, {}, 201);
}

export async function updateLead(req, res) {
  const lead = await leadService.updateLead(req.params.id, req.body, req.user);
  return successResponse(res, lead);
}

export async function deleteLead(req, res) {
  const result = await leadService.deleteLead(req.params.id, req.user);
  return successResponse(res, result);
}

export async function moveLeadStage(req, res) {
  const updatedLead = await leadService.moveLeadStage(req.params.id, req.body, req.user);
  return successResponse(res, updatedLead);
}

export async function convertLead(req, res) {
  const result = await leadService.convertLead(req.params.id, req.user);
  return successResponse(res, result);
}

export async function exportLeadsCsv(req, res) {
  const leads = await leadService.getLeadsForExport(req.query, req.user);
  return sendCSVResponse(res, 'leads-export.csv', leadService.leadExportColumns, leads);
}

export default {
  getLeads,
  getLeadBoard,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  moveLeadStage,
  convertLead,
  exportLeadsCsv,
};
