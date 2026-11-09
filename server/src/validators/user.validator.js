import { z } from 'zod';

export const inviteUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters long'),
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  role: z.enum(['ADMIN', 'MANAGER', 'REP']),
  phone: z.string().trim().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters long').optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'REP']).optional(),
  isActive: z.boolean().optional(),
  phone: z.string().trim().nullable().optional(),
  avatarUrl: z.string().url('Invalid avatar URL').nullable().optional(),
});

export const updateMeSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters long').optional(),
  phone: z.string().trim().nullable().optional(),
  avatarUrl: z.string().url('Invalid avatar URL').nullable().optional(),
  notificationPreferences: z.record(z.any()).optional(),
});

export const getUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc', 'ASC', 'DESC']).optional(),
  search: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'REP']).optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
});

export default {
  inviteUserSchema,
  updateUserSchema,
  updateMeSchema,
  getUsersQuerySchema,
};
