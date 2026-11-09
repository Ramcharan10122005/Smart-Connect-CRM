import { z } from 'zod';

export const createStageSchema = z.object({
  name: z.string().trim().min(1, 'Stage name is required').max(60),
  position: z.coerce.number().int().min(1).optional(),
  probability: z.coerce.number().int().min(0).max(100).default(0),
  type: z.enum(['OPEN', 'WON', 'LOST']).default('OPEN'),
  color: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Color must be a valid hex code (e.g. #3B82F6)')
    .default('#3B82F6'),
});

export const updateStageSchema = createStageSchema.partial();

export const reorderStagesSchema = z.object({
  stageIds: z
    .array(z.string().uuid('Invalid stage ID in stageIds array'))
    .min(1, 'At least one stage ID required'),
});

export const deleteStageQuerySchema = z.object({
  targetStageId: z.string().uuid('Invalid targetStageId').optional(),
});

export default {
  createStageSchema,
  updateStageSchema,
  reorderStagesSchema,
  deleteStageQuerySchema,
};
