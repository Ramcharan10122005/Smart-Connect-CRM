import prisma from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { scopeByOwner } from '../utils/scope.js';
import { parsePaginationParams, buildPaginationMeta } from '../utils/queryHelper.js';
import { createAuditLog } from './audit.service.js';

export async function getCompanies(query, user) {
  const { page, limit, skip, take, orderBy, search } = parsePaginationParams(query, 'name');

  const where = {
    deletedAt: null,
    ...scopeByOwner(user, 'ownerId'),
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { domain: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
      { state: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (query.ownerId) {
    // If REP, only allow filtering by their own ID
    if (user.role === 'REP' && query.ownerId !== user.id) {
      where.ownerId = '__UNAUTHORIZED__';
    } else {
      where.ownerId = query.ownerId;
    }
  }

  if (query.industry) {
    where.industry = { equals: query.industry, mode: 'insensitive' };
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

  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        tags: {
          include: { tag: true },
        },
        _count: {
          select: { contacts: true, leads: true },
        },
      },
    }),
    prisma.company.count({ where }),
  ]);

  const meta = buildPaginationMeta(total, page, limit);

  return { companies, meta };
}

export async function getCompanyById(id, user) {
  const company = await prisma.company.findFirst({
    where: {
      id,
      deletedAt: null,
      ...scopeByOwner(user, 'ownerId'),
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
      tags: {
        include: { tag: true },
      },
      contacts: {
        where: { deletedAt: null },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          jobTitle: true,
        },
      },
      leads: {
        where: { deletedAt: null },
        select: { id: true, title: true, value: true, status: true, stageId: true },
      },
    },
  });

  if (!company) {
    throw ApiError.notFound('Company not found or access denied');
  }

  return company;
}

export async function getCompanyOverview(id, user) {
  const company = await prisma.company.findFirst({
    where: {
      id,
      deletedAt: null,
      ...scopeByOwner(user, 'ownerId'),
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
      tags: {
        include: { tag: true },
      },
      contacts: {
        where: { deletedAt: null },
        orderBy: { lastName: 'asc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          jobTitle: true,
          lifecycleStage: true,
          lastContactedAt: true,
        },
      },
      leads: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: {
          stage: { select: { id: true, name: true, color: true, type: true } },
          owner: { select: { id: true, name: true } },
        },
      },
      activities: {
        take: 20,
        orderBy: { occurredAt: 'desc' },
        include: {
          createdBy: { select: { id: true, name: true, avatarUrl: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!company) {
    throw ApiError.notFound('Company not found or access denied');
  }

  return company;
}

export async function createCompany(data, user) {
  const ownerId = data.ownerId || (user.role === 'REP' ? user.id : user.id);
  const { tagIds, ...fields } = data;

  const company = await prisma.company.create({
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
      owner: { select: { id: true, name: true, email: true } },
      tags: { include: { tag: true } },
    },
  });

  await createAuditLog({
    userId: user.id,
    action: 'COMPANY_CREATED',
    entity: 'Company',
    entityId: company.id,
    meta: { name: company.name, ownerId },
  });

  return company;
}

export async function updateCompany(id, data, user) {
  const existing = await prisma.company.findFirst({
    where: {
      id,
      deletedAt: null,
      ...scopeByOwner(user, 'ownerId'),
    },
  });

  if (!existing) {
    throw ApiError.notFound('Company not found or access denied');
  }

  const { tagIds, ...fields } = data;

  const updated = await prisma.company.update({
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
      owner: { select: { id: true, name: true, email: true } },
      tags: { include: { tag: true } },
    },
  });

  await createAuditLog({
    userId: user.id,
    action: 'COMPANY_UPDATED',
    entity: 'Company',
    entityId: id,
    meta: { previousName: existing.name, updatedName: updated.name },
  });

  return updated;
}

export async function deleteCompany(id, user) {
  const existing = await prisma.company.findFirst({
    where: {
      id,
      deletedAt: null,
      ...scopeByOwner(user, 'ownerId'),
    },
  });

  if (!existing) {
    throw ApiError.notFound('Company not found or access denied');
  }

  await prisma.company.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await createAuditLog({
    userId: user.id,
    action: 'COMPANY_DELETED',
    entity: 'Company',
    entityId: id,
    meta: { name: existing.name },
  });

  return { message: 'Company soft-deleted successfully' };
}

export default {
  getCompanies,
  getCompanyById,
  getCompanyOverview,
  createCompany,
  updateCompany,
  deleteCompany,
};
