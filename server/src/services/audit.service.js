import prisma from '../config/prisma.js';
import { logger } from '../utils/logger.js';

export async function createAuditLog({ userId, action, entity, entityId, meta = null }) {
  try {
    return await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entity,
        entityId: String(entityId),
        meta: meta || undefined,
      },
    });
  } catch (error) {
    // Non-blocking: Audit log failure should be logged without crashing the main mutation
    logger.error({ error, userId, action, entity, entityId }, 'Failed to record audit log entry');
    return null;
  }
}

export default {
  createAuditLog,
};
