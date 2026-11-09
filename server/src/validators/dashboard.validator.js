import { z } from 'zod';

export const dashboardQuerySchema = z.object({
  ownerId: z.string().uuid('Invalid ownerId format').optional(),
});

export default {
  dashboardQuerySchema,
};
