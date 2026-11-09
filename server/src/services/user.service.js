import bcrypt from 'bcrypt';
import prisma from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { generateRandomToken, hashToken } from '../utils/token.js';
import { sendUserInviteEmail } from '../config/mailer.js';
import { createAuditLog } from './audit.service.js';
import { parsePaginationParams, buildPaginationMeta } from '../utils/queryHelper.js';

export async function getUsers(query) {
  const { page, limit, skip, take, orderBy, search } = parsePaginationParams(query, 'name');

  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (query.role) {
    where.role = query.role;
  }

  if (typeof query.isActive === 'boolean') {
    where.isActive = query.isActive;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  const meta = buildPaginationMeta(total, page, limit);

  return { users, meta };
}

export async function inviteUser({ name, email, role, phone = null, invitingUser }) {
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    throw ApiError.conflict('A user with this email address already exists');
  }

  const rawInviteToken = generateRandomToken(32);
  const tokenHash = hashToken(rawInviteToken);
  const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Generate an unguessable placeholder password hash until invitation is accepted
  const placeholderSecret = generateRandomToken(32);
  const passwordHash = await bcrypt.hash(placeholderSecret, 12);

  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      phone,
      isActive: true,
      inviteToken: tokenHash,
      inviteExpiresAt,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      isActive: true,
      createdAt: true,
    },
  });

  await sendUserInviteEmail(email, rawInviteToken, invitingUser?.name);

  await createAuditLog({
    userId: invitingUser?.id,
    action: 'USER_INVITED',
    entity: 'User',
    entityId: newUser.id,
    meta: { email, role, invitedBy: invitingUser?.email },
  });

  return newUser;
}

export async function updateUser({ id, updaterUser, data }) {
  const targetUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!targetUser) {
    throw ApiError.notFound('User not found');
  }

  // SELF-PROTECTION GUARD: An Admin cannot deactivate or demote themselves
  if (updaterUser.id === targetUser.id) {
    if (data.isActive === false) {
      throw ApiError.badRequest('Administrators cannot deactivate their own account');
    }
    if (data.role && data.role !== 'ADMIN') {
      throw ApiError.badRequest('Administrators cannot demote their own role');
    }
  }

  const updatePayload = {};

  if (typeof data.name === 'string') updatePayload.name = data.name;
  if (typeof data.phone !== 'undefined') updatePayload.phone = data.phone;
  if (typeof data.avatarUrl !== 'undefined') updatePayload.avatarUrl = data.avatarUrl;
  if (typeof data.isActive === 'boolean') updatePayload.isActive = data.isActive;
  if (data.role) updatePayload.role = data.role;

  const updated = await prisma.user.update({
    where: { id },
    data: updatePayload,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      avatarUrl: true,
      isActive: true,
      lastLoginAt: true,
      updatedAt: true,
    },
  });

  // Audit Role Change
  if (data.role && data.role !== targetUser.role) {
    await createAuditLog({
      userId: updaterUser.id,
      action: 'ROLE_CHANGE',
      entity: 'User',
      entityId: id,
      meta: { previousRole: targetUser.role, newRole: data.role },
    });
  }

  // Audit Status Change
  if (typeof data.isActive === 'boolean' && data.isActive !== targetUser.isActive) {
    await createAuditLog({
      userId: updaterUser.id,
      action: 'STATUS_CHANGE',
      entity: 'User',
      entityId: id,
      meta: { previousStatus: targetUser.isActive, newStatus: data.isActive },
    });
  }

  return updated;
}

export async function updateMe({ userId, data }) {
  const updatePayload = {};

  if (typeof data.name === 'string') updatePayload.name = data.name;
  if (typeof data.phone !== 'undefined') updatePayload.phone = data.phone;
  if (typeof data.avatarUrl !== 'undefined') updatePayload.avatarUrl = data.avatarUrl;
  if (data.notificationPreferences) {
    updatePayload.notificationPreferences = data.notificationPreferences;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updatePayload,
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
      updatedAt: true,
    },
  });

  return updated;
}

export default {
  getUsers,
  inviteUser,
  updateUser,
  updateMe,
};
