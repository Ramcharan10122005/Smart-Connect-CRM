import { z } from 'zod';

export const createAutomationRuleSchema = z.object({
  name: z.string().trim().min(1, 'Rule name is required').max(100),
  trigger: z.enum([
    'LEAD_CREATED',
    'LEAD_STAGE_CHANGED',
    'LEAD_STALE_IN_STAGE',
    'FOLLOWUP_OVERDUE',
    'CONTACT_CREATED',
  ]),
  conditions: z.record(z.any()).optional().default({}),
  action: z.enum([
    'CREATE_FOLLOWUP',
    'SEND_EMAIL_TEMPLATE',
    'ASSIGN_OWNER',
    'ADD_TAG',
    'NOTIFY_USER',
  ]),
  actionConfig: z.record(z.any()).optional().default({}),
  isActive: z.boolean().optional().default(true),
});

export const updateAutomationRuleSchema = z.object({
  name: z.string().trim().min(1, 'Rule name cannot be empty').max(100).optional(),
  trigger: z
    .enum([
      'LEAD_CREATED',
      'LEAD_STAGE_CHANGED',
      'LEAD_STALE_IN_STAGE',
      'FOLLOWUP_OVERDUE',
      'CONTACT_CREATED',
    ])
    .optional(),
  conditions: z.record(z.any()).optional(),
  action: z
    .enum([
      'CREATE_FOLLOWUP',
      'SEND_EMAIL_TEMPLATE',
      'ASSIGN_OWNER',
      'ADD_TAG',
      'NOTIFY_USER',
    ])
    .optional(),
  actionConfig: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
});

export default {
  createAutomationRuleSchema,
  updateAutomationRuleSchema,
};

