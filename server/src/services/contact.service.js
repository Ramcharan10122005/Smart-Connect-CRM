import prisma from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { scopeByOwner } from '../utils/scope.js';
import { parsePaginationParams, buildPaginationMeta } from '../utils/queryHelper.js';
import { createAuditLog } from './audit.service.js';
import { parseCSV } from '../utils/csv.js';

export function buildContactWhereClause(query, user) {
  const where = {
    deletedAt: null,
    ...scopeByOwner(user, 'ownerId'),
  };

  const search = query.search;
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { company: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  if (query.ownerId) {
    if (user.role === 'REP' && query.ownerId !== user.id) {
      where.ownerId = '__UNAUTHORIZED__';
    } else {
      where.ownerId = query.ownerId;
    }
  }

  if (query.companyId) {
    where.companyId = query.companyId;
  }

  if (query.sourceId) {
    where.sourceId = query.sourceId;
  }

  if (query.lifecycleStage) {
    where.lifecycleStage = query.lifecycleStage;
  }

  if (query.tagId) {
    where.tags = {
      some: { tagId: query.tagId },
    };
  }

  if (query.createdFrom || query.createdTo) {
    where.createdAt = {};
    if (query.createdFrom) where.createdAt.gte = query.createdFrom;
    if (query.createdTo) where.createdAt.lte = query.createdTo;
  }

  return where;
}

export async function getContacts(query, user) {
  const { page, limit, skip, take, orderBy } = parsePaginationParams(query, 'lastName');
  const where = buildContactWhereClause(query, user);

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        company: {
          select: { id: true, name: true, domain: true },
        },
        owner: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        source: {
          select: { id: true, name: true },
        },
        tags: {
          include: { tag: true },
        },
      },
    }),
    prisma.contact.count({ where }),
  ]);

  const meta = buildPaginationMeta(total, page, limit);

  return { contacts, meta };
}

export async function getContactById(id, user) {
  const contact = await prisma.contact.findFirst({
    where: {
      id,
      deletedAt: null,
      ...scopeByOwner(user, 'ownerId'),
    },
    include: {
      company: {
        select: { id: true, name: true, domain: true, phone: true, website: true },
      },
      owner: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
      source: {
        select: { id: true, name: true },
      },
      tags: {
        include: { tag: true },
      },
    },
  });

  if (!contact) {
    throw ApiError.notFound('Contact not found or access denied');
  }

  return contact;
}

export async function getContactOverview(id, user) {
  const contact = await prisma.contact.findFirst({
    where: {
      id,
      deletedAt: null,
      ...scopeByOwner(user, 'ownerId'),
    },
    include: {
      company: true,
      owner: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
      source: true,
      tags: {
        include: { tag: true },
      },
    },
  });

  if (!contact) {
    throw ApiError.notFound('Contact not found or access denied');
  }

  const now = new Date();

  // Parallel fetch: Open leads, timeline activities, upcoming follow-ups, interaction count
  const [openLeads, timelineItems, upcomingFollowUps, totalInteractions] = await Promise.all([
    // Open Leads
    prisma.lead.findMany({
      where: {
        contactId: id,
        deletedAt: null,
        stage: { type: 'OPEN' },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        stage: true,
        owner: { select: { id: true, name: true } },
      },
    }),

    // Last 20 Timeline activities
    prisma.activity.findMany({
      where: { contactId: id },
      take: 20,
      orderBy: { occurredAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
      },
    }),

    // Upcoming Follow-ups
    prisma.followUp.findMany({
      where: {
        contactId: id,
        status: { not: 'DONE' },
        dueAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }, // including today & upcoming
      },
      orderBy: { dueAt: 'asc' },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
      },
    }),

    // Total interactions count
    prisma.activity.count({
      where: { contactId: id },
    }),
  ]);

  // Summary statistics calculation
  const lastContactedAt = contact.lastContactedAt || timelineItems[0]?.occurredAt || null;
  let daysSinceLastContact = null;
  if (lastContactedAt) {
    const diffMs = Date.now() - new Date(lastContactedAt).getTime();
    daysSinceLastContact = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }

  const summaryStats = {
    totalInteractions,
    lastContactedAt,
    daysSinceLastContact,
    openLeadsCount: openLeads.length,
    openPipelineValue: openLeads.reduce((acc, lead) => acc + Number(lead.value || 0), 0),
  };

  return {
    contact,
    company: contact.company,
    tags: contact.tags.map((t) => t.tag),
    owner: contact.owner,
    openLeads,
    timeline: timelineItems,
    upcomingFollowUps,
    summaryStats,
  };
}

