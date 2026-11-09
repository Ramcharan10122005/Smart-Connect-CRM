import { errorResponse } from '../utils/response.js';

export function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected error occurred';
  const code = err.code || 'INTERNAL_ERROR';
  const details = err.details || null;

  if (process.env.NODE_ENV !== 'production' && statusCode === 500) {
    console.error('Unhandled error:', err);
  }

  return errorResponse(res, message, code, details, statusCode);
}
