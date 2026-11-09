import { z } from 'zod';

export const createFollowUpSchema = z.object({
  title: z.string().trim().min(1, 'Follow-up title is required').max(200),
  description: z.string().trim().optional().nullable(),
  dueAt: z.coerce.date({ required_error: 'dueAt is required' }),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  assigneeId: z.string().uuid('Invalid assignee ID').optional().nullable(),
  contactId: z.string().uuid('Invalid contact ID').optional().nullable(),
  leadId: z.string().uuid('Invalid lead ID').optional().nullable(),
  recurrence: z.enum(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY']).default('NONE'),
});

export const updateFollowUpSchema = createFollowUpSchema.partial();

export const completeFollowUpSchema = z.object({
  logActivity: z.boolean().default(false),
  note: z.string().trim().optional(),
});

export const snoozeFollowUpSchema = z
  .object({
    until: z.coerce.date().optional(),
    preset: z.enum(['1_hour', 'tomorrow_9am', 'next_week']).optional(),
  })
  .refine((data) => data.until || data.preset, {
    message:
      'Either an exact "until" timestamp or a "preset" (1_hour, tomorrow_9am, next_week) is required',
  });

export const reassignFollowUpSchema = z.object({
  assigneeId: z.string().uuid('A valid assigneeId is required'),
});

export const getFollowUpsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc', 'ASC', 'DESC']).optional(),
  assigneeId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'DONE', 'SNOOZED', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  contactId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  dueFrom: z.coerce.date().optional(),
  dueTo: z.coerce.date().optional(),
  view: z.enum(['today', 'upcoming', 'overdue', 'completed']).optional(),
});

export default {
  createFollowUpSchema,
  updateFollowUpSchema,
  completeFollowUpSchema,
  snoozeFollowUpSchema,
  reassignFollowUpSchema,
  getFollowUpsQuerySchema,
};
