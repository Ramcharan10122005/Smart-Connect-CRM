import { verifyJwt } from '../utils/token.js';
import prisma from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  let token = req.cookies?.token;

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw ApiError.unauthorized('Authentication required');
  }

  let decoded;
  try {
    decoded = verifyJwt(token);
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired authentication token', {
      originalError: err.message,
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId || decoded.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      avatarUrl: true,
      isActive: true,
      lastLoginAt: true,
      notificationPreferences: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw ApiError.unauthorized('User account no longer exists');
  }

  if (!user.isActive) {
    throw ApiError.unauthorized('User account has been deactivated');
  }

  req.user = user;
  next();
});

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Access restricted: requires one of [${roles.join(', ')}] role (current: ${req.user.role})`
        )
      );
    }

    next();
  };
};

export default {
  authenticate,
  requireRole,
};