export async function createContact(data, user) {
  // Duplicate email detection
  if (data.email) {
    const existing = await prisma.contact.findFirst({
      where: {
        email: data.email,
        deletedAt: null,
      },
      select: { id: true, firstName: true, lastName: true },
    });

    if (existing && !data.force) {
      throw ApiError.conflict('A contact with this email already exists', {
        existingId: existing.id,
        existingName: `${existing.firstName} ${existing.lastName}`,
      });
    }
  }

  const ownerId = data.ownerId || (user.role === 'REP' ? user.id : user.id);
  const tagIds = data.tagIds;
  const fields = { ...data };
  delete fields.tagIds;
  delete fields.force;

  const contact = await prisma.contact.create({
    data: {
      ...fields,
      ownerId,
      tags: tagIds?.length
        ? {
            create: tagIds.map((tagId) => ({ tagId })),
          }
        : undefined,
    },
    include: {
      company: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true, email: true } },
      tags: { include: { tag: true } },
    },
  });

  await createAuditLog({
    userId: user.id,
    action: 'CONTACT_CREATED',
    entity: 'Contact',
    entityId: contact.id,
    meta: { name: `${contact.firstName} ${contact.lastName}`, email: contact.email, ownerId },
  });

  return contact;
}

export async function updateContact(id, data, user) {
  const existing = await prisma.contact.findFirst({
    where: {
      id,
      deletedAt: null,
      ...scopeByOwner(user, 'ownerId'),
    },
  });

  if (!existing) {
    throw ApiError.notFound('Contact not found or access denied');
  }

  const tagIds = data.tagIds;
  const fields = { ...data };
  delete fields.tagIds;
  delete fields.force;

  const updated = await prisma.contact.update({
    where: { id },
    data: {
      ...fields,
      tags: tagIds
        ? {
            deleteMany: {},
            create: tagIds.map((tagId) => ({ tagId })),
          }
        : undefined,
    },
    include: {
      company: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true, email: true } },
      tags: { include: { tag: true } },
    },
  });

  await createAuditLog({
    userId: user.id,
    action: 'CONTACT_UPDATED',
    entity: 'Contact',
    entityId: id,
    meta: {
      name: `${updated.firstName} ${updated.lastName}`,
      email: updated.email,
    },
  });

  return updated;
}

export async function deleteContact(id, user) {
  const existing = await prisma.contact.findFirst({
    where: {
      id,
      deletedAt: null,
      ...scopeByOwner(user, 'ownerId'),
    },
  });

  if (!existing) {
    throw ApiError.notFound('Contact not found or access denied');
  }

  await prisma.contact.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await createAuditLog({
    userId: user.id,
    action: 'CONTACT_DELETED',
    entity: 'Contact',
    entityId: id,
    meta: { name: `${existing.firstName} ${existing.lastName}` },
  });

  return { message: 'Contact soft-deleted successfully' };
}

export async function bulkContactAction(payload, user) {
  const { action, contactIds } = payload;

  // Enforce ownership scoping: only mutate contacts the current user has access to
  const scopedFilter = {
    id: { in: contactIds },
    deletedAt: null,
    ...scopeByOwner(user, 'ownerId'),
  };

  const eligibleContacts = await prisma.contact.findMany({
    where: scopedFilter,
    select: { id: true },
  });

  const eligibleIds = eligibleContacts.map((c) => c.id);

  if (eligibleIds.length === 0) {
    throw ApiError.badRequest('No accessible contacts found for this bulk operation');
  }

  let resultMeta = {};

  switch (action) {
    case 'assign_owner': {
      await prisma.contact.updateMany({
        where: { id: { in: eligibleIds } },
        data: { ownerId: payload.ownerId },
      });
      resultMeta = { updatedCount: eligibleIds.length, ownerId: payload.ownerId };
      break;
    }

    case 'add_tag': {
      // Upsert tags for all eligible contacts
      for (const contactId of eligibleIds) {
        await prisma.contactTag.upsert({
          where: { contactId_tagId: { contactId, tagId: payload.tagId } },
          update: {},
          create: { contactId, tagId: payload.tagId },
        });
      }
      resultMeta = { taggedCount: eligibleIds.length, tagId: payload.tagId };
      break;
    }

    case 'remove_tag': {
      const removed = await prisma.contactTag.deleteMany({
        where: {
          contactId: { in: eligibleIds },
          tagId: payload.tagId,
        },
      });
      resultMeta = { removedCount: removed.count, tagId: payload.tagId };
      break;
    }

    case 'delete': {
      await prisma.contact.updateMany({
        where: { id: { in: eligibleIds } },
        data: { deletedAt: new Date() },
      });
      resultMeta = { deletedCount: eligibleIds.length };
      break;
    }
  }

  await createAuditLog({
    userId: user.id,
    action: `BULK_CONTACT_${action.toUpperCase()}`,
    entity: 'Contact',
    entityId: 'BULK',
    meta: { affectedCount: eligibleIds.length, ...resultMeta },
  });

  return {
    message: `Bulk ${action.replace('_', ' ')} completed successfully on ${eligibleIds.length} contact(s)`,
    affectedCount: eligibleIds.length,
  };
}

