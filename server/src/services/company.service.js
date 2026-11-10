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

export async function bulkCompanyAction(payload, user) {
  const { action, companyIds } = payload;

  const scopedFilter = {
    id: { in: companyIds },
    deletedAt: null,
    ...scopeByOwner(user, 'ownerId'),
  };

  const eligibleCompanies = await prisma.company.findMany({
    where: scopedFilter,
    select: { id: true },
  });

  const eligibleIds = eligibleCompanies.map((c) => c.id);

  if (eligibleIds.length === 0) {
    throw ApiError.badRequest('No accessible companies found for this bulk operation');
  }

  let resultMeta = {};

  switch (action) {
    case 'assign_owner': {
      await prisma.company.updateMany({
        where: { id: { in: eligibleIds } },
        data: { ownerId: payload.ownerId },
      });
      resultMeta = { updatedCount: eligibleIds.length, ownerId: payload.ownerId };
      break;
    }

    case 'add_tag': {
      for (const companyId of eligibleIds) {
        await prisma.companyTag.upsert({
          where: { companyId_tagId: { companyId, tagId: payload.tagId } },
          update: {},
          create: { companyId, tagId: payload.tagId },
        });
      }
      resultMeta = { taggedCount: eligibleIds.length, tagId: payload.tagId };
      break;
    }

    case 'remove_tag': {
      const removed = await prisma.companyTag.deleteMany({
        where: {
          companyId: { in: eligibleIds },
          tagId: payload.tagId,
        },
      });
      resultMeta = { removedCount: removed.count, tagId: payload.tagId };
      break;
    }

    case 'delete': {
      await prisma.company.updateMany({
        where: { id: { in: eligibleIds } },
        data: { deletedAt: new Date() },
      });
      resultMeta = { deletedCount: eligibleIds.length };
      break;
    }
  }

  await createAuditLog({
    userId: user.id,
    action: `BULK_COMPANY_${action.toUpperCase()}`,
    entity: 'Company',
    entityId: 'BULK',
    meta: { affectedCount: eligibleIds.length, ...resultMeta },
  });

  return {
    message: `Bulk ${action.replace('_', ' ')} completed successfully on ${eligibleIds.length} company(ies)`,
    affectedCount: eligibleIds.length,
  };
}

export async function getCompaniesForExport(query, user) {
  const where = {
    deletedAt: null,
    ...scopeByOwner(user, 'ownerId'),
  };

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { domain: { contains: query.search, mode: 'insensitive' } },
      { phone: { contains: query.search, mode: 'insensitive' } },
      { city: { contains: query.search, mode: 'insensitive' } },
      { state: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  if (query.ownerId) {
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
    where.tags = { some: { tagId: query.tagId } };
  }

  const companies = await prisma.company.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      owner: { select: { name: true } },
      _count: { select: { contacts: true, leads: true } },
    },
  });

  return companies;
}

export const companyExportColumns = [
  { header: 'Name', key: 'name' },
  { header: 'Domain', key: 'domain' },
  { header: 'Industry', key: 'industry' },
  { header: 'Size', key: 'size' },
  { header: 'Website', key: 'website' },
  { header: 'Phone', key: 'phone' },
  { header: 'City', key: 'city' },
  { header: 'State', key: 'state' },
  { header: 'Country', key: 'country' },
  { header: 'Contacts Count', value: (c) => c._count?.contacts || 0 },
  { header: 'Leads Count', value: (c) => c._count?.leads || 0 },
  { header: 'Owner', value: (c) => c.owner?.name || '' },
  { header: 'Created At', key: 'createdAt' },
];

export default {
  getCompanies,
  getCompanyById,
  getCompanyOverview,
  createCompany,
  updateCompany,
  deleteCompany,
  bulkCompanyAction,
  getCompaniesForExport,
  companyExportColumns,
};
