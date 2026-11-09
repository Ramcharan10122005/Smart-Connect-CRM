export class ApiError extends Error {
  constructor(statusCode, message, code = 'ERROR', details = null, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad Request', details = null) {
    return new ApiError(400, message, 'BAD_REQUEST', details);
  }

  static unauthorized(message = 'Unauthorized', details = null) {
    return new ApiError(401, message, 'UNAUTHORIZED', details);
  }

  static forbidden(message = 'Forbidden', details = null) {
    return new ApiError(403, message, 'FORBIDDEN', details);
  }

  static notFound(message = 'Resource not found', details = null) {
    return new ApiError(404, message, 'NOT_FOUND', details);
  }

  static conflict(message = 'Resource already exists', details = null) {
    return new ApiError(409, message, 'CONFLICT', details);
  }

  static unprocessable(message = 'Validation failed', details = null) {
    return new ApiError(422, message, 'VALIDATION_ERROR', details);
  }

  static internal(message = 'Internal server error', details = null) {
    return new ApiError(500, message, 'INTERNAL_ERROR', details, false);
  }
}

export default ApiError;
