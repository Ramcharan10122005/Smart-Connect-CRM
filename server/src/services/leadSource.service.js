import prisma from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { createAuditLog } from './audit.service.js';

export async function getLeadSources() {
  return prisma.leadSource.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { leads: { where: { deletedAt: null } }, contacts: { where: { deletedAt: null } } },
      },
    },
  });
}

export async function createLeadSource(data, user) {
  const existing = await prisma.leadSource.findUnique({
    where: { name: data.name },
  });

  if (existing) {
    throw ApiError.conflict(`Lead source "${data.name}" already exists`);
  }

  const source = await prisma.leadSource.create({
    data,
  });

  await createAuditLog({
    userId: user.id,
    action: 'LEAD_SOURCE_CREATED',
    entity: 'LeadSource',
    entityId: source.id,
    meta: { name: source.name },
  });

  return source;
}

export async function updateLeadSource(id, data, user) {
  const existing = await prisma.leadSource.findUnique({ where: { id } });
  if (!existing) {
    throw ApiError.notFound('Lead source not found');
  }

  if (data.name && data.name !== existing.name) {
    const duplicate = await prisma.leadSource.findUnique({ where: { name: data.name } });
    if (duplicate) {
      throw ApiError.conflict(`Lead source "${data.name}" already exists`);
    }
  }

  const updated = await prisma.leadSource.update({
    where: { id },
    data,
  });

  await createAuditLog({
    userId: user.id,
    action: 'LEAD_SOURCE_UPDATED',
    entity: 'LeadSource',
    entityId: id,
    meta: { previousName: existing.name, updatedName: updated.name },
  });

  return updated;
}

export async function deleteLeadSource(id, user) {
  const existing = await prisma.leadSource.findUnique({
    where: { id },
    include: {
      _count: {
        select: { leads: { where: { deletedAt: null } }, contacts: { where: { deletedAt: null } } },
      },
    },
  });

  if (!existing) {
    throw ApiError.notFound('Lead source not found');
  }

  if (existing._count.leads > 0 || existing._count.contacts > 0) {
    // Soft toggle to inactive instead of hard deleting records with active foreign keys
    await prisma.leadSource.update({
      where: { id },
      data: { isActive: false },
    });
    return { message: 'Lead source is referenced by existing records and has been deactivated' };
  }

  await prisma.leadSource.delete({ where: { id } });

  await createAuditLog({
    userId: user.id,
    action: 'LEAD_SOURCE_DELETED',
    entity: 'LeadSource',
    entityId: id,
    meta: { name: existing.name },
  });

  return { message: 'Lead source deleted successfully' };
}

export default {
  getLeadSources,
  createLeadSource,
  updateLeadSource,
  deleteLeadSource,
};