export async function updateContactLastContactedAt(contactId, timestamp = new Date()) {
  try {
    return await prisma.contact.update({
      where: { id: contactId },
      data: { lastContactedAt: timestamp },
    });
  } catch {
    return null;
  }
}

// -------------------------------------------------------------
// Contact CSV Import & Export
// -------------------------------------------------------------

export function previewContactImport(fileBuffer) {
  const { headers, rows } = parseCSV(fileBuffer);

  if (headers.length === 0) {
    throw ApiError.badRequest('The uploaded CSV file is empty or missing headers');
  }

  // Heuristic mapping detection
  const mappingSuggestion = {};
  const standardFields = [
    { field: 'firstName', regex: /^(first\s*name|firstname|fname|first)$/i },
    { field: 'lastName', regex: /^(last\s*name|lastname|lname|last|surname)$/i },
    { field: 'email', regex: /^(email|e-mail|email\s*address)$/i },
    { field: 'phone', regex: /^(phone|telephone|mobile|phone\s*number|cell)$/i },
    { field: 'jobTitle', regex: /^(job\s*title|title|role|position)$/i },
    { field: 'companyName', regex: /^(company|company\s*name|organization|org)$/i },
    { field: 'addressLine1', regex: /^(address|address\s*line\s*1|street)$/i },
    { field: 'city', regex: /^city$/i },
    { field: 'state', regex: /^(state|province|region)$/i },
    { field: 'country', regex: /^country$/i },
    { field: 'postalCode', regex: /^(postal\s*code|zip|zip\s*code|postcode)$/i },
    { field: 'notes', regex: /^(notes|description|comments)$/i },
    { field: 'lifecycleStage', regex: /^(lifecycle|lifecycle\s*stage|stage)$/i },
  ];

  for (const header of headers) {
    for (const std of standardFields) {
      if (std.regex.test(header) && !Object.values(mappingSuggestion).includes(std.field)) {
        mappingSuggestion[header] = std.field;
        break;
      }
    }
  }

  // Row validation errors check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const firstNameCol = Object.keys(mappingSuggestion).find(
    (k) => mappingSuggestion[k] === 'firstName'
  );
  const emailCol = Object.keys(mappingSuggestion).find((k) => mappingSuggestion[k] === 'email');

  const validationErrors = [];
  rows.forEach((row, idx) => {
    const rowNum = idx + 1;
    if (firstNameCol && (!row[firstNameCol] || String(row[firstNameCol]).trim() === '')) {
      validationErrors.push({
        rowNumber: rowNum,
        field: 'firstName',
        error: 'First name is required',
      });
    }
    if (emailCol && row[emailCol]) {
      const emailVal = String(row[emailCol]).trim();
      if (emailVal && !emailRegex.test(emailVal)) {
        validationErrors.push({
          rowNumber: rowNum,
          field: 'email',
          error: `Invalid email address format: "${emailVal}"`,
        });
      }
    }
  });

  return {
    detectedColumns: headers,
    mappingSuggestion,
    sampleRows: rows.slice(0, 10),
    totalRows: rows.length,
    validationErrors,
  };
}

