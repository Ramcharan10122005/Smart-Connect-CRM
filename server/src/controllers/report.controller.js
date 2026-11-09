import * as reportService from '../services/report.service.js';
import { successResponse } from '../utils/response.js';
import { sendCSVResponse } from '../utils/csv.js';

export async function getSalesPerformance(req, res) {
  const data = await reportService.getSalesPerformance(req.query, req.user);
  if (req.query.format === 'csv') {
    return sendCSVResponse(
      res,
      'sales-performance.csv',
      reportService.salesPerformanceColumns,
      data.breakdown
    );
  }
  return successResponse(res, data);
}

export async function exportSalesPerformanceCsv(req, res) {
  const data = await reportService.getSalesPerformance(req.query, req.user);
  return sendCSVResponse(
    res,
    'sales-performance.csv',
    reportService.salesPerformanceColumns,
    data.breakdown
  );
}

export async function getLeadFunnel(req, res) {
  const data = await reportService.getLeadFunnel(req.query, req.user);
  if (req.query.format === 'csv') {
    return sendCSVResponse(res, 'lead-funnel.csv', reportService.leadFunnelColumns, data.funnel);
  }
  return successResponse(res, data);
}

export async function exportLeadFunnelCsv(req, res) {
  const data = await reportService.getLeadFunnel(req.query, req.user);
  return sendCSVResponse(res, 'lead-funnel.csv', reportService.leadFunnelColumns, data.funnel);
}

export async function getLeadSourcePerformance(req, res) {
  const data = await reportService.getLeadSourcePerformance(req.query, req.user);
  if (req.query.format === 'csv') {
    return sendCSVResponse(res, 'lead-sources.csv', reportService.leadSourceColumns, data.sources);
  }
  return successResponse(res, data);
}

export async function exportLeadSourcePerformanceCsv(req, res) {
  const data = await reportService.getLeadSourcePerformance(req.query, req.user);
  return sendCSVResponse(res, 'lead-sources.csv', reportService.leadSourceColumns, data.sources);
}

export async function getRepActivity(req, res) {
  const data = await reportService.getRepActivity(req.query, req.user);
  if (req.query.format === 'csv') {
    return sendCSVResponse(res, 'rep-activity.csv', reportService.repActivityColumns, data.reps);
  }
  return successResponse(res, data);
}

export async function exportRepActivityCsv(req, res) {
  const data = await reportService.getRepActivity(req.query, req.user);
  return sendCSVResponse(res, 'rep-activity.csv', reportService.repActivityColumns, data.reps);
}

export async function getCustomerGrowth(req, res) {
  const data = await reportService.getCustomerGrowth(req.query, req.user);
  if (req.query.format === 'csv') {
    return sendCSVResponse(
      res,
      'customer-growth.csv',
      reportService.customerGrowthColumns,
      data.growth
    );
  }
  return successResponse(res, data);
}

export async function exportCustomerGrowthCsv(req, res) {
  const data = await reportService.getCustomerGrowth(req.query, req.user);
  return sendCSVResponse(
    res,
    'customer-growth.csv',
    reportService.customerGrowthColumns,
    data.growth
  );
}

export default {
  getSalesPerformance,
  exportSalesPerformanceCsv,
  getLeadFunnel,
  exportLeadFunnelCsv,
  getLeadSourcePerformance,
  exportLeadSourcePerformanceCsv,
  getRepActivity,
  exportRepActivityCsv,
  getCustomerGrowth,
  exportCustomerGrowthCsv,
};
