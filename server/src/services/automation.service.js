import prisma from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { createAuditLog } from './audit.service.js';
import { renderTemplateVariables } from '../utils/templateRenderer.js';
import * as emailSendService from './emailSend.service.js';
import { parsePaginationParams, buildPaginationMeta } from '../utils/queryHelper.js';

// Global execution safety constants
const MAX_EXECUTIONS_PER_HOUR = 100;
const MAX_CHAIN_DEPTH = 5;

// In-memory loop prevention guard for synchronous re-entry
const inFlightRules = new Set();

/**
 * Checks if a rule matches conditional criteria on the record
 */
export function matchesConditions(conditions = {}, record = {}, context = {}) {
  if (!conditions || Object.keys(conditions).length === 0) {
    return true;
  }

  // 1. Stage matching (exact stageId, stageName, or stageType)
  if (conditions.stageId) {
    const currentStageId = record.stageId || context.toStageId || context.stageId;
    if (currentStageId !== conditions.stageId) return false;
  }

  if (conditions.stageName) {
    const stageName = record.stage?.name || context.stageName || context.toStage?.name;
    if (stageName && !stageName.toLowerCase().includes(conditions.stageName.toLowerCase())) {
      return false;
    }
  }

  if (conditions.stageType) {
    const stageType = record.stage?.type || context.stageType || context.toStage?.type;
    if (stageType && stageType !== conditions.stageType) {
      return false;
    }
  }

  // 2. Source matching
  if (conditions.sourceId) {
    if (record.sourceId !== conditions.sourceId) return false;
  }

  // 3. Minimum value matching
  if (conditions.minValue !== undefined) {
    const val = Number(record.value || 0);
    if (val < Number(conditions.minValue)) return false;
  }

  return true;
}

/**
 * Checks if this rule has already been executed for this entity (Idempotency)
 */
export async function hasAlreadyExecuted(rule, entityType, entityId, record = {}, context = {}) {
  const where = {
    ruleId: rule.id,
    entityType,
    entityId,
    status: 'SUCCESS',
  };

  // For stage change events, allow execution once per target stage
  if (rule.trigger === 'LEAD_STAGE_CHANGED' && context.toStageId) {
    const logs = await prisma.automationLog.findMany({
      where,
      select: { result: true },
    });
    return logs.some((l) => l.result && l.result.toStageId === context.toStageId);
  }

  // For stale events, check if already notified during this current stage entry
  if (rule.trigger === 'LEAD_STALE_IN_STAGE') {
    const logs = await prisma.automationLog.findMany({
      where,
      select: { result: true },
    });
    const currentStageId = record.stageId || record.stage?.id || context.stageId || null;
    return logs.some((l) => l.result && (l.result.stageId === currentStageId || !currentStageId));
  }

  // General idempotency check: only fire once per record & rule
  const count = await prisma.automationLog.count({ where });
  return count > 0;
}

/**
 * Executes a specific automation rule against an entity with safety limits & loop guard
 */
