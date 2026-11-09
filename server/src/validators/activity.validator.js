import { z } from 'zod';

export const createActivitySchema = z
  .object({
    type: z.enum(['CALL', 'EMAIL', 'MEETING', 'NOTE'], {
      errorMap: () => ({ message: 'Activity type must be one of CALL, EMAIL, MEETING, NOTE' }),
    }),
    subject: z.string().trim().min(1, 'Subject is required').max(200),
    body: z.string().trim().optional().nullable(),
    outcome: z.string().trim().optional().nullable(),
    durationMinutes: z.coerce.number().int().min(0).optional().nullable(),
    occurredAt: z.coerce.date().default(() => new Date()),
    contactId: z.string().uuid('Invalid contact ID').optional().nullable(),
    companyId: z.string().uuid('Invalid company ID').optional().nullable(),
    leadId: z.string().uuid('Invalid lead ID').optional().nullable(),
  })
  .refine((data) => data.contactId || data.companyId || data.leadId, {
    message: 'At least one link (contactId, companyId, or leadId) must be provided',
  });

export const updateActivitySchema = z.object({
  type: z.enum(['CALL', 'EMAIL', 'MEETING', 'NOTE']).optional(),
  subject: z.string().trim().min(1, 'Subject cannot be empty').max(200).optional(),
  body: z.string().trim().optional().nullable(),
  outcome: z.string().trim().optional().nullable(),
  durationMinutes: z.coerce.number().int().min(0).optional().nullable(),
  occurredAt: z.coerce.date().optional(),
});

export const getActivitiesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  type: z.enum(['CALL', 'EMAIL', 'MEETING', 'NOTE', 'SYSTEM']).optional(),
  createdById: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  search: z.string().optional(),
});

export const getTimelineQuerySchema = z
  .object({
    contactId: z.string().uuid('Invalid contactId').optional(),
    companyId: z.string().uuid('Invalid companyId').optional(),
    leadId: z.string().uuid('Invalid leadId').optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .refine((data) => data.contactId || data.companyId || data.leadId, {
    message: 'At least one query parameter of contactId, companyId, or leadId is required',
  });

export default {
  createActivitySchema,
  updateActivitySchema,
  getActivitiesQuerySchema,
  getTimelineQuerySchema,
};
