import prisma from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { parsePaginationParams, buildPaginationMeta } from '../utils/queryHelper.js';
import { createAuditLog } from './audit.service.js';
import { recomputeLeadScore } from './leadScoring.service.js';

export async function createActivity(data, user) {
  let { contactId, companyId, leadId } = data;

  // 1. If leadId given, check if lead is converted or already linked to a contact/company
  if (leadId) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { contactId: true, convertedContactId: true, companyId: true },
    });

    if (lead) {
      if (!contactId) {
        contactId = lead.convertedContactId || lead.contactId || null;
      }
      if (!companyId) {
        companyId = lead.companyId || null;
      }
    }
  }

  // 2. If contactId given and no companyId, populate from contact's company
  if (contactId && !companyId) {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      select: { companyId: true },
    });
    if (contact?.companyId) {
      companyId = contact.companyId;
    }
  }

  const occurredAt = data.occurredAt || new Date();

  const activity = await prisma.activity.create({
    data: {
      type: data.type,
      subject: data.subject,
      body: data.body,
      outcome: data.outcome,
      durationMinutes: data.durationMinutes,
      occurredAt,
      contactId: contactId || null,
      companyId: companyId || null,
      leadId: leadId || null,
      createdById: user.id,
    },
    include: {
      createdBy: { select: { id: true, name: true, avatarUrl: true } },
      contact: { select: { id: true, firstName: true, lastName: true, email: true } },
      company: { select: { id: true, name: true } },
      lead: { select: { id: true, title: true } },
    },
  });

  // 3. Automatically update contact's lastContactedAt if contact is linked
  if (contactId) {
    await prisma.contact.update({
      where: { id: contactId },
      data: { lastContactedAt: occurredAt },
    });
  }

  // 4. Automatically recompute lead score if lead is linked
  if (leadId) {
    await recomputeLeadScore(leadId);
  }

  await createAuditLog({
    userId: user.id,
    action: 'ACTIVITY_CREATED',
    entity: 'Activity',
    entityId: activity.id,
    meta: { type: activity.type, subject: activity.subject, contactId, leadId, companyId },
  });

  return activity;
}

export async function getActivities(query) {
  const { page, limit, skip, take, search } = parsePaginationParams(query, 'occurredAt');

  const where = {};

  if (query.type) where.type = query.type;
  if (query.createdById) where.createdById = query.createdById;
  if (query.contactId) where.contactId = query.contactId;
  if (query.companyId) where.companyId = query.companyId;
  if (query.leadId) where.leadId = query.leadId;

  if (query.dateFrom || query.dateTo) {
    where.occurredAt = {};
    if (query.dateFrom) where.occurredAt.gte = new Date(query.dateFrom);
    if (query.dateTo) where.occurredAt.lte = new Date(query.dateTo);
  }

  if (search) {
    where.OR = [
      { subject: { contains: search, mode: 'insensitive' } },
      { body: { contains: search, mode: 'insensitive' } },
      { outcome: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      skip,
      take,
      orderBy: { occurredAt: 'desc' }, // newest first
      include: {
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
        lead: { select: { id: true, title: true } },
      },
    }),
    prisma.activity.count({ where }),
  ]);

  const meta = buildPaginationMeta(total, page, limit);

  return { activities, meta };
}

