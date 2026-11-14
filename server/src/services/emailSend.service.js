import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import env from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { sendEmail } from '../config/mailer.js';
import * as activityService from './activity.service.js';
import { renderTemplateVariables } from '../utils/templateRenderer.js';
import { parsePaginationParams, buildPaginationMeta } from '../utils/queryHelper.js';

export function generateUnsubscribeToken({ contactId, email, leadId }) {
  return jwt.sign(
    {
      contactId: contactId || null,
      leadId: leadId || null,
      email: email || null,
      type: 'unsubscribe',
    },
    env.JWT_SECRET,
    { expiresIn: '365d' }
  );
}

export function verifyUnsubscribeToken(token) {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (payload.type !== 'unsubscribe') {
      throw new Error('Invalid token type');
    }
    return payload;
  } catch {
    throw ApiError.badRequest('Invalid or expired unsubscribe link');
  }
}

export async function optOutByToken(token) {
  const payload = verifyUnsubscribeToken(token);
  let contact = null;

  if (payload.contactId) {
    contact = await prisma.contact.findUnique({ where: { id: payload.contactId } });
  } else if (payload.email) {
    contact = await prisma.contact.findFirst({ where: { email: payload.email } });
  }

  if (contact) {
    const updated = await prisma.contact.update({
      where: { id: contact.id },
      data: {
        emailOptOut: true,
        optOutAt: new Date(),
      },
    });
    return { contact: updated, message: 'Successfully unsubscribed from emails' };
  }

  return { message: 'Unsubscribe preferences updated successfully' };
}