export async function executeRule(rule, entityType, record, context = {}, executionChain = []) {
  if (!rule.isActive) {
    return { status: 'SKIPPED', reason: 'RULE_INACTIVE' };
  }

  const entityId = record.id;

  // 1. LOOP GUARD: Check recursion / self-triggering
  if (executionChain.includes(rule.id) || inFlightRules.has(rule.id)) {
    const errorMsg = `Loop detected: Rule "${rule.name}" (${rule.id}) attempted to trigger itself in the same execution chain.`;
    await prisma.automationLog.create({
      data: {
        ruleId: rule.id,
        entityType,
        entityId,
        status: 'FAILED',
        error: errorMsg,
        result: { loopGuard: true, executionChain },
      },
    });
    return { status: 'FAILED', error: errorMsg };
  }

  if (executionChain.length >= MAX_CHAIN_DEPTH) {
    const errorMsg = `Max execution depth (${MAX_CHAIN_DEPTH}) reached. Execution chain halted.`;
    await prisma.automationLog.create({
      data: {
        ruleId: rule.id,
        entityType,
        entityId,
        status: 'SKIPPED',
        error: errorMsg,
        result: { maxDepthReached: true, executionChain },
      },
    });
    return { status: 'SKIPPED', error: errorMsg };
  }

  // 2. RATE LIMIT: Max 100 executions per rule per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const hourExecutionCount = await prisma.automationLog.count({
    where: {
      ruleId: rule.id,
      status: 'SUCCESS',
      executedAt: { gte: oneHourAgo },
    },
  });

  if (hourExecutionCount >= MAX_EXECUTIONS_PER_HOUR) {
    const errorMsg = `Rule rate limit exceeded (${MAX_EXECUTIONS_PER_HOUR}/hour). Execution skipped.`;
    await prisma.automationLog.create({
      data: {
        ruleId: rule.id,
        entityType,
        entityId,
        status: 'SKIPPED',
        error: errorMsg,
        result: { rateLimitExceeded: true },
      },
    });
    return { status: 'SKIPPED', error: errorMsg };
  }

  // 3. IDEMPOTENCY CHECK
  const alreadyRan = await hasAlreadyExecuted(rule, entityType, entityId, record, context);
  if (alreadyRan) {
    return { status: 'SKIPPED', reason: 'ALREADY_EXECUTED' };
  }

  // 4. CONDITION MATCHING
  const conditionMatch = matchesConditions(rule.conditions, record, context);
  if (!conditionMatch) {
    return { status: 'SKIPPED', reason: 'CONDITIONS_NOT_MET' };
  }

  // Add rule to active in-flight tracking
  inFlightRules.add(rule.id);
  const nextChain = [...executionChain, rule.id];

  try {
    const result = await performAction(rule, entityType, record, context, nextChain);

    await prisma.automationLog.create({
      data: {
        ruleId: rule.id,
        entityType,
        entityId,
        status: 'SUCCESS',
        result: { ...result, toStageId: context.toStageId, stageId: record.stageId },
      },
    });

    return { status: 'SUCCESS', result };
  } catch (err) {
    await prisma.automationLog.create({
      data: {
        ruleId: rule.id,
        entityType,
        entityId,
        status: 'FAILED',
        error: err.message || 'Execution error',
      },
    });
    return { status: 'FAILED', error: err.message };
  } finally {
    inFlightRules.delete(rule.id);
  }
}

/**
 * Performs the specific action configured in the rule
 */
