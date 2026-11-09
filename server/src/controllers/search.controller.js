import * as searchService from '../services/search.service.js';
import { successResponse } from '../utils/response.js';

export async function search(req, res) {
  const results = await searchService.searchGlobal(req.query.q, req.user);
  return successResponse(res, results);
}

export default {
  search,
};
