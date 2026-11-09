import prisma from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { parsePaginationParams, buildPaginationMeta } from '../utils/queryHelper.js';
import { createAuditLog } from './audit.service.js';
import { createNotification } from './notification.service.js';
import { logger } from '../utils/logger.js';

export function computeNextDueDate(currentDate, recurrence) {
  const next = new Date(currentDate);
  switch (recurrence) {
    case 'DAILY':
      next.setDate(next.getDate() + 1);
      break;
    case 'WEEKLY':
      next.setDate(next.getDate() + 7);
      break;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      return null;
  }
  return next;
}

export function computeSnoozeDate(until, preset) {
  if (until) return new Date(until);

  const now = new Date();
  switch (preset) {
    case '1_hour':
      return new Date(now.getTime() + 60 * 60 * 1000);
    case 'tomorrow_9am': {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      return tomorrow;
    }
    case 'next_week': {
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      nextWeek.setHours(9, 0, 0, 0);
      return nextWeek;
    }
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
}

export async function createFollowUp(data, user) {
  const assigneeId = data.assigneeId || user.id;

  const followUp = await prisma.followUp.create({
    data: {
      title: data.title,
      description: data.description,
      dueAt: data.dueAt,
      priority: data.priority || 'MEDIUM',
      status: 'PENDING',
      recurrence: data.recurrence || 'NONE',
      assigneeId,
      createdById: user.id,
      contactId: data.contactId || null,
      leadId: data.leadId || null,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      lead: { select: { id: true, title: true } },
    },
  });

  await createAuditLog({
    userId: user.id,
    action: 'FOLLOW_UP_CREATED',
    entity: 'FollowUp',
    entityId: followUp.id,
    meta: { title: followUp.title, dueAt: followUp.dueAt, assigneeId },
  });

  // Notify assignee if assigned to someone else
  if (assigneeId && assigneeId !== user.id) {
    try {
      await createNotification({
        userId: assigneeId,
        type: 'FOLLOW_UP_ASSIGNED',
        title: 'New Follow-Up Assigned',
        body: `You have been assigned to follow-up "${followUp.title}"`,
        link: '/follow-ups',
      });
    } catch (err) {
      logger.warn({ err }, 'Failed to create follow-up assignment notification');
    }
  }

  return followUp;
}

export async function getFollowUps(query, user) {
  const { page, limit, skip, take, orderBy } = parsePaginationParams(query, 'dueAt');

  const where = {};
  const now = new Date();

  // Scoping: Rep default to own assignees if not specified
  if (user.role === 'REP') {
    where.assigneeId = user.id;
  } else if (query.assigneeId) {
    where.assigneeId = query.assigneeId;
  }

  if (query.priority) where.priority = query.priority;
  if (query.contactId) where.contactId = query.contactId;
  if (query.leadId) where.leadId = query.leadId;

  // View Filter (today, upcoming, overdue, completed)
  if (query.view) {
    switch (query.view) {
      case 'today': {
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);

        where.status = 'PENDING';
        where.dueAt = { gte: startOfDay, lte: endOfDay };
        break;
      }
      case 'upcoming': {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const next7Days = new Date(now);
        next7Days.setDate(next7Days.getDate() + 7);
        next7Days.setHours(23, 59, 59, 999);

        where.status = 'PENDING';
        where.dueAt = { gte: tomorrow, lte: next7Days };
        break;
      }
      case 'overdue': {
        // OVERDUE IS COMPUTED: PENDING and dueAt in the past
        where.status = 'PENDING';
        where.dueAt = { lt: now };
        break;
      }
      case 'completed': {
        where.status = 'DONE';
        break;
      }
    }
  } else {
    if (query.status) where.status = query.status;
    if (query.dueFrom || query.dueTo) {
      where.dueAt = {};
      if (query.dueFrom) where.dueAt.gte = query.dueFrom;
      if (query.dueTo) where.dueAt.lte = query.dueTo;
    }
  }

  const [followUps, total] = await Promise.all([
    prisma.followUp.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        lead: { select: { id: true, title: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
    prisma.followUp.count({ where }),
  ]);

  const meta = buildPaginationMeta(total, page, limit);

  return { followUps, meta };
}

export async function getFollowUpSummary(user) {
  const now = new Date();
  const userId = user.id;

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const next7Days = new Date(now);
  next7Days.setDate(next7Days.getDate() + 7);
  next7Days.setHours(23, 59, 59, 999);

  const [todayCount, overdueCount, upcomingCount, completedCount] = await Promise.all([
    // Today
    prisma.followUp.count({
      where: {
        assigneeId: userId,
        status: 'PENDING',
        dueAt: { gte: startOfDay, lte: endOfDay },
      },
    }),

    // Overdue (computed: PENDING & dueAt < now)
    prisma.followUp.count({
      where: {
        assigneeId: userId,
        status: 'PENDING',
        dueAt: { lt: now },
      },
    }),

    // Upcoming (next 7 days)
    prisma.followUp.count({
      where: {
        assigneeId: userId,
        status: 'PENDING',
        dueAt: { gte: tomorrow, lte: next7Days },
      },
    }),

    // Completed
    prisma.followUp.count({
      where: {
        assigneeId: userId,
        status: 'DONE',
      },
    }),
  ]);

  return {
    today: todayCount,
    overdue: overdueCount,
    upcoming: upcomingCount,
    completed: completedCount,
  };
}

export async function completeFollowUp(id, { logActivity = false, note = '' }, user) {
  const followUp = await prisma.followUp.findUnique({
    where: { id },
  });

  if (!followUp) {
    throw ApiError.notFound('Follow-up task not found');
  }

  const completedAt = new Date();

  // 1. Mark completed
  const updated = await prisma.followUp.update({
    where: { id },
    data: {
      status: 'DONE',
      completedAt,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      lead: { select: { id: true, title: true } },
    },
  });

  let nextOccurrence = null;

  // 2. Recurrence handling: automatically spawn next occurrence if recurrence !== NONE
  if (followUp.recurrence && followUp.recurrence !== 'NONE') {
    const nextDueAt = computeNextDueDate(followUp.dueAt, followUp.recurrence);
    if (nextDueAt) {
      nextOccurrence = await prisma.followUp.create({
        data: {
          title: followUp.title,
          description: followUp.description,
          dueAt: nextDueAt,
          priority: followUp.priority,
          status: 'PENDING',
          recurrence: followUp.recurrence,
          contactId: followUp.contactId,
          leadId: followUp.leadId,
          assigneeId: followUp.assigneeId,
          createdById: user.id,
        },
      });
    }
  }

  // 3. Optional linked activity creation
  let createdActivity = null;
  if (logActivity && (followUp.contactId || followUp.leadId)) {
    createdActivity = await prisma.activity.create({
      data: {
        type: 'NOTE',
        subject: `Completed task: ${followUp.title}`,
        body: note || followUp.description || `Task completed by ${user.name}`,
        occurredAt: completedAt,
        contactId: followUp.contactId,
        leadId: followUp.leadId,
        createdById: user.id,
      },
    });
  }

  await createAuditLog({
    userId: user.id,
    action: 'FOLLOW_UP_COMPLETED',
    entity: 'FollowUp',
    entityId: id,
    meta: {
      title: followUp.title,
      spawnedNextId: nextOccurrence?.id || null,
      loggedActivityId: createdActivity?.id || null,
    },
  });

  return {
    followUp: updated,
    nextOccurrence,
    activity: createdActivity,
  };
}

export async function snoozeFollowUp(id, { until, preset }, user) {
  const followUp = await prisma.followUp.findUnique({
    where: { id },
  });

  if (!followUp) {
    throw ApiError.notFound('Follow-up task not found');
  }

  const snoozedUntil = computeSnoozeDate(until, preset);

  const updated = await prisma.followUp.update({
    where: { id },
    data: {
      status: 'SNOOZED',
      snoozedUntil,
      dueAt: snoozedUntil,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  await createAuditLog({
    userId: user.id,
    action: 'FOLLOW_UP_SNOOZED',
    entity: 'FollowUp',
    entityId: id,
    meta: { snoozedUntil, preset: preset || 'custom' },
  });

  return updated;
}

export async function reassignFollowUp(id, { assigneeId }, user) {
  const followUp = await prisma.followUp.findUnique({
    where: { id },
  });

  if (!followUp) {
    throw ApiError.notFound('Follow-up task not found');
  }

  const newAssignee = await prisma.user.findUnique({
    where: { id: assigneeId },
  });

  if (!newAssignee) {
    throw ApiError.notFound('New assignee user not found');
  }

  const updated = await prisma.followUp.update({
    where: { id },
    data: { assigneeId },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  await createAuditLog({
    userId: user.id,
    action: 'FOLLOW_UP_REASSIGNED',
    entity: 'FollowUp',
    entityId: id,
    meta: { previousAssigneeId: followUp.assigneeId, newAssigneeId: assigneeId },
  });

  // Notify new assignee if assigned to someone else
  if (assigneeId !== user.id) {
    try {
      await createNotification({
        userId: assigneeId,
        type: 'FOLLOW_UP_ASSIGNED',
        title: 'Follow-Up Reassigned',
        body: `Follow-up "${updated.title}" has been reassigned to you`,
        link: '/follow-ups',
      });
    } catch (err) {
      logger.warn({ err }, 'Failed to create follow-up reassignment notification');
    }
  }

  return updated;
}

export default {
  createFollowUp,
  getFollowUps,
  getFollowUpSummary,
  completeFollowUp,
  snoozeFollowUp,
  reassignFollowUp,
};
