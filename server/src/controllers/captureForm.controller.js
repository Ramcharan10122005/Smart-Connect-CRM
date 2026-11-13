import prisma from '../config/prisma.js';
import { successResponse } from '../utils/response.js';
import { ApiError } from '../utils/ApiError.js';

export async function getCaptureForms(req, res) {
  let forms = await prisma.captureForm.findMany({
    include: {
      defaultSource: { select: { id: true, name: true } },
      defaultOwner: { select: { id: true, name: true, email: true } },
    },
  });

  if (forms.length === 0) {
    const defaultForm = await prisma.captureForm.create({
      data: {
        key: 'default-inbound-lead-form',
        name: 'Default Inbound Lead Capture',
        isActive: true,
      },
      include: {
        defaultSource: { select: { id: true, name: true } },
        defaultOwner: { select: { id: true, name: true, email: true } },
      },
    });
    forms = [defaultForm];
  }

  return successResponse(res, forms);
}

export async function updateCaptureForm(req, res) {
  const { id } = req.params;
  const { name, defaultSourceId, defaultOwnerId, isActive } = req.body;

  const form = await prisma.captureForm.findUnique({ where: { id } });
  if (!form) {
    throw ApiError.notFound('Capture form not found');
  }

  const updated = await prisma.captureForm.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(defaultSourceId !== undefined ? { defaultSourceId: defaultSourceId || null } : {}),
      ...(defaultOwnerId !== undefined ? { defaultOwnerId: defaultOwnerId || null } : {}),
      ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
    },
    include: {
      defaultSource: { select: { id: true, name: true } },
      defaultOwner: { select: { id: true, name: true, email: true } },
    },
  });

  return successResponse(res, updated);
}

export default {
  getCaptureForms,
  updateCaptureForm,
};

