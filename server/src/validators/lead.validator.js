import { z } from 'zod';

export const createLeadSchema = z.object({
  title: z.string().trim().min(1, 'Lead title is required').max(150),
  firstName: z.string().trim().optional().nullable(),
  lastName: z.string().trim().optional().nullable(),
  email: z
    .string()
    .trim()
    .email('Invalid email address')
    .toLowerCase()
    .optional()
    .nullable()
    .or(z.literal('')),
  phone: z.string().trim().optional().nullable(),
  companyName: z.string().trim().optional().nullable(),
  companyId: z.string().uuid('Invalid company ID').optional().nullable(),
  contactId: z.string().uuid('Invalid contact ID').optional().nullable(),
  value: z.coerce.number().min(0, 'Value must be positive').default(0),
  currency: z.string().trim().default('USD'),
  sourceId: z.string().uuid('Invalid source ID').optional().nullable(),
  stageId: z.string().uuid('Valid stage ID is required'),
  ownerId: z.string().uuid('Invalid owner ID').optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  expectedCloseDate: z.coerce.date().optional().nullable(),
  lostReason: z.string().trim().optional().nullable(),
});

export const updateLeadSchema = createLeadSchema.partial();

export const moveStageSchema = z.object({
  stageId: z.string().uuid('Valid target stage ID is required'),
  lostReason: z.string().trim().optional(),
});

export const convertLeadSchema = z.object({
  dealName: z.string().trim().optional(),
  companyName: z.string().trim().optional(),
});

export const getLeadsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc', 'ASC', 'DESC']).optional(),
  search: z.string().optional(),
  stageId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  sourceId: z.string().uuid().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['OPEN', 'WON', 'LOST']).optional(),
  minValue: z.coerce.number().optional(),
  maxValue: z.coerce.number().optional(),
  expectedCloseDateFrom: z.coerce.date().optional(),
  expectedCloseDateTo: z.coerce.date().optional(),
});

export const getBoardQuerySchema = z.object({
  search: z.string().optional(),
  ownerId: z.string().uuid().optional(),
  sourceId: z.string().uuid().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['OPEN', 'WON', 'LOST']).optional(),
  minValue: z.coerce.number().optional(),
  maxValue: z.coerce.number().optional(),
  expectedCloseDateFrom: z.coerce.date().optional(),
  expectedCloseDateTo: z.coerce.date().optional(),
});

export default {
  createLeadSchema,
  updateLeadSchema,
  moveStageSchema,
  convertLeadSchema,
  getLeadsQuerySchema,
  getBoardQuerySchema,
};
