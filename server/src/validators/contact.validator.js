import { z } from 'zod';

export const createContactSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(60),
  lastName: z.string().trim().min(1, 'Last name is required').max(60),
  email: z
    .string()
    .trim()
    .email('Invalid email address')
    .toLowerCase()
    .optional()
    .nullable()
    .or(z.literal('')),
  phone: z.string().trim().optional().nullable(),
  jobTitle: z.string().trim().optional().nullable(),
  companyId: z.string().uuid('Invalid company ID').optional().nullable(),
  ownerId: z.string().uuid('Invalid owner ID').optional().nullable(),
  lifecycleStage: z.enum(['PROSPECT', 'CUSTOMER', 'INACTIVE']).default('PROSPECT'),
  sourceId: z.string().uuid('Invalid source ID').optional().nullable(),
  addressLine1: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  state: z.string().trim().optional().nullable(),
  country: z.string().trim().optional().nullable(),
  postalCode: z.string().trim().optional().nullable(),
  linkedinUrl: z
    .string()
    .trim()
    .url('Invalid LinkedIn URL')
    .optional()
    .nullable()
    .or(z.literal('')),
  notes: z.string().trim().optional().nullable(),
  tagIds: z.array(z.string().uuid()).optional(),
  force: z.boolean().optional(),
});

export const updateContactSchema = createContactSchema.partial();

export const getContactsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc', 'ASC', 'DESC']).optional(),
  search: z.string().optional(),
  ownerId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  sourceId: z.string().uuid().optional(),
  tagId: z.string().uuid().optional(),
  lifecycleStage: z.enum(['PROSPECT', 'CUSTOMER', 'INACTIVE']).optional(),
  createdFrom: z.coerce.date().optional(),
  createdTo: z.coerce.date().optional(),
});

export const bulkContactActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('assign_owner'),
    contactIds: z.array(z.string().uuid()).min(1, 'At least one contact ID required'),
    ownerId: z.string().uuid('Valid owner ID required'),
  }),
  z.object({
    action: z.literal('add_tag'),
    contactIds: z.array(z.string().uuid()).min(1, 'At least one contact ID required'),
    tagId: z.string().uuid('Valid tag ID required'),
  }),
  z.object({
    action: z.literal('remove_tag'),
    contactIds: z.array(z.string().uuid()).min(1, 'At least one contact ID required'),
    tagId: z.string().uuid('Valid tag ID required'),
  }),
  z.object({
    action: z.literal('delete'),
    contactIds: z.array(z.string().uuid()).min(1, 'At least one contact ID required'),
  }),
]);

export default {
  createContactSchema,
  updateContactSchema,
  getContactsQuerySchema,
  bulkContactActionSchema,
};
