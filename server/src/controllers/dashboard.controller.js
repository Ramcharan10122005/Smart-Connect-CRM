import * as dashboardService from '../services/dashboard.service.js';
import { successResponse } from '../utils/response.js';

export async function getSummary(req, res) {
  const summary = await dashboardService.getSummary(req.query, req.user);
  return successResponse(res, summary);
}

export async function getCharts(req, res) {
  const charts = await dashboardService.getCharts(req.query, req.user);
  return successResponse(res, charts);
}

export async function getLeaderboard(req, res) {
  const leaderboard = await dashboardService.getLeaderboard(req.user);
  return successResponse(res, leaderboard);
}

export async function getUpcoming(req, res) {
  const upcoming = await dashboardService.getUpcoming(req.query, req.user);
  return successResponse(res, upcoming);
}

export default {
  getSummary,
  getCharts,
  getLeaderboard,
  getUpcoming,
};
