import prisma from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { scopeByOwner } from '../utils/scope.js';
import { parsePaginationParams, buildPaginationMeta } from '../utils/queryHelper.js';
import { createAuditLog } from './audit.service.js';
import { calculateScoreFromParameters, recomputeLeadScore } from './leadScoring.service.js';

function buildLeadWhereClause(query, user) {
  const where = {
    deletedAt: null,
    ...scopeByOwner(user, 'ownerId'),
  };

  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { firstName: { contains: query.search, mode: 'insensitive' } },
      { lastName: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
      { companyName: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  if (query.stageId) where.stageId = query.stageId;
  if (query.sourceId) where.sourceId = query.sourceId;
  if (query.priority) where.priority = query.priority;
  if (query.status) where.status = query.status;

  if (query.ownerId) {
    if (user.role === 'REP' && query.ownerId !== user.id) {
      where.ownerId = '__UNAUTHORIZED__';
    } else {
      where.ownerId = query.ownerId;
    }
  }

  if (typeof query.minValue !== 'undefined' || typeof query.maxValue !== 'undefined') {
    where.value = {};
    if (typeof query.minValue !== 'undefined') where.value.gte = query.minValue;
    if (typeof query.maxValue !== 'undefined') where.value.lte = query.maxValue;
  }

  if (query.expectedCloseDateFrom || query.expectedCloseDateTo) {
    where.expectedCloseDate = {};
    if (query.expectedCloseDateFrom) where.expectedCloseDate.gte = query.expectedCloseDateFrom;
    if (query.expectedCloseDateTo) where.expectedCloseDate.lte = query.expectedCloseDateTo;
  }

  return where;
}

export async function getLeads(query, user) {
  const { page, limit, skip, take, orderBy } = parsePaginationParams(query, 'createdAt');
  const where = buildLeadWhereClause(query, user);

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        stage: { select: { id: true, name: true, color: true, type: true, probability: true } },
        source: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
        company: { select: { id: true, name: true, domain: true } },
        contact: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
      },
    }),
    prisma.lead.count({ where }),
  ]);

  const meta = buildPaginationMeta(total, page, limit);

  return { leads, meta };
}

export async function getLeadBoard(query, user) {
  const where = buildLeadWhereClause(query, user);

  // Fetch all stages in display order
  const stages = await prisma.pipelineStage.findMany({
    orderBy: { position: 'asc' },
  });

  // Fetch all leads satisfying filters
  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
      source: { select: { id: true, name: true } },
      company: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
    },
  });

  // Group leads per stage and calculate metrics
  let totalBoardValue = 0;
  let totalWeightedBoardValue = 0;

  const boardStages = stages.map((stage) => {
    const stageLeads = leads.filter((lead) => lead.stageId === stage.id);
    const stageCount = stageLeads.length;

    const stageValue = stageLeads.reduce((acc, lead) => acc + Number(lead.value || 0), 0);
    const stageWeightedValue = Math.round(stageValue * (stage.probability / 100));

    totalBoardValue += stageValue;
    totalWeightedBoardValue += stageWeightedValue;

    return {
      stage: {
        id: stage.id,
        name: stage.name,
        position: stage.position,
        probability: stage.probability,
        type: stage.type,
        color: stage.color,
      },
      count: stageCount,
      totalValue: stageValue,
      weightedValue: stageWeightedValue,
      leads: stageLeads,
    };
  });

  return {
    stages: boardStages,
    summary: {
      totalLeads: leads.length,
      totalPipelineValue: totalBoardValue,
      totalWeightedPipelineValue: totalWeightedBoardValue,
    },
  };
}

