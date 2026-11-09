import { z } from 'zod';

export const createTagSchema = z.object({
  name: z.string().trim().min(1, 'Tag name is required').max(50),
  color: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Color must be a valid hex code (e.g. #4F46E5)')
    .default('#4F46E5'),
});

export const updateTagSchema = z.object({
  name: z.string().trim().min(1, 'Tag name is required').max(50).optional(),
  color: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Color must be a valid hex code')
    .optional(),
});

export const attachTagSchema = z
  .object({
    tagId: z.string().uuid('Invalid tag ID').optional(),
    name: z.string().trim().min(1).optional(),
    color: z
      .string()
      .trim()
      .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
      .optional(),
  })
  .refine((data) => data.tagId || data.name, {
    message: 'Either tagId or tagName must be provided',
  });

export default {
  createTagSchema,
  updateTagSchema,
  attachTagSchema,
};
