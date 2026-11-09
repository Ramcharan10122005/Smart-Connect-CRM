import nodemailer from 'nodemailer';
import env from './env.js';
import { logger } from '../utils/logger.js';

let transporter;

if (env.SMTP_HOST && env.SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT || 587,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

export async function sendEmail({ to, subject, html, text }) {
  if (!transporter) {
    logger.info(
      { to, subject, textSnippet: text?.substring(0, 150) },
      '[Mailer: Simulated Delivery (No SMTP configured)]'
    );
    return { messageId: 'simulated-delivery' };
  }

  try {
    const info = await transporter.sendMail({
      from: env.MAIL_FROM,
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

export async function sendPasswordResetEmail(email, resetToken) {
  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${resetToken}`;
  const subject = 'Password Reset Request - SmartConnect CRM';
  const text = `You requested a password reset for your SmartConnect CRM account.\n\nClick the link below to set a new password:\n${resetUrl}\n\nThis link will expire in 1 hour. If you did not request this, please ignore this email.`;
  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #4F46E5;">SmartConnect CRM</h2>
      <p>You requested a password reset for your account.</p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}" style="background-color: #4F46E5; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">Reset Password</a>
      </p>
      <p style="color: #64748B; font-size: 14px;">This link will expire in 1 hour. If you did not request this, you can safely ignore this email.</p>
    </div>
  `;

  return sendEmail({ to: email, subject, text, html });
}

export async function sendUserInviteEmail(email, inviteToken, invitedByName) {
  const inviteUrl = `${env.CLIENT_URL}/accept-invite/${inviteToken}`;
  const subject = `You've been invited to SmartConnect CRM`;
  const text = `${invitedByName || 'An administrator'} has invited you to join SmartConnect CRM.\n\nClick the link below to set up your password and access your account:\n${inviteUrl}\n\nThis invitation expires in 7 days.`;
  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #4F46E5;">SmartConnect CRM</h2>
      <p><strong>${invitedByName || 'An administrator'}</strong> has invited you to join SmartConnect CRM.</p>
      <p style="margin: 24px 0;">
        <a href="${inviteUrl}" style="background-color: #4F46E5; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">Accept Invitation</a>
      </p>
      <p style="color: #64748B; font-size: 14px;">This invitation will expire in 7 days.</p>
    </div>
  `;

  return sendEmail({ to: email, subject, text, html });
}

export default {
  sendEmail,
  sendPasswordResetEmail,
  sendUserInviteEmail,
};
