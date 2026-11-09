import bcrypt from 'bcrypt';
import prisma from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { generateJwt, generateRandomToken, hashToken } from '../utils/token.js';
import { sendPasswordResetEmail } from '../config/mailer.js';
import { createAuditLog } from './audit.service.js';

const BCRYPT_ROUNDS = 12;

export async function setupFirstAdmin({ name, email, password }) {
  const existingUsersCount = await prisma.user.count();
  if (existingUsersCount > 0) {
    throw ApiError.badRequest('Initial system setup is only allowed when zero users exist');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const admin = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: 'ADMIN',
      isActive: true,
      lastLoginAt: new Date(),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  await createAuditLog({
    userId: admin.id,
    action: 'SYSTEM_SETUP',
    entity: 'User',
    entityId: admin.id,
    meta: { email: admin.email, role: admin.role },
  });

  const token = generateJwt({ userId: admin.id, role: admin.role });

  return { user: admin, token };
}

export async function login({ email, password, ipAddress = null, userAgent = null }) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (!user.isActive) {
    throw ApiError.unauthorized('Account has been deactivated. Please contact an administrator.');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
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

  await createAuditLog({
    userId: user.id,
    action: 'LOGIN',
    entity: 'User',
    entityId: user.id,
    meta: { ipAddress, userAgent },
  });

  const token = generateJwt({ userId: user.id, role: user.role });

  return { user: updatedUser, token };
}

export async function forgotPassword({ email }) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Always return identical message regardless of whether user exists to prevent email enumeration
  if (user && user.isActive) {
    const rawToken = generateRandomToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Clean up any existing active tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // Fire and forget or await email delivery
    await sendPasswordResetEmail(user.email, rawToken);

    await createAuditLog({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      entity: 'User',
      entityId: user.id,
    });
  }

  return {
    message: 'If an account with that email exists, password reset instructions have been sent.',
  };
}

export async function resetPassword({ token, password }) {
  const tokenHash = hashToken(token);

  const resetRecord = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt < new Date()) {
    throw ApiError.badRequest('Invalid or expired password reset token');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    }),
  ]);

  await createAuditLog({
    userId: resetRecord.userId,
    action: 'PASSWORD_RESET_COMPLETED',
    entity: 'User',
    entityId: resetRecord.userId,
  });

  return { message: 'Password has been reset successfully. You may now log in.' };
}

export async function changePassword({ userId, currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isCurrentValid) {
    throw ApiError.badRequest('Current password is incorrect');
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  await createAuditLog({
    userId,
    action: 'PASSWORD_CHANGED',
    entity: 'User',
    entityId: userId,
  });

  return { message: 'Password changed successfully' };
}

export default {
  setupFirstAdmin,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
};
