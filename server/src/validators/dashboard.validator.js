import { z } from 'zod';

export const dashboardQuerySchema = z.object({
  ownerId: z.string().uuid('Invalid ownerId format').optional(),
  range: z.enum(['7d', '30d', '90d', '12m']).optional(),
});

export default {
  dashboardQuerySchema,
};
