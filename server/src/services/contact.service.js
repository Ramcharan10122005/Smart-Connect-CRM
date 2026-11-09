import prisma from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { scopeByOwner } from '../utils/scope.js';
import { parsePaginationParams, buildPaginationMeta } from '../utils/queryHelper.js';
import { createAuditLog } from './audit.service.js';

export async function getContacts(query, user) {
  const { page, limit, skip, take, orderBy, search } = parsePaginationParams(query, 'lastName');

  const where = {
    deletedAt: null,
    ...scopeByOwner(user, 'ownerId'),
  };

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { company: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  if (query.ownerId) {
    if (user.role === 'REP' && query.ownerId !== user.id) {
      where.ownerId = '__UNAUTHORIZED__';
    } else {
      where.ownerId = query.ownerId;
    }
  }

  if (query.companyId) {
    where.companyId = query.companyId;
  }

  if (query.sourceId) {
    where.sourceId = query.sourceId;
  }

  if (query.lifecycleStage) {
    where.lifecycleStage = query.lifecycleStage;
  }

  if (query.tagId) {
    where.tags = {
      some: { tagId: query.tagId },
    };
  }

  if (query.createdFrom || query.createdTo) {
    where.createdAt = {};
    if (query.createdFrom) where.createdAt.gte = query.createdFrom;
    if (query.createdTo) where.createdAt.lte = query.createdTo;
  }

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        company: {
          select: { id: true, name: true, domain: true },
        },
        owner: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        source: {
          select: { id: true, name: true },
        },
        tags: {
          include: { tag: true },
        },
      },
    }),
    prisma.contact.count({ where }),
  ]);

  const meta = buildPaginationMeta(total, page, limit);

  return { contacts, meta };
}

export async function getContactById(id, user) {
  const contact = await prisma.contact.findFirst({
    where: {
      id,
      deletedAt: null,
      ...scopeByOwner(user, 'ownerId'),
    },
    include: {
      company: {
        select: { id: true, name: true, domain: true, phone: true, website: true },
      },
      owner: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
      source: {
        select: { id: true, name: true },
      },
      tags: {
        include: { tag: true },
      },
    },
  });

  if (!contact) {
    throw ApiError.notFound('Contact not found or access denied');
  }

  return contact;
}

export async function getContactOverview(id, user) {
  const contact = await prisma.contact.findFirst({
    where: {
      id,
      deletedAt: null,
      ...scopeByOwner(user, 'ownerId'),
    },
    include: {
      company: true,
      owner: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
      source: true,
      tags: {
        include: { tag: true },
      },
    },
  });

  if (!contact) {
    throw ApiError.notFound('Contact not found or access denied');
  }

  const now = new Date();

  // Parallel fetch: Open leads, timeline activities, upcoming follow-ups, interaction count
  const [openLeads, timelineItems, upcomingFollowUps, totalInteractions] = await Promise.all([
    // Open Leads
    prisma.lead.findMany({
      where: {
        contactId: id,
        deletedAt: null,
        stage: { type: 'OPEN' },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        stage: true,
        owner: { select: { id: true, name: true } },
      },
    }),

    // Last 20 Timeline activities
    prisma.activity.findMany({
      where: { contactId: id },
      take: 20,
      orderBy: { occurredAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
      },
    }),

    // Upcoming Follow-ups
    prisma.followUp.findMany({
      where: {
        contactId: id,
        status: { not: 'DONE' },
        dueAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }, // including today & upcoming
      },
      orderBy: { dueAt: 'asc' },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
      },
    }),

    // Total interactions count
    prisma.activity.count({
      where: { contactId: id },
    }),
  ]);

  // Summary statistics calculation
  const lastContactedAt = contact.lastContactedAt || timelineItems[0]?.occurredAt || null;
  let daysSinceLastContact = null;
  if (lastContactedAt) {
    const diffMs = Date.now() - new Date(lastContactedAt).getTime();
    daysSinceLastContact = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }

  const summaryStats = {
    totalInteractions,
    lastContactedAt,
    daysSinceLastContact,
    openLeadsCount: openLeads.length,
    openPipelineValue: openLeads.reduce((acc, lead) => acc + Number(lead.value || 0), 0),
  };

  return {
    contact,
    company: contact.company,
    tags: contact.tags.map((t) => t.tag),
    owner: contact.owner,
    openLeads,
    timeline: timelineItems,
    upcomingFollowUps,
    summaryStats,
  };
}

