import { z } from 'zod';

export const createEmailTemplateSchema = z.object({
  name: z.string().trim().min(1, 'Template name is required').max(100, 'Name must be 100 characters or fewer'),
  subject: z.string().trim().min(1, 'Subject is required').max(255, 'Subject must be 255 characters or fewer'),
  body: z.string().min(1, 'Template body is required'),
});

export const updateEmailTemplateSchema = z.object({
  name: z.string().trim().min(1, 'Template name cannot be empty').max(100, 'Name must be 100 characters or fewer').optional(),
  subject: z.string().trim().min(1, 'Subject cannot be empty').max(255, 'Subject must be 255 characters or fewer').optional(),
  body: z.string().min(1, 'Template body cannot be empty').optional(),
});

export const sendEmailSchema = z.object({
  to: z.string().trim().email('Valid recipient email is required'),
  subject: z.string().trim().min(1, 'Subject is required').max(255, 'Subject must be 255 characters or fewer'),
  body: z.string().min(1, 'Email body is required'),
  contactId: z.string().uuid('Invalid contact ID').optional().nullable(),
  leadId: z.string().uuid('Invalid lead ID').optional().nullable(),
  templateId: z.string().uuid('Invalid template ID').optional().nullable(),
});

export default {
  createEmailTemplateSchema,
  updateEmailTemplateSchema,
  sendEmailSchema,
};

