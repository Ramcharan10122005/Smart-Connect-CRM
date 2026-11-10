import * as companyService from '../services/company.service.js';
import { successResponse } from '../utils/response.js';
import { sendCSVResponse } from '../utils/csv.js';

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

export async function bulkCompanyAction(req, res) {
  const result = await companyService.bulkCompanyAction(req.body, req.user);
  return successResponse(res, result);
}

export async function exportCompaniesCsv(req, res) {
  const companies = await companyService.getCompaniesForExport(req.query, req.user);
  return sendCSVResponse(res, 'companies-export.csv', companyService.companyExportColumns, companies);
}

export default {
  getCompanies,
  getCompanyById,
  getCompanyOverview,
  createCompany,
  updateCompany,
  deleteCompany,
  bulkCompanyAction,
  exportCompaniesCsv,
};