export async function createContact(data, user) {
  // Duplicate email detection
  if (data.email) {
    const existing = await prisma.contact.findFirst({
      where: {
        email: data.email,
        deletedAt: null,
      },
      select: { id: true, firstName: true, lastName: true },
    });

    if (existing && !data.force) {
      throw ApiError.conflict('A contact with this email already exists', {
        existingId: existing.id,
        existingName: `${existing.firstName} ${existing.lastName}`,
      });
    }
  }

  const ownerId = data.ownerId || (user.role === 'REP' ? user.id : user.id);
  const tagIds = data.tagIds;
  const fields = { ...data };
  delete fields.tagIds;
  delete fields.force;

  const contact = await prisma.contact.create({
    data: {
      ...fields,
      ownerId,
      tags: tagIds?.length
        ? {
            create: tagIds.map((tagId) => ({ tagId })),
          }
        : undefined,
    },
    include: {
      company: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true, email: true } },
      tags: { include: { tag: true } },
    },
  });

  await createAuditLog({
    userId: user.id,
    action: 'CONTACT_CREATED',
    entity: 'Contact',
    entityId: contact.id,
    meta: { name: `${contact.firstName} ${contact.lastName}`, email: contact.email, ownerId },
  });

  return contact;
}

export async function updateContact(id, data, user) {
  const existing = await prisma.contact.findFirst({
    where: {
      id,
      deletedAt: null,
      ...scopeByOwner(user, 'ownerId'),
    },
  });

  if (!existing) {
    throw ApiError.notFound('Contact not found or access denied');
  }

  const tagIds = data.tagIds;
  const fields = { ...data };
  delete fields.tagIds;
  delete fields.force;

  const updated = await prisma.contact.update({
    where: { id },
    data: {
      ...fields,
      tags: tagIds
        ? {
            deleteMany: {},
            create: tagIds.map((tagId) => ({ tagId })),
          }
        : undefined,
    },
    include: {
      company: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true, email: true } },
      tags: { include: { tag: true } },
    },
  });

  await createAuditLog({
    userId: user.id,
    action: 'CONTACT_UPDATED',
    entity: 'Contact',
    entityId: id,
    meta: {
      name: `${updated.firstName} ${updated.lastName}`,
      email: updated.email,
    },
  });

  return updated;
}

export async function deleteContact(id, user) {
  const existing = await prisma.contact.findFirst({
    where: {
      id,
      deletedAt: null,
      ...scopeByOwner(user, 'ownerId'),
    },
  });

  if (!existing) {
    throw ApiError.notFound('Contact not found or access denied');
  }

  await prisma.contact.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await createAuditLog({
    userId: user.id,
    action: 'CONTACT_DELETED',
    entity: 'Contact',
    entityId: id,
    meta: { name: `${existing.firstName} ${existing.lastName}` },
  });

  return { message: 'Contact soft-deleted successfully' };
}

export async function bulkContactAction(payload, user) {
  const { action, contactIds } = payload;

  // Enforce ownership scoping: only mutate contacts the current user has access to
  const scopedFilter = {
    id: { in: contactIds },
    deletedAt: null,
    ...scopeByOwner(user, 'ownerId'),
  };

  const eligibleContacts = await prisma.contact.findMany({
    where: scopedFilter,
    select: { id: true },
  });

  const eligibleIds = eligibleContacts.map((c) => c.id);

  if (eligibleIds.length === 0) {
    throw ApiError.badRequest('No accessible contacts found for this bulk operation');
  }

  let resultMeta = {};

  switch (action) {
    case 'assign_owner': {
      await prisma.contact.updateMany({
        where: { id: { in: eligibleIds } },
        data: { ownerId: payload.ownerId },
      });
      resultMeta = { updatedCount: eligibleIds.length, ownerId: payload.ownerId };
      break;
    }

    case 'add_tag': {
      // Upsert tags for all eligible contacts
      for (const contactId of eligibleIds) {
        await prisma.contactTag.upsert({
          where: { contactId_tagId: { contactId, tagId: payload.tagId } },
          update: {},
          create: { contactId, tagId: payload.tagId },
        });
      }
      resultMeta = { taggedCount: eligibleIds.length, tagId: payload.tagId };
      break;
    }

    case 'remove_tag': {
      const removed = await prisma.contactTag.deleteMany({
        where: {
          contactId: { in: eligibleIds },
          tagId: payload.tagId,
        },
      });
      resultMeta = { removedCount: removed.count, tagId: payload.tagId };
      break;
    }

    case 'delete': {
      await prisma.contact.updateMany({
        where: { id: { in: eligibleIds } },
        data: { deletedAt: new Date() },
      });
      resultMeta = { deletedCount: eligibleIds.length };
      break;
    }
  }

  await createAuditLog({
    userId: user.id,
    action: `BULK_CONTACT_${action.toUpperCase()}`,
    entity: 'Contact',
    entityId: 'BULK',
    meta: { affectedCount: eligibleIds.length, ...resultMeta },
  });

  return {
    message: `Bulk ${action.replace('_', ' ')} completed successfully on ${eligibleIds.length} contact(s)`,
    affectedCount: eligibleIds.length,
  };
}

export async function updateContactLastContactedAt(contactId, timestamp = new Date()) {
  try {
    return await prisma.contact.update({
      where: { id: contactId },
      data: { lastContactedAt: timestamp },
    });
  } catch {
    return null;
  }
}

export default {
  getContacts,
  getContactById,
  getContactOverview,
  createContact,
  updateContact,
  deleteContact,
  bulkContactAction,
  updateContactLastContactedAt,
};
