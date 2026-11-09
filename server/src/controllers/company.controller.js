import * as companyService from '../services/company.service.js';
import { successResponse } from '../utils/response.js';

export async function getCompanies(req, res) {
  const { companies, meta } = await companyService.getCompanies(req.query, req.user);
  return successResponse(res, companies, meta);
}

export async function getCompanyById(req, res) {
  const company = await companyService.getCompanyById(req.params.id, req.user);
  return successResponse(res, company);
}

export async function getCompanyOverview(req, res) {
  const overview = await companyService.getCompanyOverview(req.params.id, req.user);
  return successResponse(res, overview);
}

export async function createCompany(req, res) {
  const company = await companyService.createCompany(req.body, req.user);
  return successResponse(res, company, {}, 201);
}

export async function updateCompany(req, res) {
  const company = await companyService.updateCompany(req.params.id, req.body, req.user);
  return successResponse(res, company);
}

export async function deleteCompany(req, res) {
  const result = await companyService.deleteCompany(req.params.id, req.user);
  return successResponse(res, result);
}

export default {
  getCompanies,
  getCompanyById,
  getCompanyOverview,
  createCompany,
  updateCompany,
  deleteCompany,
};
