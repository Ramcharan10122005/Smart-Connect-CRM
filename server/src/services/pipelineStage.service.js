import prisma from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { createAuditLog } from './audit.service.js';

export async function getPipelineStages() {
  return prisma.pipelineStage.findMany({
    orderBy: { position: 'asc' },
    include: {
      _count: {
        select: { leads: { where: { deletedAt: null } } },
      },
    },
  });
}

export async function createPipelineStage(data, user) {
  let position = data.position;

  if (!position) {
    const highest = await prisma.pipelineStage.findFirst({
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    position = (highest?.position || 0) + 1;
  }

  const stage = await prisma.pipelineStage.create({
    data: {
      name: data.name,
      position,
      probability: data.probability,
      type: data.type,
      color: data.color,
    },
  });

  await createAuditLog({
    userId: user.id,
    action: 'PIPELINE_STAGE_CREATED',
    entity: 'PipelineStage',
    entityId: stage.id,
    meta: { name: stage.name, position, probability: stage.probability },
  });

  return stage;
}

export async function updatePipelineStage(id, data, user) {
  const existing = await prisma.pipelineStage.findUnique({ where: { id } });
  if (!existing) {
    throw ApiError.notFound('Pipeline stage not found');
  }

  const updated = await prisma.pipelineStage.update({
    where: { id },
    data,
  });

  await createAuditLog({
    userId: user.id,
    action: 'PIPELINE_STAGE_UPDATED',
    entity: 'PipelineStage',
    entityId: id,
    meta: { previousName: existing.name, updatedName: updated.name },
  });

  return updated;
}

export async function reorderPipelineStages(stageIds, user) {
  const operations = stageIds.map((id, index) =>
    prisma.pipelineStage.update({
      where: { id },
      data: { position: index + 1 },
    })
  );

  await prisma.$transaction(operations);

  await createAuditLog({
    userId: user.id,
    action: 'PIPELINE_STAGES_REORDERED',
    entity: 'PipelineStage',
    entityId: 'ALL',
    meta: { orderedIds: stageIds },
  });

  return getPipelineStages();
}

export async function deletePipelineStage(id, targetStageId, user) {
  const stage = await prisma.pipelineStage.findUnique({
    where: { id },
    include: {
      _count: { select: { leads: { where: { deletedAt: null } } } },
    },
  });

  if (!stage) {
    throw ApiError.notFound('Pipeline stage not found');
  }

  const activeLeadsCount = stage._count.leads;

  if (activeLeadsCount > 0) {
    if (!targetStageId) {
      throw ApiError.badRequest(
        `Stage "${stage.name}" currently contains ${activeLeadsCount} active lead(s). Please specify a targetStageId to reassign them before deleting.`
      );
    }

    if (targetStageId === id) {
      throw ApiError.badRequest('Target stage ID cannot be the same as the stage being deleted');
    }

    const targetStage = await prisma.pipelineStage.findUnique({
      where: { id: targetStageId },
    });

    if (!targetStage) {
      throw ApiError.notFound('Target reassignment stage not found');
    }

    // Reassign leads to target stage in transaction before deleting
    await prisma.$transaction([
      prisma.lead.updateMany({
        where: { stageId: id, deletedAt: null },
        data: { stageId: targetStageId },
      }),
      prisma.pipelineStage.delete({ where: { id } }),
    ]);
  } else {
    // Stage has 0 active leads, delete directly
    await prisma.pipelineStage.delete({ where: { id } });
  }

  await createAuditLog({
    userId: user.id,
    action: 'PIPELINE_STAGE_DELETED',
    entity: 'PipelineStage',
    entityId: id,
    meta: { name: stage.name, reassignedTo: targetStageId || null },
  });

  return { message: `Pipeline stage "${stage.name}" deleted successfully` };
}

export default {
  getPipelineStages,
  createPipelineStage,
  updatePipelineStage,
  reorderPipelineStages,
  deletePipelineStage,
};
