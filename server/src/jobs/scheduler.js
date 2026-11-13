import cron from 'node-cron';
import prisma from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { createNotification } from '../services/notification.service.js';
import { sendFollowUpReminderEmail, sendDailyDigestEmail } from '../config/mailer.js';

let activeCronTasks = [];

/**
 * 1. Process upcoming follow-up reminders
 * Finds PENDING follow-ups due in next 15 minutes that haven't been reminded.
 */
export async function remindUpcomingFollowUps() {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 15 * 60 * 1000);

  try {
    const upcomingFollowUps = await prisma.followUp.findMany({
      where: {
        status: 'PENDING',
        remindedAt: null,
        dueAt: {
          lte: windowEnd,
        },
      },
      include: {
        assignee: true,
        contact: { select: { firstName: true, lastName: true } },
        lead: { select: { title: true } },
      },
    });

    if (upcomingFollowUps.length === 0) {
      logger.debug('[Scheduler: Reminders] No pending follow-ups due for reminder');
      return { count: 0 };
    }

    let remindedCount = 0;

    for (const followUp of upcomingFollowUps) {
      const user = followUp.assignee;
      const remindedAt = new Date();

      if (user) {
        // Create in-app notification
        try {
          await createNotification({
            userId: user.id,
            type: 'FOLLOW_UP_REMINDER',
            title: `Reminder: ${followUp.title}`,
            body: `Follow-up is due at ${new Date(followUp.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            link: '/follow-ups',
          });
        } catch (err) {
          logger.warn({ err, followUpId: followUp.id }, 'Failed to create reminder notification');
        }

        // Send email notification if user preferences allow
        const prefs =
          user.notificationPreferences && typeof user.notificationPreferences === 'object'
            ? user.notificationPreferences
            : {};

        if (prefs.email !== false && user.email) {
          try {
            await sendFollowUpReminderEmail(user, followUp);
          } catch (err) {
            logger.warn({ err, userId: user.id }, 'Failed to send reminder email');
          }
        }
      }

      // Mark reminded to ensure idempotency
      await prisma.followUp.update({
        where: { id: followUp.id },
        data: { remindedAt },
      });

      remindedCount++;
    }

    logger.info(
      { count: remindedCount },
      '[Scheduler: Reminders] Successfully processed reminders'
    );
    return { count: remindedCount };
  } catch (error) {
    logger.error({ error }, '[Scheduler: Reminders] Error processing follow-up reminders');
    throw error;
  }
}

/**
 * 2. Un-snooze follow-ups
 * Finds follow-ups with status SNOOZED whose snoozedUntil has passed.
 */
export async function unsnoozeFollowUps() {
  const now = new Date();

  try {
    const result = await prisma.followUp.updateMany({
      where: {
        status: 'SNOOZED',
        snoozedUntil: {
          lte: now,
        },
      },
      data: {
        status: 'PENDING',
        snoozedUntil: null,
      },
    });

    logger.info(
      { unsnoozedCount: result.count },
      '[Scheduler: Unsnooze] Checked snoozed follow-ups'
    );
    return { count: result.count };
  } catch (error) {
    logger.error({ error }, '[Scheduler: Unsnooze] Error un-snoozing follow-ups');
    throw error;
  }
}

/**
 * 3. Daily Morning Digest (at 08:00 server time)
 * Sends digest email with today's follow-ups, overdue count, and new leads assigned.
 */
export async function sendDailyDigests() {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
    });

    let sentCount = 0;

    for (const user of users) {
      const prefs =
        user.notificationPreferences && typeof user.notificationPreferences === 'object'
          ? user.notificationPreferences
          : {};

      if (prefs.email === false || !user.email) {
        continue;
      }

      const [overdueCount, todayFollowUps, newLeads] = await Promise.all([
        prisma.followUp.count({
          where: {
            assigneeId: user.id,
            status: 'PENDING',
            dueAt: { lt: startOfDay },
          },
        }),
        prisma.followUp.findMany({
          where: {
            assigneeId: user.id,
            status: 'PENDING',
            dueAt: { gte: startOfDay, lte: endOfDay },
          },
          include: {
            contact: { select: { firstName: true, lastName: true } },
            lead: { select: { title: true } },
          },
          orderBy: { dueAt: 'asc' },
        }),
        prisma.lead.findMany({
          where: {
            ownerId: user.id,
            deletedAt: null,
            createdAt: { gte: yesterday },
          },
          include: {
            stage: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      await sendDailyDigestEmail(user, {
        todayFollowUps,
        overdueCount,
        newLeads,
      });

      sentCount++;
    }

    logger.info(
      { sentCount, totalUsers: users.length },
      '[Scheduler: Daily Digest] Completed morning digests'
    );
    return { count: sentCount };
  } catch (error) {
    logger.error({ error }, '[Scheduler: Daily Digest] Error executing daily digest');
    throw error;
  }
}

/**
 * Initializes and starts all recurring background cron jobs.
 * Disabled completely in test environments.
 */
export function startScheduler() {
  if (process.env.NODE_ENV === 'test') {
    logger.info('[Scheduler] Background jobs disabled in test environment');
    return null;
  }

  logger.info('[Scheduler] Starting background cron jobs...');

  // 1. Every 5 minutes: Remind upcoming follow-ups
  const reminderTask = cron.schedule('*/5 * * * *', async () => {
    logger.debug('[Scheduler: Reminders] Checking upcoming follow-ups...');
    await remindUpcomingFollowUps().catch((err) => {
      logger.error({ err }, '[Scheduler: Reminders] Job execution failed');
    });
  });

  // 2. Every 5 minutes: Un-snooze overdue snoozes
  const unsnoozeTask = cron.schedule('*/5 * * * *', async () => {
    logger.debug('[Scheduler: Unsnooze] Checking snoozed follow-ups...');
    await unsnoozeFollowUps().catch((err) => {
      logger.error({ err }, '[Scheduler: Unsnooze] Job execution failed');
    });
  });

  // 3. Every day at 08:00 server time: Morning daily digest
  const digestTask = cron.schedule('0 8 * * *', async () => {
    logger.info('[Scheduler: Daily Digest] Triggering 08:00 morning digest job...');
    await sendDailyDigests().catch((err) => {
      logger.error({ err }, '[Scheduler: Daily Digest] Job execution failed');
    });
  });

  // 4. Every hour: Check stale leads & overdue follow-ups automations
  const automationTask = cron.schedule('0 * * * *', async () => {
    logger.info('[Scheduler: Automations] Checking hourly stale lead & overdue follow-up automations...');
    try {
      const { runScheduledAutomations } = await import('../services/automation.service.js');
      await runScheduledAutomations();
    } catch (err) {
      logger.error({ err }, '[Scheduler: Automations] Job execution failed');
    }
  });

  activeCronTasks = [reminderTask, unsnoozeTask, digestTask, automationTask];
  return activeCronTasks;
}

export function stopScheduler() {
  for (const task of activeCronTasks) {
    if (task && typeof task.stop === 'function') {
      task.stop();
    }
  }
  activeCronTasks = [];
  logger.info('[Scheduler] Background jobs stopped');
}

export default {
  startScheduler,
  stopScheduler,
  remindUpcomingFollowUps,
  unsnoozeFollowUps,
  sendDailyDigests,
};