export function buildStyledEmailHtml({ subject, body, sender, unsubscribeUrl }) {
  const senderName = sender?.name || 'SmartConnect Team';
  const senderEmail = sender?.email || '';
  const senderInitials =
    senderName
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'SC';

  // Sanitize body HTML
  const safeBody = (body || '')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Format paragraphs nicely
  const paragraphs = safeBody
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin: 0 0 16px 0; line-height: 1.68; font-size: 15px; color: #334155;">${p.replace(/\n/g, '<br />')}</p>`
    )
    .join('');

  const contentHtml =
    paragraphs ||
    `<p style="margin: 0 0 16px 0; line-height: 1.68; font-size: 15px; color: #334155;">${safeBody.replace(/\n/g, '<br />')}</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject ? subject.replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'SmartConnect CRM'}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; padding: 36px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04); border: 1px solid #e2e8f0;">
          
          <!-- Branded Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); padding: 26px 32px; text-align: left;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align: middle; padding-right: 12px;">
                    <div style="width: 38px; height: 38px; border-radius: 9px; background: rgba(255, 255, 255, 0.2); text-align: center; line-height: 38px; font-size: 18px; color: #ffffff; font-weight: 700;">
                      &#9776;
                    </div>
                  </td>
                  <td style="vertical-align: middle;">
                    <div style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em; line-height: 1.2;">
                      SmartConnect
                    </div>
                    <div style="font-size: 10px; font-weight: 600; color: #c7d2fe; letter-spacing: 0.1em; font-family: monospace; margin-top: 2px;">
                      RELATIONSHIP CRM
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Email Content Body -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; background-color: #ffffff;">
              <div style="min-height: 120px;">
                ${contentHtml}
              </div>

              <!-- Rep Signature Block -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin-top: 28px; padding-top: 22px; border-top: 1px solid #f1f5f9; width: 100%;">
                <tr>
                  <td style="width: 44px; vertical-align: middle; padding-right: 14px;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); color: #ffffff; text-align: center; line-height: 40px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.25);">
                      ${senderInitials}
                    </div>
                  </td>
                  <td style="vertical-align: middle;">
                    <div style="font-weight: 700; font-size: 14px; color: #0f172a; line-height: 1.3;">
                      ${senderName}
                    </div>
                    ${senderEmail ? `<div style="font-size: 12px; color: #64748b; margin-top: 1px;">${senderEmail}</div>` : ''}
                    <div style="font-size: 11px; color: #4f46e5; font-weight: 600; margin-top: 2px;">
                      SmartConnect Sales Team
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Professional Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.6;">
                Sent via <strong style="color: #334155;">SmartConnect CRM</strong>
                ${unsubscribeUrl ? ` &bull; <a href="${unsubscribeUrl}" style="color: #4f46e5; text-decoration: underline; font-weight: 500;">Unsubscribe</a>` : ''}
              </p>
              <p style="margin: 6px 0 0 0; font-size: 11px; color: #94a3b8;">
                You received this message from a SmartConnect representative or automated workflow.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendUserEmail(data, user) {
  const { to, subject, body, contactId, leadId } = data;

  // 1. Resolve Contact and Lead to verify opt-out and provide template variables
  let contact = null;
  let lead = null;

  if (contactId) {
    contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: { company: true, owner: true },
    });
    if (contact && contact.emailOptOut) {
      throw ApiError.badRequest('Contact has opted out of receiving emails.');
    }
  }

  if (leadId) {
    lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        contact: { include: { company: true, owner: true } },
        convertedContact: { include: { company: true, owner: true } },
        company: true,
        owner: true,
      },
    });
    if (lead?.contact?.emailOptOut || lead?.convertedContact?.emailOptOut) {
      throw ApiError.badRequest('Contact associated with this lead has opted out of receiving emails.');
    }
    if (!contact) {
      contact = lead.convertedContact || lead.contact || null;
    }
  }

  // Also check if any contact with this email has opted out
  if (!contact && to) {
    const existingContact = await prisma.contact.findFirst({
      where: {
        email: { equals: to, mode: 'insensitive' },
      },
      include: { company: true, owner: true },
    });
    if (existingContact) {
      if (existingContact.emailOptOut) {
        throw ApiError.badRequest('This email address has opted out of receiving emails.');
      }
      contact = existingContact;
    }
  }

  // 2. Resolve Template Variables & Render {{firstName}}, {{companyName}}, {{ownerName}}
  const templateVars = {
    firstName: contact?.firstName || lead?.firstName || '',
    companyName: contact?.company?.name || lead?.companyName || lead?.company?.name || '',
    ownerName: user?.name || contact?.owner?.name || lead?.owner?.name || 'SmartConnect Team',
  };

  const finalSubject = renderTemplateVariables(subject || '', templateVars);
  const finalBody = renderTemplateVariables(body || '', templateVars);

  // 3. Generate unsubscribe URL
  const unsubToken = generateUnsubscribeToken({ contactId, leadId, email: to });
  const unsubscribeUrl = `${env.APP_URL}/unsubscribe/${unsubToken}`;

  const textContent = `${finalBody}\n\n---\nTo unsubscribe from future emails, click here: ${unsubscribeUrl}`;
  const htmlContent = buildStyledEmailHtml({
    subject: finalSubject,
    body: finalBody,
    sender: user,
    unsubscribeUrl,
  });

  // 4. Send email via Nodemailer
  let status = 'SENT';
  let sendError = null;

  try {
    await sendEmail({
      to,
      subject: finalSubject,
      text: textContent,
      html: htmlContent,
      replyTo: user.email,
    });
  } catch (err) {
    status = 'FAILED';
    sendError = err.message || 'Failed to send email';
  }

  // 5. Record EmailLog
  const emailLog = await prisma.emailLog.create({
    data: {
      to,
      subject: finalSubject,
      body: finalBody,
      status,
      error: sendError,
      sentById: user.id,
      contactId: contactId || null,
      leadId: leadId || null,
      sentAt: new Date(),
    },
  });

  // 6. Create Activity record
  let activity = null;
  try {
    activity = await activityService.createActivity(
      {
        type: 'EMAIL',
        subject: `Email: ${finalSubject}`,
        body: status === 'FAILED' ? `[Delivery Failed: ${sendError}]\n\n${finalBody}` : finalBody,
        outcome: status,
        contactId: contactId || null,
        leadId: leadId || null,
        occurredAt: new Date(),
      },
      user
    );
  } catch (actErr) {
    console.error('Failed to auto-create email activity:', actErr.message);
  }

  if (status === 'FAILED') {
    throw ApiError.badRequest(`Failed to deliver email: ${sendError}`);
  }

  return {
    emailLog,
    activity,
    message: 'Email delivered successfully',
  };
}

export async function getEmailLogs(query) {
  const { page, limit, skip, take } = parsePaginationParams(query, 'sentAt');

  const where = {};
  if (query.contactId) where.contactId = query.contactId;
  if (query.leadId) where.leadId = query.leadId;
  if (query.sentById) where.sentById = query.sentById;
  if (query.status) where.status = query.status;

  const [logs, total] = await Promise.all([
    prisma.emailLog.findMany({
      where,
      skip,
      take,
      orderBy: { sentAt: 'desc' },
      include: {
        sentBy: { select: { id: true, name: true, email: true } },
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        lead: { select: { id: true, title: true } },
      },
    }),
    prisma.emailLog.count({ where }),
  ]);

  const meta = buildPaginationMeta(total, page, limit);
  return { logs, meta };
}

export default {
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
  optOutByToken,
  sendUserEmail,
  getEmailLogs,
};