export async function commitContactImport({ mapping, rows }, user) {
  if (!mapping || typeof mapping !== 'object') {
    throw ApiError.badRequest('Mapping configuration is required');
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    throw ApiError.badRequest('No rows provided for import');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let created = 0;
  let skipped = 0;
  let failed = 0;
  const errors = [];

  // Invert mapping for fast lookup: { fieldName: csvHeaderName }
  const fieldToHeader = {};
  for (const [csvHeader, fieldName] of Object.entries(mapping)) {
    if (fieldName) {
      fieldToHeader[fieldName] = csvHeader;
    }
  }

  // Gather candidate emails to pre-check duplicates
  const candidateEmails = rows
    .map((r) => {
      const header = fieldToHeader['email'];
      return header && r[header] ? String(r[header]).trim().toLowerCase() : null;
    })
    .filter(Boolean);

  const existingContacts = await prisma.contact.findMany({
    where: {
      deletedAt: null,
      email: { in: candidateEmails },
    },
    select: { email: true },
  });
  const existingEmailSet = new Set(existingContacts.map((c) => c.email.toLowerCase()));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    const firstName = fieldToHeader['firstName']
      ? String(row[fieldToHeader['firstName']] || '').trim()
      : '';
    const lastName = fieldToHeader['lastName']
      ? String(row[fieldToHeader['lastName']] || '').trim()
      : '';
    const emailRaw = fieldToHeader['email'] ? String(row[fieldToHeader['email']] || '').trim() : '';
    const email = emailRaw || null;
    const phone = fieldToHeader['phone']
      ? String(row[fieldToHeader['phone']] || '').trim() || null
      : null;
    const jobTitle = fieldToHeader['jobTitle']
      ? String(row[fieldToHeader['jobTitle']] || '').trim() || null
      : null;
    const companyName = fieldToHeader['companyName']
      ? String(row[fieldToHeader['companyName']] || '').trim() || null
      : null;
    const addressLine1 = fieldToHeader['addressLine1']
      ? String(row[fieldToHeader['addressLine1']] || '').trim() || null
      : null;
    const city = fieldToHeader['city']
      ? String(row[fieldToHeader['city']] || '').trim() || null
      : null;
    const state = fieldToHeader['state']
      ? String(row[fieldToHeader['state']] || '').trim() || null
      : null;
    const country = fieldToHeader['country']
      ? String(row[fieldToHeader['country']] || '').trim() || null
      : null;
    const postalCode = fieldToHeader['postalCode']
      ? String(row[fieldToHeader['postalCode']] || '').trim() || null
      : null;
    const notes = fieldToHeader['notes']
      ? String(row[fieldToHeader['notes']] || '').trim() || null
      : null;

    let lifecycleStage = 'PROSPECT';
    if (fieldToHeader['lifecycleStage'] && row[fieldToHeader['lifecycleStage']]) {
      const stageVal = String(row[fieldToHeader['lifecycleStage']]).trim().toUpperCase();
      if (['PROSPECT', 'CUSTOMER', 'INACTIVE'].includes(stageVal)) {
        lifecycleStage = stageVal;
      }
    }

    if (!firstName) {
      failed++;
      errors.push({ rowNumber: rowNum, error: 'First name is required' });
      continue;
    }

    if (email) {
      if (!emailRegex.test(email)) {
        failed++;
        errors.push({ rowNumber: rowNum, error: `Invalid email address format: "${email}"` });
        continue;
      }
      if (existingEmailSet.has(email.toLowerCase())) {
        skipped++;
        continue;
      }
    }

    try {
      let companyId = null;
      if (companyName) {
        let company = await prisma.company.findFirst({
          where: {
            name: { equals: companyName, mode: 'insensitive' },
            deletedAt: null,
          },
        });
        if (!company) {
          company = await prisma.company.create({
            data: {
              name: companyName,
              ownerId: user.id,
            },
          });
        }
        companyId = company.id;
      }

      await prisma.contact.create({
        data: {
          firstName,
          lastName,
          email,
          phone,
          jobTitle,
          companyId,
          ownerId: user.role === 'REP' ? user.id : user.id,
          lifecycleStage,
          addressLine1,
          city,
          state,
          country,
          postalCode,
          notes,
        },
      });

      if (email) {
        existingEmailSet.add(email.toLowerCase());
      }
      created++;
    } catch (err) {
      failed++;
      errors.push({ rowNumber: rowNum, error: err.message || 'Database creation error' });
    }
  }

  return { created, skipped, failed, errors };
}

export async function getContactsForExport(query, user) {
  const where = buildContactWhereClause(query, user);
  const contacts = await prisma.contact.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      company: { select: { name: true } },
      owner: { select: { name: true } },
      source: { select: { name: true } },
    },
  });
  return contacts;
}

export const contactExportColumns = [
  { header: 'First Name', key: 'firstName' },
  { header: 'Last Name', key: 'lastName' },
  { header: 'Email', key: 'email' },
  { header: 'Phone', key: 'phone' },
  { header: 'Job Title', key: 'jobTitle' },
  { header: 'Company', value: (c) => c.company?.name || '' },
  { header: 'Lifecycle Stage', key: 'lifecycleStage' },
  { header: 'Owner', value: (c) => c.owner?.name || '' },
  { header: 'Lead Source', value: (c) => c.source?.name || '' },
  { header: 'City', key: 'city' },
  { header: 'Country', key: 'country' },
  { header: 'Created At', key: 'createdAt' },
];

export default {
  getContacts,
  getContactById,
  getContactOverview,
  createContact,
  updateContact,
  deleteContact,
  bulkContactAction,
  updateContactLastContactedAt,
  previewContactImport,
  commitContactImport,
  getContactsForExport,
  contactExportColumns,
};
