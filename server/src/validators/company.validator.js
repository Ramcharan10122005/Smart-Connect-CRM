import { z } from 'zod';

export const createCompanySchema = z.object({
  name: z.string().trim().min(1, 'Company name is required').max(100),
  domain: z.string().trim().toLowerCase().optional().nullable(),
  industry: z.string().trim().optional().nullable(),
  size: z.string().trim().optional().nullable(),
  website: z.string().trim().url('Invalid website URL').optional().nullable().or(z.literal('')),
  phone: z.string().trim().optional().nullable(),
  addressLine1: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  state: z.string().trim().optional().nullable(),
  country: z.string().trim().optional().nullable(),
  postalCode: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  ownerId: z.string().uuid('Invalid owner ID').optional().nullable(),
  tagIds: z.array(z.string().uuid()).optional(),
});

export const updateCompanySchema = createCompanySchema.partial();

export const getCompaniesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc', 'ASC', 'DESC']).optional(),
  search: z.string().optional(),
  ownerId: z.string().uuid().optional(),
  tagId: z.string().uuid().optional(),
  industry: z.string().optional(),
  createdFrom: z.coerce.date().optional(),
  createdTo: z.coerce.date().optional(),
});

export default {
  createCompanySchema,
  updateCompanySchema,
  getCompaniesQuerySchema,
};