async function performAction(rule, entityType, record, context, _nextChain) {
  const config = rule.actionConfig || {};

  switch (rule.action) {
    case 'CREATE_FOLLOWUP': {
      const dueDays = Number(config.dueInDays || 1);
      const dueAt = new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000);
      const ownerId =
        record.ownerId || record.contact?.ownerId || context.user?.id || rule.createdById;

      const followUp = await prisma.followUp.create({
        data: {
          title: config.title || `Follow up: ${record.title || record.firstName || 'Automated task'}`,
          description: config.description || `Created by automation rule: ${rule.name}`,
          dueAt,
          priority: config.priority || 'MEDIUM',
          assigneeId: ownerId,
          createdById: rule.createdById || ownerId,
          contactId: entityType === 'Contact' ? record.id : record.contactId || null,
          leadId: entityType === 'Lead' ? record.id : null,
        },
      });

      return { action: 'CREATE_FOLLOWUP', followUpId: followUp.id, dueAt };
    }

    case 'SEND_EMAIL_TEMPLATE': {
      // Find template
      let template = null;
      if (config.templateId) {
        template = await prisma.emailTemplate.findUnique({ where: { id: config.templateId } });
      } else if (config.templateName) {
        template = await prisma.emailTemplate.findUnique({ where: { name: config.templateName } });
      }

      if (!template) {
        throw new Error(`Email template not found: ${config.templateId || config.templateName}`);
      }

      // Resolve recipient contact & email
      let contact = null;
      let toEmail = null;

      if (entityType === 'Contact') {
        contact = record;
        toEmail = record.email;
      } else if (entityType === 'Lead') {
        toEmail = record.email;
        if (record.contactId) {
          contact = await prisma.contact.findUnique({
            where: { id: record.contactId },
            include: { company: true },
          });
          toEmail = toEmail || contact?.email;
        }
      }

      if (!toEmail) {
        return { action: 'SEND_EMAIL_TEMPLATE', skipped: true, reason: 'NO_EMAIL_ADDRESS' };
      }

      if (contact && contact.emailOptOut) {
        return { action: 'SEND_EMAIL_TEMPLATE', skipped: true, reason: 'RECIPIENT_OPTED_OUT' };
      }

      const templateVars = {
        firstName: contact?.firstName || record.firstName || 'there',
        companyName: contact?.company?.name || record.companyName || record.company?.name || '',
        ownerName: record.owner?.name || context.user?.name || 'SmartConnect Team',
      };

      const renderedSubject = renderTemplateVariables(template.subject, templateVars);
      const renderedBody = renderTemplateVariables(template.body, templateVars);

      const senderUser = context.user || (rule.createdById ? await prisma.user.findUnique({ where: { id: rule.createdById } }) : null) || {
        id: rule.createdById,
        email: 'notifications@smartconnect.com',
      };

      await emailSendService.sendUserEmail(
        {
          to: toEmail,
          subject: renderedSubject,
          body: renderedBody,
          contactId: contact?.id || null,
          leadId: entityType === 'Lead' ? record.id : null,
          templateId: template.id,
        },
        senderUser
      );

      return { action: 'SEND_EMAIL_TEMPLATE', templateId: template.id, to: toEmail };
    }

    case 'ASSIGN_OWNER': {
      const userIds = Array.isArray(config.userIds) ? config.userIds.filter(Boolean) : [];
      if (userIds.length === 0) {
        throw new Error('ASSIGN_OWNER requires at least one user in userIds');
      }

      // Round-robin selection based on historical distribution
      const counts = await Promise.all(
        userIds.map(async (uid) => {
          const c = await prisma.lead.count({ where: { ownerId: uid, status: 'OPEN' } });
          return { uid, c };
        })
      );

      counts.sort((a, b) => a.c - b.c);
      const chosenUserId = counts[0].uid;

      if (entityType === 'Lead') {
        await prisma.lead.update({
          where: { id: record.id },
          data: { ownerId: chosenUserId },
        });
      } else if (entityType === 'Contact') {
        await prisma.contact.update({
          where: { id: record.id },
          data: { ownerId: chosenUserId },
        });
      }

      return { action: 'ASSIGN_OWNER', assignedTo: chosenUserId };
    }

    case 'ADD_TAG': {
      const tagId = config.tagId;
      if (!tagId) throw new Error('ADD_TAG requires tagId in config');

      const contactId = entityType === 'Contact' ? record.id : record.contactId;
      if (contactId) {
        await prisma.contactTag.upsert({
          where: {
            contactId_tagId: {
              contactId,
              tagId,
            },
          },
          create: { contactId, tagId },
          update: {},
        });
      }

      return { action: 'ADD_TAG', tagId, contactId };
    }

    case 'NOTIFY_USER': {
      let recipientUserIds = [];

      if (config.recipient === 'OWNER') {
        const ownerId = record.ownerId || record.contact?.ownerId;
        if (ownerId) recipientUserIds.push(ownerId);
      } else if (config.recipient === 'ADMINS') {
        const admins = await prisma.user.findMany({
          where: { role: 'ADMIN', isActive: true },
          select: { id: true },
        });
        recipientUserIds = admins.map((a) => a.id);
      } else if (config.userId) {
        recipientUserIds.push(config.userId);
      }

      // Fallback to rule creator if owner not set
      if (recipientUserIds.length === 0 && rule.createdById) {
        recipientUserIds.push(rule.createdById);
      }

      const entityName = record.title || `${record.firstName || ''} ${record.lastName || ''}`.trim() || 'Record';
      const title = config.title ? renderTemplateVariables(config.title, { name: entityName }) : `Notification for ${entityName}`;
      const body = config.body ? renderTemplateVariables(config.body, { name: entityName }) : `Automated alert for ${entityName}`;

      for (const uid of recipientUserIds) {
        await prisma.notification.create({
          data: {
            userId: uid,
            type: 'AUTOMATION_ALERT',
            title,
            body,
            link: entityType === 'Lead' ? `/leads?highlight=${record.id}` : `/customers/contact/${record.id}`,
          },
        });
      }

      return { action: 'NOTIFY_USER', notifiedUsers: recipientUserIds };
    }

    default:
      throw new Error(`Unsupported automation action: ${rule.action}`);
  }
}

/**
 * Fires an event trigger across all matching active rules
 */
export async function triggerEvent(triggerType, entityType, record, context = {}, executionChain = []) {
  const activeRules = await prisma.automationRule.findMany({
    where: {
      trigger: triggerType,
      isActive: true,
    },
  });

  const results = [];
  for (const rule of activeRules) {
    const res = await executeRule(rule, entityType, record, context, executionChain);
    results.push({ ruleId: rule.id, ruleName: rule.name, ...res });
  }

  return results;
}

/**
 * Hourly Cron Job: checks for stale leads in stage & overdue follow-ups
 */
