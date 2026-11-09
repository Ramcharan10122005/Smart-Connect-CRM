/**
 * Standardized API Response Envelope
 * Format: { success, data, error, meta }
 */
export function successResponse(res, data = {}, meta = {}, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    error: null,
    meta,
  });
}

export function errorResponse(
  res,
  message = 'Internal Server Error',
  code = 'INTERNAL_ERROR',
  details = null,
  statusCode = 500
) {
  return res.status(statusCode).json({
    success: false,
    data: null,
    error: {
      message,
      code,
      details,
    },
    meta: {},
  });
}

export default {
  successResponse,
  errorResponse,
};
