import prisma from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { createAuditLog } from './audit.service.js';

export async function createTemplate(data, user) {
  const existing = await prisma.emailTemplate.findUnique({
    where: { name: data.name },
  });

  if (existing) {
    throw ApiError.badRequest(`Template with name "${data.name}" already exists`);
  }

  const template = await prisma.emailTemplate.create({
    data: {
      name: data.name,
      subject: data.subject,
      body: data.body,
      createdById: user.id,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  await createAuditLog({
    userId: user.id,
    action: 'EMAIL_TEMPLATE_CREATED',
    entity: 'EmailTemplate',
    entityId: template.id,
    meta: { name: template.name },
  });

  return template;
}

export async function getTemplates() {
  return prisma.emailTemplate.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function getTemplateById(id) {
  const template = await prisma.emailTemplate.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!template) {
    throw ApiError.notFound('Email template not found');
  }

  return template;
}

export async function updateTemplate(id, data, user) {
  const template = await prisma.emailTemplate.findUnique({ where: { id } });

  if (!template) {
    throw ApiError.notFound('Email template not found');
  }

  if (data.name && data.name !== template.name) {
    const existing = await prisma.emailTemplate.findUnique({
      where: { name: data.name },
    });
    if (existing && existing.id !== id) {
      throw ApiError.badRequest(`Template with name "${data.name}" already exists`);
    }
  }

  const updated = await prisma.emailTemplate.update({
    where: { id },
    data: {
      name: data.name !== undefined ? data.name : template.name,
      subject: data.subject !== undefined ? data.subject : template.subject,
      body: data.body !== undefined ? data.body : template.body,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  await createAuditLog({
    userId: user.id,
    action: 'EMAIL_TEMPLATE_UPDATED',
    entity: 'EmailTemplate',
    entityId: updated.id,
    meta: { name: updated.name },
  });

  return updated;
}

export async function deleteTemplate(id, user) {
  const template = await prisma.emailTemplate.findUnique({ where: { id } });

  if (!template) {
    throw ApiError.notFound('Email template not found');
  }

  await prisma.emailTemplate.delete({ where: { id } });

  await createAuditLog({
    userId: user.id,
    action: 'EMAIL_TEMPLATE_DELETED',
    entity: 'EmailTemplate',
    entityId: id,
    meta: { name: template.name },
  });

  return { message: 'Template deleted successfully' };
}

export default {
  createTemplate,
  getTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
};

