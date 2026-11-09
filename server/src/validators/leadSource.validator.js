import { z } from 'zod';

export const createLeadSourceSchema = z.object({
  name: z.string().trim().min(1, 'Source name is required').max(60),
  isActive: z.boolean().default(true),
});

export const updateLeadSourceSchema = createLeadSourceSchema.partial();

export default {
  createLeadSourceSchema,
  updateLeadSourceSchema,
};
