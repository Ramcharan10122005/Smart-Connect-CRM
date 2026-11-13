import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import ejs from 'ejs';
import env from './env.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const emailsDir = path.join(__dirname, '../views/emails');

let transporter;

if (env.SMTP_HOST && env.SMTP_USER) {
  const isSecure = Number(env.SMTP_PORT) === 465;
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT || 587,
    secure: isSecure,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

/**
 * Renders an EJS email template inside layout.ejs
 */
export async function renderTemplate(templateName, data = {}) {
  const templatePath = path.join(emailsDir, `${templateName}.ejs`);
  const layoutPath = path.join(emailsDir, 'layout.ejs');

  const bodyHtml = await ejs.renderFile(templatePath, data);
  const fullHtml = await ejs.renderFile(layoutPath, {
    ...data,
    body: bodyHtml,
    title: data.subject || data.title || 'SmartConnect CRM',
  });

  return fullHtml;
}

export async function sendEmail({ to, subject, html, text, replyTo }) {
  if (!transporter || env.NODE_ENV === 'test') {
    logger.info(
      {
        to,
        replyTo,
        subject,
        textSnippet: text
          ? text.substring(0, 150)
          : html
              ?.replace(/<[^>]+>/g, ' ')
              .trim()
              .substring(0, 150),
      },
      '[Mailer: Simulated Delivery (No SMTP configured or test mode)]'
    );
    return { messageId: 'simulated-delivery' };
  }

  try {
    const info = await transporter.sendMail({
      from: env.MAIL_FROM,
      replyTo,
      to,
      subject,
      text,
      html,
    });
    logger.info({ messageId: info.messageId, to, subject }, 'Email delivered successfully');
    return info;
  } catch (error) {
    logger.error({ error, to, subject }, 'Failed to deliver email');
    throw error;
  }
}

export async function sendPasswordResetEmail(email, resetToken, userName = '') {
  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${resetToken}`;
  const subject = 'Password Reset Request - SmartConnect CRM';
  const text = `You requested a password reset for your SmartConnect CRM account.\n\nClick the link below to set a new password:\n${resetUrl}\n\nThis link will expire in 1 hour. If you did not request this, please ignore this email.`;

  const html = await renderTemplate('reset-password', {
    userName,
    resetUrl,
    subject,
  });

  return sendEmail({ to: email, subject, text, html });
}

export async function sendUserInviteEmail(email, inviteToken, invitedByName) {
  const inviteUrl = `${env.CLIENT_URL}/accept-invite/${inviteToken}`;
  const subject = "You've been invited to SmartConnect CRM";
  const text = `${invitedByName || 'An administrator'} has invited you to join SmartConnect CRM.\n\nClick the link below to set up your password and access your account:\n${inviteUrl}\n\nThis invitation expires in 7 days.`;

  const html = await renderTemplate('invite', {
    invitedByName,
    inviteUrl,
    subject,
  });

  return sendEmail({ to: email, subject, text, html });
}

export async function sendFollowUpReminderEmail(user, followUp) {
  const subject = `Task Reminder: ${followUp.title}`;
  const appUrl = `${env.CLIENT_URL}/follow-ups`;
  const text = `Hello ${user.name},\n\nThis is a scheduled reminder for a follow-up task due in the next 15 minutes: ${followUp.title}.\nDue time: ${new Date(followUp.dueAt).toLocaleString()}\n\nView task: ${appUrl}`;

  const html = await renderTemplate('follow-up-reminder', {
    userName: user.name,
    followUp,
    appUrl,
    subject,
  });

  return sendEmail({ to: user.email, subject, text, html });
}

export async function sendDailyDigestEmail(
  user,
  { todayFollowUps = [], overdueCount = 0, newLeads = [] }
) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const subject = `SmartConnect Daily Digest - ${dateStr}`;
  const appUrl = `${env.CLIENT_URL}/dashboard`;
  const text = `Good morning ${user.name},\n\nHere is your daily briefing for ${dateStr}:\n- Overdue tasks: ${overdueCount}\n- Tasks due today: ${todayFollowUps.length}\n- Newly assigned leads: ${newLeads.length}\n\nOpen SmartConnect: ${appUrl}`;

  const html = await renderTemplate('daily-digest', {
    userName: user.name,
    dateStr,
    todayFollowUps,
    overdueCount,
    newLeads,
    appUrl,
    subject,
  });

  return sendEmail({ to: user.email, subject, text, html });
}

export default {
  sendEmail,
  sendPasswordResetEmail,
  sendUserInviteEmail,
  sendFollowUpReminderEmail,
  sendDailyDigestEmail,
  renderTemplate,
};