export async function getLeadById(id, user) {
  const lead = await prisma.lead.findFirst({
    where: {
      id,
      deletedAt: null,
      ...scopeByOwner(user, 'ownerId'),
    },
    include: {
      stage: true,
      source: true,
      owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
      company: true,
      contact: true,
      stageHistory: {
        orderBy: { changedAt: 'desc' },
        include: {
          fromStage: { select: { id: true, name: true } },
          toStage: { select: { id: true, name: true } },
          changedBy: { select: { id: true, name: true } },
        },
      },
      activities: {
        orderBy: { occurredAt: 'desc' },
        include: {
          createdBy: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
      followUps: {
        orderBy: { dueAt: 'asc' },
        include: {
          assignee: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!lead) {
    throw ApiError.notFound('Lead not found or access denied');
  }

  return lead;
}

export async function createLead(data, user) {
  const ownerId = data.ownerId || (user.role === 'REP' ? user.id : user.id);

  // Validate stage
  const stage = await prisma.pipelineStage.findUnique({
    where: { id: data.stageId },
  });
  if (!stage) {
    throw ApiError.notFound('Target pipeline stage not found');
  }

  // Validate or fetch source name for score calculation
  let sourceName = '';
  if (data.sourceId) {
    const source = await prisma.leadSource.findUnique({ where: { id: data.sourceId } });
    sourceName = source?.name || '';
  }

  // Initial score
  const initialScore = calculateScoreFromParameters({
    email: data.email,
    phone: data.phone,
    value: data.value,
    sourceName,
    recentActivityCount: 0,
    stageProbability: stage.probability,
  });

  const lead = await prisma.lead.create({
    data: {
      title: data.title,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      companyName: data.companyName,
      companyId: data.companyId,
      contactId: data.contactId,
      value: data.value,
      currency: data.currency || 'USD',
      sourceId: data.sourceId,
      stageId: data.stageId,
      ownerId,
      priority: data.priority || 'MEDIUM',
      score: initialScore,
      expectedCloseDate: data.expectedCloseDate,
      status: stage.type === 'WON' ? 'WON' : stage.type === 'LOST' ? 'LOST' : 'OPEN',
      lostReason: data.lostReason,
    },
    include: {
      stage: true,
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  // Record initial stage history entry
  await prisma.leadStageHistory.create({
    data: {
      leadId: lead.id,
      fromStageId: null,
      toStageId: stage.id,
      changedById: user.id,
    },
  });

  // Create initial SYSTEM activity
  await prisma.activity.create({
    data: {
      type: 'SYSTEM',
      subject: 'Lead Created',
      body: `Lead "${lead.title}" created in stage "${stage.name}" with priority ${lead.priority}`,
      leadId: lead.id,
      companyId: lead.companyId,
      contactId: lead.contactId,
      createdById: user.id,
    },
  });

  await createAuditLog({
    userId: user.id,
    action: 'LEAD_CREATED',
    entity: 'Lead',
    entityId: lead.id,
    meta: { title: lead.title, value: lead.value, stageId: stage.id, ownerId },
  });

  return lead;
}

export async function updateLead(id, data, user) {
  const existing = await prisma.lead.findFirst({
    where: {
      id,
      deletedAt: null,
      ...scopeByOwner(user, 'ownerId'),
    },
  });

  if (!existing) {
    throw ApiError.notFound('Lead not found or access denied');
  }

  const updated = await prisma.lead.update({
    where: { id },
    data,
    include: {
      stage: true,
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  // Recompute score on update
  await recomputeLeadScore(id);

  await createAuditLog({
    userId: user.id,
    action: 'LEAD_UPDATED',
    entity: 'Lead',
    entityId: id,
    meta: { title: updated.title, value: updated.value },
  });

  return updated;
}

export async function deleteLead(id, user) {
  const existing = await prisma.lead.findFirst({
    where: {
      id,
      deletedAt: null,
      ...scopeByOwner(user, 'ownerId'),
    },
  });

  if (!existing) {
    throw ApiError.notFound('Lead not found or access denied');
  }

  await prisma.lead.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await createAuditLog({
    userId: user.id,
    action: 'LEAD_DELETED',
    entity: 'Lead',
    entityId: id,
    meta: { title: existing.title },
  });

  return { message: 'Lead soft-deleted successfully' };
}

export async function moveLeadStage(id, { stageId, lostReason }, user) {
  const lead = await prisma.lead.findFirst({
    where: {
      id,
      deletedAt: null,
      ...scopeByOwner(user, 'ownerId'),
    },
    include: { stage: true },
  });

  if (!lead) {
    throw ApiError.notFound('Lead not found or access denied');
  }

  const targetStage = await prisma.pipelineStage.findUnique({
    where: { id: stageId },
  });

  if (!targetStage) {
    throw ApiError.notFound('Target pipeline stage not found');
  }

  // LOST REASON VALIDATION: Moving to a Lost stage requires a valid reason
  if (targetStage.type === 'LOST') {
    if (!lostReason || !lostReason.trim()) {
      throw ApiError.badRequest('A lostReason is required when moving a lead to a Lost stage');
    }
  }

  const newStatus =
    targetStage.type === 'WON' ? 'WON' : targetStage.type === 'LOST' ? 'LOST' : 'OPEN';
  const updatedLostReason = targetStage.type === 'LOST' ? lostReason.trim() : null;

  const [updatedLead] = await prisma.$transaction([
    prisma.lead.update({
      where: { id },
      data: {
        stageId: targetStage.id,
        status: newStatus,
        lostReason: updatedLostReason,
      },
      include: {
        stage: true,
        owner: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.leadStageHistory.create({
      data: {
        leadId: id,
        fromStageId: lead.stage.id,
        toStageId: targetStage.id,
        changedById: user.id,
      },
    }),
    prisma.activity.create({
      data: {
        type: 'SYSTEM',
        subject: 'Stage Changed',
        body: `Stage changed from "${lead.stage.name}" to "${targetStage.name}"${
          updatedLostReason ? ` (Reason: ${updatedLostReason})` : ''
        }`,
        leadId: id,
        contactId: lead.contactId,
        companyId: lead.companyId,
        createdById: user.id,
      },
    }),
  ]);

  // Recompute score reflecting new stage probability
  await recomputeLeadScore(id);

  await createAuditLog({
    userId: user.id,
    action: 'LEAD_STAGE_MOVED',
    entity: 'Lead',
    entityId: id,
    meta: {
      fromStage: lead.stage.name,
      toStage: targetStage.name,
      status: newStatus,
      lostReason: updatedLostReason,
    },
  });

  return updatedLead;
}

export async function convertLead(id, user) {
  const lead = await prisma.lead.findFirst({
    where: {
      id,
      deletedAt: null,
      ...scopeByOwner(user, 'ownerId'),
    },
    include: {
      stage: true,
      company: true,
      contact: true,
    },
  });

  if (!lead) {
    throw ApiError.notFound('Lead not found or access denied');
  }

  if (lead.convertedContactId) {
    const existingContact = await prisma.contact.findUnique({
      where: { id: lead.convertedContactId },
      include: { company: true },
    });
    return {
      message: 'Lead was already converted',
      contact: existingContact,
      company: existingContact?.company || null,
      lead,
    };
  }

  let companyId = lead.companyId;

  // 1. Resolve or create company if companyName provided
  if (!companyId && lead.companyName) {
    let existingCompany = await prisma.company.findFirst({
      where: {
        name: { equals: lead.companyName.trim(), mode: 'insensitive' },
        deletedAt: null,
      },
    });

    if (!existingCompany) {
      existingCompany = await prisma.company.create({
        data: {
          name: lead.companyName.trim(),
          ownerId: lead.ownerId || user.id,
        },
      });
    }
    companyId = existingCompany.id;
  }

  // 2. Create the Contact from lead data
  const contactFirstName = lead.firstName || lead.title.split(' ')[0] || 'Lead';
  const contactLastName = lead.lastName || lead.title.split(' ').slice(1).join(' ') || 'Contact';

  const newContact = await prisma.contact.create({
    data: {
      firstName: contactFirstName,
      lastName: contactLastName,
      email: lead.email,
      phone: lead.phone,
      companyId,
      ownerId: lead.ownerId || user.id,
      lifecycleStage: 'CUSTOMER',
      sourceId: lead.sourceId,
      notes: `Converted from lead "${lead.title}"`,
      lastContactedAt: new Date(),
    },
    include: { company: true, owner: true },
  });

  // 3. Find WON stage if available to progress lead
  const wonStage = await prisma.pipelineStage.findFirst({
    where: { type: 'WON' },
    orderBy: { position: 'desc' },
  });

  // 4. Update Lead to record conversion & link contact
  const updatedLead = await prisma.lead.update({
    where: { id },
    data: {
      convertedContactId: newContact.id,
      convertedAt: new Date(),
      contactId: newContact.id,
      companyId,
      status: 'WON',
      stageId: wonStage ? wonStage.id : lead.stageId,
    },
  });

  // 5. Link all historical activities of this lead to the newly created contact & company
  await prisma.activity.updateMany({
    where: { leadId: id },
    data: {
      contactId: newContact.id,
      companyId,
    },
  });

  // 6. Record SYSTEM conversion activity
  await prisma.activity.create({
    data: {
      type: 'SYSTEM',
      subject: 'Lead Converted',
      body: `Lead "${lead.title}" converted to Customer Contact "${newContact.firstName} ${newContact.lastName}"`,
      leadId: id,
      contactId: newContact.id,
      companyId,
      createdById: user.id,
    },
  });

  // 7. Recompute lead score
  await recomputeLeadScore(id);

  await createAuditLog({
    userId: user.id,
    action: 'LEAD_CONVERTED',
    entity: 'Lead',
    entityId: id,
    meta: {
      contactId: newContact.id,
      companyId,
      leadTitle: lead.title,
    },
  });

  return {
    contact: newContact,
    company: newContact.company,
    lead: updatedLead,
  };
}

export default {
  getLeads,
  getLeadBoard,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  moveLeadStage,
  convertLead,
};
