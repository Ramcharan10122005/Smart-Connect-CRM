import prisma from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { scopeByOwner } from '../utils/scope.js';

export async function getTags() {
  return prisma.tag.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          contactTags: true,
          companyTags: true,
        },
      },
    },
  });
}

export async function createTag(data) {
  const existing = await prisma.tag.findUnique({
    where: { name: data.name },
  });
  if (existing) {
    throw ApiError.conflict(`Tag with name "${data.name}" already exists`);
  }
  return prisma.tag.create({ data });
}

export async function updateTag(id, data) {
  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag) {
    throw ApiError.notFound('Tag not found');
  }

  if (data.name && data.name !== tag.name) {
    const existing = await prisma.tag.findUnique({ where: { name: data.name } });
    if (existing) {
      throw ApiError.conflict(`Tag with name "${data.name}" already exists`);
    }
  }

  return prisma.tag.update({
    where: { id },
    data,
  });
}

export async function deleteTag(id) {
  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag) {
    throw ApiError.notFound('Tag not found');
  }
  return prisma.tag.delete({ where: { id } });
}

export async function attachTagToContact(contactId, { tagId, name, color }, user) {
  // Ensure contact exists and satisfies scope
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, deletedAt: null, ...scopeByOwner(user) },
  });
  if (!contact) {
    throw ApiError.notFound('Contact not found');
  }

  let finalTagId = tagId;
  if (!finalTagId && name) {
    let tag = await prisma.tag.findUnique({ where: { name } });
    if (!tag) {
      tag = await prisma.tag.create({
        data: { name, color: color || '#6366F1' },
      });
    }
    finalTagId = tag.id;
  }

  await prisma.contactTag.upsert({
    where: { contactId_tagId: { contactId, tagId: finalTagId } },
    update: {},
    create: { contactId, tagId: finalTagId },
  });

  return prisma.contact.findUnique({
    where: { id: contactId },
    include: { tags: { include: { tag: true } } },
  });
}

export async function detachTagFromContact(contactId, tagId, user) {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, deletedAt: null, ...scopeByOwner(user) },
  });
  if (!contact) {
    throw ApiError.notFound('Contact not found');
  }

  await prisma.contactTag.deleteMany({
    where: { contactId, tagId },
  });

  return { message: 'Tag detached from contact successfully' };
}

export async function attachTagToCompany(companyId, { tagId, name, color }, user) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, deletedAt: null, ...scopeByOwner(user) },
  });
  if (!company) {
    throw ApiError.notFound('Company not found');
  }

  let finalTagId = tagId;
  if (!finalTagId && name) {
    let tag = await prisma.tag.findUnique({ where: { name } });
    if (!tag) {
      tag = await prisma.tag.create({
        data: { name, color: color || '#6366F1' },
      });
    }
    finalTagId = tag.id;
  }

  await prisma.companyTag.upsert({
    where: { companyId_tagId: { companyId, tagId: finalTagId } },
    update: {},
    create: { companyId, tagId: finalTagId },
  });

  return prisma.company.findUnique({
    where: { id: companyId },
    include: { tags: { include: { tag: true } } },
  });
}

export async function detachTagFromCompany(companyId, tagId, user) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, deletedAt: null, ...scopeByOwner(user) },
  });
  if (!company) {
    throw ApiError.notFound('Company not found');
  }

  await prisma.companyTag.deleteMany({
    where: { companyId, tagId },
  });

  return { message: 'Tag detached from company successfully' };
}

export default {
  getTags,
  createTag,
  updateTag,
  deleteTag,
  attachTagToContact,
  detachTagFromContact,
  attachTagToCompany,
  detachTagFromCompany,
};