export async function getMergedTimeline({ contactId, companyId, leadId, limit = 50 }) {
  // Query 1: Activity records
  const activityWhere = {};
  if (contactId) activityWhere.contactId = contactId;
  if (companyId) activityWhere.companyId = companyId;
  if (leadId) activityWhere.leadId = leadId;

  const activitiesPromise = prisma.activity.findMany({
    where: activityWhere,
    take: limit,
    orderBy: { occurredAt: 'desc' },
    include: {
      createdBy: { select: { id: true, name: true, avatarUrl: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      company: { select: { id: true, name: true } },
      lead: { select: { id: true, title: true } },
    },
  });

  // Query 2: Lead Stage Transitions
  const stageHistoryWhere = {};
  if (leadId) {
    stageHistoryWhere.leadId = leadId;
  } else if (contactId) {
    stageHistoryWhere.lead = { contactId, deletedAt: null };
  } else if (companyId) {
    stageHistoryWhere.lead = { companyId, deletedAt: null };
  }

  const stageChangesPromise = prisma.leadStageHistory.findMany({
    where: stageHistoryWhere,
    take: limit,
    orderBy: { changedAt: 'desc' },
    include: {
      fromStage: { select: { id: true, name: true, color: true } },
      toStage: { select: { id: true, name: true, color: true } },
      changedBy: { select: { id: true, name: true, avatarUrl: true } },
      lead: { select: { id: true, title: true } },
    },
  });

  // Query 3: Completed Follow-ups
  const followUpWhere = { status: 'DONE' };
  if (contactId) followUpWhere.contactId = contactId;
  if (leadId) followUpWhere.leadId = leadId;

  const completedFollowUpsPromise = prisma.followUp.findMany({
    where: followUpWhere,
    take: limit,
    orderBy: { completedAt: 'desc' },
    include: {
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      createdBy: { select: { id: true, name: true } },
      lead: { select: { id: true, title: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  const [activities, stageChanges, completedFollowUps] = await Promise.all([
    activitiesPromise,
    stageChangesPromise,
    completedFollowUpsPromise,
  ]);

  // Normalize into unified timeline events
  const normalizedActivities = activities.map((item) => ({
    id: item.id,
    timelineType: 'ACTIVITY',
    activityType: item.type,
    subject: item.subject,
    body: item.body,
    outcome: item.outcome,
    durationMinutes: item.durationMinutes,
    timestamp: item.occurredAt,
    actor: item.createdBy,
    contact: item.contact,
    company: item.company,
    lead: item.lead,
  }));

  const normalizedStageChanges = stageChanges.map((item) => ({
    id: item.id,
    timelineType: 'STAGE_CHANGE',
    activityType: 'SYSTEM',
    subject: `Stage moved to ${item.toStage.name}`,
    body: item.fromStage
      ? `Deal transitioned from "${item.fromStage.name}" to "${item.toStage.name}"`
      : `Deal initiated in "${item.toStage.name}"`,
    timestamp: item.changedAt,
    actor: item.changedBy,
    fromStage: item.fromStage,
    toStage: item.toStage,
    lead: item.lead,
  }));

  const normalizedFollowUps = completedFollowUps.map((item) => ({
    id: item.id,
    timelineType: 'COMPLETED_FOLLOW_UP',
    activityType: 'NOTE',
    subject: `Follow-up completed: ${item.title}`,
    body: item.description || 'Task marked done',
    timestamp: item.completedAt || item.dueAt,
    actor: item.assignee || item.createdBy,
    contact: item.contact,
    lead: item.lead,
  }));

  // Merge and sort newest first
  const mergedTimeline = [
    ...normalizedActivities,
    ...normalizedStageChanges,
    ...normalizedFollowUps,
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);

  return mergedTimeline;
}

export async function updateActivity(id, data, user) {
  const existing = await prisma.activity.findUnique({
    where: { id },
  });

  if (!existing) {
    throw ApiError.notFound('Activity not found');
  }

  // INVARIANT: SYSTEM activities cannot be edited
  if (existing.type === 'SYSTEM') {
    throw ApiError.badRequest('SYSTEM activities cannot be edited');
  }

  // Authorization: Creator, MANAGER, or ADMIN only
  const isCreator = existing.createdById === user.id;
  const isManagerOrAdmin = user.role === 'ADMIN' || user.role === 'MANAGER';
  if (!isCreator && !isManagerOrAdmin) {
    throw ApiError.forbidden('You do not have permission to edit this activity');
  }

  const updated = await prisma.activity.update({
    where: { id },
    data,
    include: {
      createdBy: { select: { id: true, name: true, avatarUrl: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  await createAuditLog({
    userId: user.id,
    action: 'ACTIVITY_UPDATED',
    entity: 'Activity',
    entityId: id,
    meta: { previousSubject: existing.subject, newSubject: updated.subject },
  });

  return updated;
}

export async function deleteActivity(id, user) {
  const existing = await prisma.activity.findUnique({
    where: { id },
  });

  if (!existing) {
    throw ApiError.notFound('Activity not found');
  }

  // INVARIANT: SYSTEM activities cannot be deleted
  if (existing.type === 'SYSTEM') {
    throw ApiError.badRequest('SYSTEM activities cannot be deleted');
  }

  // Authorization: Creator, MANAGER, or ADMIN only
  const isCreator = existing.createdById === user.id;
  const isManagerOrAdmin = user.role === 'ADMIN' || user.role === 'MANAGER';
  if (!isCreator && !isManagerOrAdmin) {
    throw ApiError.forbidden('You do not have permission to delete this activity');
  }

  await prisma.activity.delete({ where: { id } });

  await createAuditLog({
    userId: user.id,
    action: 'ACTIVITY_DELETED',
    entity: 'Activity',
    entityId: id,
    meta: { subject: existing.subject, type: existing.type },
  });

  return { message: 'Activity deleted successfully' };
}

export default {
  createActivity,
  getActivities,
  getMergedTimeline,
  updateActivity,
  deleteActivity,
};
