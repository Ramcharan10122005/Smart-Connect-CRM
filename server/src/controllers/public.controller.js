import crypto from 'crypto';
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { createNotification } from '../services/notification.service.js';
import { calculateScoreFromParameters } from '../services/leadScoring.service.js';
import { logger } from '../utils/logger.js';

const leadSubmissionSchema = z.object({
  name: z.string().trim().min(1, 'Full name is required').max(100),
  email: z.string().trim().email('A valid email address is required').max(150),
  phone: z.string().trim().max(50).optional().nullable(),
  company: z.string().trim().max(100).optional().nullable(),
  message: z.string().trim().max(2000).optional().nullable(),
});

function allowIframe(res) {
  res.removeHeader('X-Frame-Options');
  res.setHeader('Content-Security-Policy', 'frame-ancestors *');
}

export async function renderCaptureForm(req, res) {
  const { key } = req.params;
  const isEmbed = req.query.embed === 'true';

  allowIframe(res);

  const form = await prisma.captureForm.findUnique({
    where: { key },
    include: { defaultSource: true, defaultOwner: true },
  });

  if (!form || !form.isActive) {
    return res.status(404).render('errors/404', {
      title: 'Form Not Found - SmartConnect CRM',
      message: 'This lead capture form does not exist or is currently inactive.',
      hideNav: isEmbed,
    });
  }

  // Generate secure CSRF token
  const csrfToken = crypto.randomBytes(24).toString('hex');
  res.cookie('_csrf', csrfToken, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 3600 * 1000, // 1 hour
  });

  return res.render('public/lead-capture', {
    title: form.name,
    form,
    csrfToken,
    errors: {},
    values: {},
    isEmbed,
    hideNav: isEmbed,
  });
}

export async function submitCaptureForm(req, res) {
  const { key } = req.params;
  const isEmbed = req.query.embed === 'true';

  allowIframe(res);

  const form = await prisma.captureForm.findUnique({
    where: { key },
    include: { defaultSource: true, defaultOwner: true },
  });

  if (!form || !form.isActive) {
    return res.status(404).render('errors/404', {
      title: 'Form Not Found - SmartConnect CRM',
      message: 'This lead capture form does not exist or is currently inactive.',
      hideNav: isEmbed,
    });
  }

  // 1. Honeypot check
  if (req.body.website_hp && req.body.website_hp.trim() !== '') {
    logger.warn({ ip: req.ip, key }, '[Honeypot Trap] Automated bot submission discarded');
    return res.render('public/thank-you', {
      title: 'Thank You - ' + form.name,
      formKey: form.key,
      isEmbed,
      hideNav: isEmbed,
    });
  }

  // 2. CSRF Token verification
  const csrfCookie = req.cookies?._csrf;
  const csrfBody = req.body?._csrf;
  if (!csrfCookie || !csrfBody || csrfCookie !== csrfBody) {
    return res.status(403).render('public/lead-capture', {
      title: form.name,
      form,
      csrfToken: csrfCookie || '',
      errors: {},
      values: req.body,
      globalError: 'Form session expired or invalid. Please refresh and try again.',
      isEmbed,
      hideNav: isEmbed,
    });
  }

  // 3. Zod payload validation
  const validationResult = leadSubmissionSchema.safeParse(req.body);
  if (!validationResult.success) {
    const errors = {};
    validationResult.error.errors.forEach((err) => {
      const field = err.path[0];
      if (!errors[field]) {
        errors[field] = err.message;
      }
    });

    return res.status(422).render('public/lead-capture', {
      title: form.name,
      form,
      csrfToken: csrfCookie,
      errors,
      values: req.body,
      isEmbed,
      hideNav: isEmbed,
    });
  }

  const { name, email, phone, company, message } = validationResult.data;

  // Split name into first & last
  const nameParts = name.trim().split(/\s+/);
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ') || '';

  // Get first pipeline stage
  const defaultStage = await prisma.pipelineStage.findFirst({
    orderBy: { position: 'asc' },
  });

  // Default owner & source
  let ownerId = form.defaultOwnerId;
  if (!ownerId) {
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
    ownerId = adminUser?.id || null;
  }

  let sourceId = form.defaultSourceId;
  if (!sourceId) {
    const webSource = await prisma.leadSource.findFirst({ where: { name: 'Website' } });
    sourceId = webSource?.id || null;
  }

  // Find or create company if company name provided
  let companyId = null;
  if (company) {
    let existingCompany = await prisma.company.findFirst({
      where: {
        name: { equals: company.trim(), mode: 'insensitive' },
        deletedAt: null,
      },
    });

    if (!existingCompany) {
      existingCompany = await prisma.company.create({
        data: {
          name: company.trim(),
          ownerId,
        },
      });
    }
    companyId = existingCompany.id;
  }

  // Calculate initial lead score
  const initialScore = calculateScoreFromParameters({
    email,
    phone: phone || null,
    value: 0,
    sourceName: form.defaultSource?.name || 'Website',
    recentActivityCount: 1,
    stageProbability: defaultStage?.probability ?? 10,
  });

  const leadTitle = company ? `${company.trim()} - Web Inquiry` : `${name.trim()} - Web Inquiry`;

  // Create Lead
  const lead = await prisma.lead.create({
    data: {
      title: leadTitle,
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone: phone || null,
      companyName: company ? company.trim() : null,
      companyId,
      sourceId,
      ownerId,
      stageId: defaultStage?.id,
      priority: 'MEDIUM',
      score: initialScore,
      status: 'OPEN',
    },
  });

  // Record NOTE Activity with the inquiry message
  await prisma.activity.create({
    data: {
      type: 'NOTE',
      subject: 'Public Web Inquiry Message',
      body: message && message.trim().length > 0 ? message.trim() : 'No inquiry message provided.',
      leadId: lead.id,
      companyId: lead.companyId,
      createdById: ownerId,
    },
  });

  // Notify default owner
  if (ownerId) {
    try {
      await createNotification({
        userId: ownerId,
        type: 'LEAD_CAPTURED',
        title: 'New Inbound Lead Captured',
        body: `New lead "${lead.title}" arrived via "${form.name}"`,
        link: `/leads/${lead.id}`,
      });
    } catch (err) {
      logger.warn({ err }, 'Failed to create lead capture notification');
    }
  }

  // Clear CSRF cookie
  res.clearCookie('_csrf');

  // Render Thank You page
  return res.render('public/thank-you', {
    title: 'Thank You - ' + form.name,
    formKey: form.key,
    isEmbed,
    hideNav: isEmbed,
  });
}

export default {
  renderCaptureForm,
  submitCaptureForm,
};
