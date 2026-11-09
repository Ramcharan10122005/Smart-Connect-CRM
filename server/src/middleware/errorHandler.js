import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/ApiError.js';
import { errorResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, _next) {
  // Non-API routes render EJS error pages (404 and 500)
  if (req.originalUrl && !req.originalUrl.startsWith('/api')) {
    const status = err instanceof ApiError ? err.statusCode : 500;
    const viewName = status === 404 ? 'errors/404' : 'errors/500';
    logger.error({ err, path: req.originalUrl, status }, 'Non-API error encountered');
    return res.status(status).render(viewName, {
      title: `${status === 404 ? 'Page Not Found' : 'Server Error'} - SmartConnect CRM`,
      message: err.message || 'An unexpected error occurred.',
    });
  }

  // 1. Handled Operational ApiErrors
  if (err instanceof ApiError) {
    if (err.statusCode >= 500) {
      logger.error({ err, path: req.originalUrl, method: req.method }, err.message);
    }
    return errorResponse(res, err.message, err.code, err.details, err.statusCode);
  }

  // 2. Zod Validation Errors
  if (err instanceof ZodError) {
    const fieldErrors = err.errors.map((e) => ({
      field: e.path.join('.') || 'root',
      message: e.message,
    }));
    return errorResponse(res, 'Validation failed', 'VALIDATION_ERROR', fieldErrors, 422);
  }

  // 3. Prisma Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target)
        ? err.meta.target.join(', ')
        : err.meta?.target || 'field';
      return errorResponse(
        res,
        `A record with this ${target} already exists`,
        'CONFLICT',
        { fields: err.meta?.target },
        409
      );
    }

    if (err.code === 'P2025') {
      return errorResponse(res, 'Requested record was not found', 'NOT_FOUND', null, 404);
    }

    if (err.code === 'P2003') {
      return errorResponse(
        res,
        'Invalid relation: referenced record does not exist',
        'BAD_REQUEST',
        { field: err.meta?.field_name },
        400
      );
    }

    logger.error({ err, path: req.originalUrl, method: req.method }, 'Prisma error');
    return errorResponse(res, 'Database operation error', 'DATABASE_ERROR', null, 400);
  }

  // 4. Prisma Validation Errors (e.g. malformed queries)
  if (err instanceof Prisma.PrismaClientValidationError) {
    logger.error({ err, path: req.originalUrl }, 'Prisma validation error');
    return errorResponse(res, 'Invalid database query parameters', 'BAD_REQUEST', null, 400);
  }

  // 5. Catch-all Internal Server Errors
  logger.error(
    { err, path: req.originalUrl, method: req.method },
    err.message || 'Unhandled Server Error'
  );

  const isProduction = process.env.NODE_ENV === 'production';
  const message = isProduction ? 'Internal Server Error' : err.message || 'Internal Server Error';
  const details = isProduction ? null : { stack: err.stack };

  return errorResponse(res, message, 'INTERNAL_ERROR', details, 500);
}

export default errorHandler;
