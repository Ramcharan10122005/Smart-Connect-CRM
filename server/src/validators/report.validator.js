import { z } from 'zod';

export const reportQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  ownerId: z.string().uuid('Invalid ownerId format').optional(),
  format: z.enum(['json', 'csv']).optional(),
});

export default {
  reportQuerySchema,
};
