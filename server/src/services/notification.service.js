import prisma from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { parsePaginationParams, buildPaginationMeta } from '../utils/queryHelper.js';

export async function createNotification({ userId, type, title, body, link = null }) {
  if (!userId) {
    throw new Error('createNotification requires a valid userId');
  }

  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      link,
    },
  });
}

export async function getNotifications(query, user) {
  const { page, limit, skip, take } = parsePaginationParams(query, 'createdAt');

  const where = {
    userId: user.id,
  };

  if (query.unreadOnly) {
    where.readAt = null;
  }

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take,
      orderBy: [{ readAt: { sort: 'asc', nulls: 'first' } }, { createdAt: 'desc' }],
    }),
    prisma.notification.count({ where }),
  ]);

  const formattedNotifications = notifications.map((n) => ({
    ...n,
    read: Boolean(n.readAt),
  }));

  const meta = buildPaginationMeta(total, page, limit);

  return { notifications: formattedNotifications, meta };
}

export async function getUnreadCount(userId) {
  const count = await prisma.notification.count({
    where: {
      userId,
      readAt: null,
    },
  });

  return { count };
}

export async function markAsRead(id, userId) {
  const notification = await prisma.notification.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!notification) {
    throw ApiError.notFound('Notification not found or access denied');
  }

  if (notification.readAt) {
    return { ...notification, read: true };
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: {
      readAt: new Date(),
    },
  });

  return { ...updated, read: true };
}

export async function markAllAsRead(userId) {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  return { count: result.count };
}

export default {
  createNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