export async function runScheduledAutomations() {
  const activeRules = await prisma.automationRule.findMany({
    where: {
      trigger: { in: ['LEAD_STALE_IN_STAGE', 'FOLLOWUP_OVERDUE'] },
      isActive: true,
    },
  });

  if (activeRules.length === 0) return { processed: 0 };

  let processedCount = 0;

  for (const rule of activeRules) {
    if (rule.trigger === 'LEAD_STALE_IN_STAGE') {
      const days = Number(rule.conditions?.days || 7);
      const staleThreshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Leads in stage whose updatedAt is older than staleThreshold and status is OPEN
      const where = {
        status: 'OPEN',
        updatedAt: { lte: staleThreshold },
      };

      if (rule.conditions?.stageId) {
        where.stageId = rule.conditions.stageId;
      }

      const staleLeads = await prisma.lead.findMany({
        where,
        include: { stage: true, contact: true, owner: true },
        take: 50,
      });

      for (const lead of staleLeads) {
        await executeRule(rule, 'Lead', lead, { stageId: lead.stageId, stageName: lead.stage?.name });
        processedCount++;
      }
    } else if (rule.trigger === 'FOLLOWUP_OVERDUE') {
      const days = Number(rule.conditions?.days || 1);
      const overdueThreshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const overdueFollowUps = await prisma.followUp.findMany({
        where: {
          status: 'PENDING',
          dueAt: { lte: overdueThreshold },
        },
        include: { contact: true, lead: true, assignee: true },
        take: 50,
      });

      for (const fu of overdueFollowUps) {
        await executeRule(rule, 'FollowUp', fu, { dueAt: fu.dueAt });
        processedCount++;
      }
    }
  }

  return { processed: processedCount };
}

// -----------------------------------------------------------------
// RULE CRUD METHODS
// -----------------------------------------------------------------

export async function createRule(data, user) {
  const rule = await prisma.automationRule.create({
    data: {
      name: data.name,
      isActive: data.isActive !== undefined ? data.isActive : true,
      trigger: data.trigger,
      conditions: data.conditions || {},
      action: data.action,
      actionConfig: data.actionConfig || {},
      createdById: user.id,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  await createAuditLog({
    userId: user.id,
    action: 'AUTOMATION_RULE_CREATED',
    entity: 'AutomationRule',
    entityId: rule.id,
    meta: { name: rule.name, trigger: rule.trigger, action: rule.action },
  });

  return rule;
}

export async function getRules() {
  return prisma.automationRule.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { logs: true } },
    },
  });
}

export async function getRuleById(id) {
  const rule = await prisma.automationRule.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      logs: {
        take: 20,
        orderBy: { executedAt: 'desc' },
      },
    },
  });

  if (!rule) {
    throw ApiError.notFound('Automation rule not found');
  }

  return rule;
}

export async function updateRule(id, data, user) {
  const existing = await prisma.automationRule.findUnique({ where: { id } });
  if (!existing) {
    throw ApiError.notFound('Automation rule not found');
  }

  const updated = await prisma.automationRule.update({
    where: { id },
    data: {
      name: data.name !== undefined ? data.name : existing.name,
      isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
      trigger: data.trigger !== undefined ? data.trigger : existing.trigger,
      conditions: data.conditions !== undefined ? data.conditions : existing.conditions,
      action: data.action !== undefined ? data.action : existing.action,
      actionConfig: data.actionConfig !== undefined ? data.actionConfig : existing.actionConfig,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  await createAuditLog({
    userId: user.id,
    action: 'AUTOMATION_RULE_UPDATED',
    entity: 'AutomationRule',
    entityId: updated.id,
    meta: { name: updated.name, isActive: updated.isActive },
  });

  return updated;
}

export async function deleteRule(id, user) {
  const existing = await prisma.automationRule.findUnique({ where: { id } });
  if (!existing) {
    throw ApiError.notFound('Automation rule not found');
  }

  await prisma.automationRule.delete({ where: { id } });

  await createAuditLog({
    userId: user.id,
    action: 'AUTOMATION_RULE_DELETED',
    entity: 'AutomationRule',
    entityId: id,
    meta: { name: existing.name },
  });

  return { message: 'Automation rule deleted successfully' };
}

export async function getAutomationLogs(query) {
  const { page, limit, skip, take } = parsePaginationParams(query, 'executedAt');

  const where = {};
  if (query.ruleId) where.ruleId = query.ruleId;
  if (query.status) where.status = query.status;
  if (query.entityType) where.entityType = query.entityType;

  const [logs, total] = await Promise.all([
    prisma.automationLog.findMany({
      where,
      skip,
      take,
      orderBy: { executedAt: 'desc' },
      include: {
        rule: { select: { id: true, name: true, trigger: true, action: true } },
      },
    }),
    prisma.automationLog.count({ where }),
  ]);

  const meta = buildPaginationMeta(total, page, limit);
  return { logs, meta };
}

export default {
  matchesConditions,
  hasAlreadyExecuted,
  executeRule,
  triggerEvent,
  runScheduledAutomations,
  createRule,
  getRules,
  getRuleById,
  updateRule,
  deleteRule,
  getAutomationLogs,
};
