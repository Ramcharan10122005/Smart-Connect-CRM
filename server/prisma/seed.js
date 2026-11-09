import 'dotenv/config';
import bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';
import prisma from '../src/config/prisma.js';

// Seed with reproducible randomness for consistent demo fixtures
faker.seed(12345);

async function main() {
  console.log('----------------------------------------------------');
  console.log('[Seed] Starting SmartConnect CRM database seed...');
  console.log('----------------------------------------------------');

  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    console.log('[Seed] Development mode: clearing existing data...');
    // Delete in reverse order of foreign key dependencies
    await prisma.auditLog.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.followUp.deleteMany({});
    await prisma.activity.deleteMany({});
    await prisma.leadStageHistory.deleteMany({});
    await prisma.contactTag.deleteMany({});
    await prisma.companyTag.deleteMany({});
    await prisma.captureForm.deleteMany({});
    await prisma.lead.deleteMany({});
    await prisma.contact.deleteMany({});
    await prisma.company.deleteMany({});
    await prisma.tag.deleteMany({});
    await prisma.pipelineStage.deleteMany({});
    await prisma.leadSource.deleteMany({});
    await prisma.passwordResetToken.deleteMany({});
    await prisma.user.deleteMany({});
    console.log('[Seed] All existing tables wiped.');
  } else {
    console.warn('[Seed] Production mode detected. Skipping table wipe.');
  }

  // -----------------------------------------------------------------
  // 1. SEED USERS
  // -----------------------------------------------------------------
  console.log('[Seed] Seeding users (ADMIN, MANAGER, REPs)...');
  const defaultPassword = 'Admin@123';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@smartconnect.com',
      passwordHash,
      role: 'ADMIN',
      phone: '+1 555-0100',
      isActive: true,
      lastLoginAt: new Date(),
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: 'Sarah Connor',
      email: 'sarah.manager@smartconnect.com',
      passwordHash,
      role: 'MANAGER',
      phone: '+1 555-0101',
      isActive: true,
      lastLoginAt: new Date(Date.now() - 3600 * 1000 * 4),
    },
  });

  const rep1 = await prisma.user.create({
    data: {
      name: 'Alex Rivera',
      email: 'alex.rep@smartconnect.com',
      passwordHash,
      role: 'REP',
      phone: '+1 555-0102',
      isActive: true,
      lastLoginAt: new Date(Date.now() - 3600 * 1000 * 2),
    },
  });

  const rep2 = await prisma.user.create({
    data: {
      name: 'Jordan Lee',
      email: 'jordan.rep@smartconnect.com',
      passwordHash,
      role: 'REP',
      phone: '+1 555-0103',
      isActive: true,
      lastLoginAt: new Date(Date.now() - 3600 * 1000 * 8),
    },
  });

  const rep3 = await prisma.user.create({
    data: {
      name: 'Morgan Smith',
      email: 'morgan.rep@smartconnect.com',
      passwordHash,
      role: 'REP',
      phone: '+1 555-0104',
      isActive: true,
      lastLoginAt: new Date(Date.now() - 3600 * 1000 * 24),
    },
  });

  const reps = [rep1, rep2, rep3];
  const allSalesStaff = [manager, rep1, rep2, rep3];

  // -----------------------------------------------------------------
  // 2. SEED LEAD SOURCES
  // -----------------------------------------------------------------
  console.log('[Seed] Seeding lead sources...');
  const sourceNames = ['Website', 'Referral', 'LinkedIn', 'Cold Call', 'Event', 'Ads', 'Other'];
  const sources = [];
  for (const name of sourceNames) {
    const s = await prisma.leadSource.create({
      data: { name, isActive: true },
    });
    sources.push(s);
  }

  // -----------------------------------------------------------------
  // 3. SEED PIPELINE STAGES
  // -----------------------------------------------------------------
  console.log('[Seed] Seeding pipeline stages...');
  const stageDefs = [
    { name: 'New', position: 1, probability: 10, type: 'OPEN', color: '#3B82F6' },
    { name: 'Contacted', position: 2, probability: 20, type: 'OPEN', color: '#6366F1' },
    { name: 'Qualified', position: 3, probability: 40, type: 'OPEN', color: '#8B5CF6' },
    { name: 'Proposal', position: 4, probability: 60, type: 'OPEN', color: '#EC4899' },
    { name: 'Negotiation', position: 5, probability: 80, type: 'OPEN', color: '#F59E0B' },
    { name: 'Won', position: 6, probability: 100, type: 'WON', color: '#10B981' },
    { name: 'Lost', position: 7, probability: 0, type: 'LOST', color: '#EF4444' },
  ];

  const stages = [];
  for (const s of stageDefs) {
    const stage = await prisma.pipelineStage.create({ data: s });
    stages.push(stage);
  }

  const stageNew = stages.find((s) => s.name === 'New');
  const stageContacted = stages.find((s) => s.name === 'Contacted');
  const stageWon = stages.find((s) => s.name === 'Won');
  const stageLost = stages.find((s) => s.name === 'Lost');

  // -----------------------------------------------------------------
  // 4. SEED TAGS
  // -----------------------------------------------------------------
  console.log('[Seed] Seeding tags...');
  const tagDefs = [
    { name: 'VIP', color: '#EF4444' },
    { name: 'Hot', color: '#F97316' },
    { name: 'Newsletter', color: '#06B6D4' },
    { name: 'Partner', color: '#8B5CF6' },
    { name: 'At Risk', color: '#F43F5E' },
  ];

  const tags = [];
  for (const t of tagDefs) {
    const tag = await prisma.tag.create({ data: t });
    tags.push(tag);
  }

  // -----------------------------------------------------------------
  // 5. SEED 25 COMPANIES
  // -----------------------------------------------------------------
  console.log('[Seed] Seeding 25 companies...');
  const industries = ['SaaS', 'Healthcare', 'Fintech', 'Ecommerce', 'Logistics', 'Marketing', 'Consulting', 'Real Estate'];
  const sizes = ['1-10', '11-50', '51-200', '201-500', '500+'];

  const companies = [];
  for (let i = 0; i < 25; i++) {
    const companyName = faker.company.name();
    const domain = faker.internet.domainName();
    const owner = faker.helpers.arrayElement(reps);

    const company = await prisma.company.create({
      data: {
        name: companyName,
        domain,
        industry: faker.helpers.arrayElement(industries),
        size: faker.helpers.arrayElement(sizes),
        website: `https://${domain}`,
        phone: faker.phone.number({ style: 'national' }),
        addressLine1: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state({ abbreviated: true }),
        country: 'United States',
        postalCode: faker.location.zipCode(),
        notes: faker.company.catchPhrase(),
        ownerId: owner.id,
      },
    });

    // Attach 1-2 random tags
    const chosenTags = faker.helpers.arrayElements(tags, faker.number.int({ min: 1, max: 2 }));
    for (const tag of chosenTags) {
      await prisma.companyTag.create({
        data: {
          companyId: company.id,
          tagId: tag.id,
        },
      });
    }

    companies.push(company);
  }

  // -----------------------------------------------------------------
  // 6. SEED 80 CONTACTS
  // -----------------------------------------------------------------
  console.log('[Seed] Seeding 80 contacts...');
  const lifecycleStages = ['PROSPECT', 'CUSTOMER', 'INACTIVE'];
  const lifecycleWeights = [0.6, 0.3, 0.1]; // 60% prospects, 30% customers, 10% inactive

  const contacts = [];
  for (let i = 0; i < 80; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const company = i < 65 ? faker.helpers.arrayElement(companies) : null;
    const owner = company ? company.ownerId : faker.helpers.arrayElement(reps).id;
    const lifecycleStage = faker.helpers.weightedArrayElement([
      { weight: 60, value: 'PROSPECT' },
      { weight: 30, value: 'CUSTOMER' },
      { weight: 10, value: 'INACTIVE' },
    ]);
    const source = faker.helpers.arrayElement(sources);
    const domain = company?.domain || faker.internet.domainName();
    const email = faker.internet.email({ firstName, lastName, provider: domain }).toLowerCase();

    const contact = await prisma.contact.create({
      data: {
        firstName,
        lastName,
        email,
        phone: faker.phone.number({ style: 'national' }),
        jobTitle: faker.person.jobTitle(),
        companyId: company?.id || null,
        ownerId: owner,
        lifecycleStage,
        sourceId: source.id,
        addressLine1: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state({ abbreviated: true }),
        country: 'United States',
        postalCode: faker.location.zipCode(),
        linkedinUrl: `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
        notes: faker.lorem.sentence(),
        lastContactedAt: faker.date.recent({ days: 30 }),
      },
    });

    // Attach tags
    const chosenTags = faker.helpers.arrayElements(tags, faker.number.int({ min: 1, max: 2 }));
    for (const tag of chosenTags) {
      await prisma.contactTag.create({
        data: {
          contactId: contact.id,
          tagId: tag.id,
        },
      });
    }

    contacts.push(contact);
  }

  // -----------------------------------------------------------------
  // 7. SEED 50 LEADS
  // -----------------------------------------------------------------
  console.log('[Seed] Seeding 50 leads across pipeline stages...');
  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  const lostReasons = ['Competitor chosen', 'Budget constraints', 'Timing not right', 'Ghosted after demo', 'Internal reorganization'];

  const leads = [];
  for (let i = 0; i < 50; i++) {
    const stage = faker.helpers.arrayElement(stages);
    const owner = faker.helpers.arrayElement(reps);
    const source = faker.helpers.arrayElement(sources);
    const linkedContact = faker.helpers.arrayElement(contacts);
    const linkedCompany = linkedContact.companyId
      ? companies.find((c) => c.id === linkedContact.companyId)
      : faker.helpers.arrayElement(companies);

    const isWon = stage.type === 'WON';
    const isLost = stage.type === 'LOST';

    const status = isWon ? 'WON' : isLost ? 'LOST' : 'OPEN';
    const lostReason = isLost ? faker.helpers.arrayElement(lostReasons) : null;
    const convertedContactId = isWon ? linkedContact.id : null;
    const convertedAt = isWon ? faker.date.recent({ days: 45 }) : null;

    // Realistic rounded values from 500 to 50,000
    const rawVal = faker.number.int({ min: 5, max: 500 }) * 100;
    const value = rawVal.toFixed(2);
    const score = faker.number.int({ min: 15, max: 98 });
    const priority = faker.helpers.arrayElement(priorities);

    const title = `${linkedCompany?.name || faker.company.name()} — ${faker.helpers.arrayElement([
      'Enterprise License',
      'Annual Platform Subscription',
      'Team Expansion Tier',
      'Custom Implementation',
      'Pro Integration Package',
      'Core CRM Upgrade',
    ])}`;

    const lead = await prisma.lead.create({
      data: {
        title,
        firstName: linkedContact.firstName,
        lastName: linkedContact.lastName,
        email: linkedContact.email,
        phone: linkedContact.phone,
        companyName: linkedCompany?.name || null,
        companyId: linkedCompany?.id || null,
        contactId: linkedContact.id,
        value,
        currency: 'USD',
        sourceId: source.id,
        stageId: stage.id,
        ownerId: owner.id,
        score,
        priority,
        expectedCloseDate: isWon
          ? convertedAt
          : isLost
            ? faker.date.recent({ days: 30 })
            : faker.date.soon({ days: 60 }),
        status,
        lostReason,
        convertedContactId,
        convertedAt,
        createdAt: faker.date.recent({ days: 80 }),
      },
    });

    // Create Stage History
    await prisma.leadStageHistory.create({
      data: {
        leadId: lead.id,
        fromStageId: null,
        toStageId: stageNew.id,
        changedById: owner.id,
        changedAt: lead.createdAt,
      },
    });

    if (stage.id !== stageNew.id) {
      await prisma.leadStageHistory.create({
        data: {
          leadId: lead.id,
          fromStageId: stageNew.id,
          toStageId: stage.id,
          changedById: owner.id,
          changedAt: new Date(lead.createdAt.getTime() + 86400 * 1000 * faker.number.int({ min: 2, max: 15 })),
        },
      });
    }

    leads.push(lead);
  }

  // -----------------------------------------------------------------
  // 8. SEED 200 ACTIVITIES ACROSS LAST 90 DAYS
  // -----------------------------------------------------------------
  console.log('[Seed] Seeding 200 activities across the last 90 days...');
  const activityTypes = ['CALL', 'EMAIL', 'MEETING', 'NOTE', 'SYSTEM'];
  const callOutcomes = ['Connected - Interested', 'Left Voicemail', 'Gatekeeper Blocked', 'Wrong Number', 'Callback Scheduled'];
  const meetingOutcomes = ['Demo Completed - Highly Engaged', 'Rescheduled by Prospect', 'Scope Discussed', 'Pricing Presented'];

  for (let i = 0; i < 200; i++) {
    const type = faker.helpers.arrayElement(activityTypes);
    const creator = faker.helpers.arrayElement(allSalesStaff);
    const contact = faker.helpers.arrayElement(contacts);
    const lead = faker.helpers.arrayElement(leads);
    const occurredAt = faker.date.recent({ days: 90 });

    let subject = '';
    let body = '';
    let outcome = null;
    let durationMinutes = null;

    switch (type) {
      case 'CALL':
        subject = `Phone outreach with ${contact.firstName} ${contact.lastName}`;
        outcome = faker.helpers.arrayElement(callOutcomes);
        durationMinutes = faker.number.int({ min: 3, max: 25 });
        body = `Discussed current sales tooling pain points. Client expressed interest in modern pipeline tracking. Outcome: ${outcome}`;
        break;
      case 'EMAIL':
        subject = faker.helpers.arrayElement([
          `Follow up: SmartConnect CRM product overview`,
          `Introduction to SmartConnect sales features`,
          `Checking in regarding contract terms`,
          `Pricing proposal and volume discounts`,
          `Demo scheduling availability`,
        ]);
        body = faker.lorem.paragraph();
        break;
      case 'MEETING':
        subject = `Executive demo & Q&A session with ${contact.companyId ? 'team' : contact.firstName}`;
        outcome = faker.helpers.arrayElement(meetingOutcomes);
        durationMinutes = faker.helpers.arrayElement([30, 45, 60]);
        body = `Walked through core CRM capabilities: Customer 360, Kanban deal board, and automated follow-ups. ${outcome}`;
        break;
      case 'NOTE':
        subject = `Internal Note: Account qualification update`;
        body = `Client budget confirmed for next fiscal quarter. Key decision maker is VP of Sales. Priority level elevated.`;
        break;
      case 'SYSTEM':
        subject = `System Event: Lead stage updated`;
        body = `Automated notification: Lead progression recorded and assigned to ${creator.name}`;
        break;
    }

    await prisma.activity.create({
      data: {
        type,
        subject,
        body,
        outcome,
        durationMinutes,
        occurredAt,
        contactId: contact.id,
        companyId: contact.companyId || null,
        leadId: faker.datatype.boolean() ? lead.id : null,
        createdById: creator.id,
        createdAt: occurredAt,
      },
    });
  }

  // -----------------------------------------------------------------
  // 9. SEED 45 FOLLOW-UPS
  // -----------------------------------------------------------------
  console.log('[Seed] Seeding 45 follow-ups (overdue, today, upcoming, done, snoozed)...');
  const now = new Date();

  // 12 Overdue (due between 14 days ago and yesterday)
  for (let i = 0; i < 12; i++) {
    const assignee = faker.helpers.arrayElement(reps);
    const contact = faker.helpers.arrayElement(contacts);
    const lead = faker.helpers.arrayElement(leads);
    const dueAt = faker.date.recent({ days: 14, refDate: new Date(Date.now() - 86400 * 1000) });

    await prisma.followUp.create({
      data: {
        title: faker.helpers.arrayElement([
          `Follow up on overdue proposal with ${contact.firstName}`,
          `Call regarding contract review`,
          `Send revised enterprise pricing quote`,
          `Check status of procurement sign-off`,
        ]),
        description: `Prospect requested additional compliance documentation. Need to re-engage urgently.`,
        dueAt,
        priority: faker.helpers.arrayElement(['HIGH', 'URGENT']),
        status: 'PENDING',
        recurrence: 'NONE',
        contactId: contact.id,
        leadId: lead.id,
        assigneeId: assignee.id,
        createdById: manager.id,
      },
    });
  }

  // 8 Today (due today between 09:00 and 18:00)
  for (let i = 0; i < 8; i++) {
    const assignee = faker.helpers.arrayElement(reps);
    const contact = faker.helpers.arrayElement(contacts);
    const todayDue = new Date();
    todayDue.setHours(faker.number.int({ min: 9, max: 18 }), faker.number.int({ min: 0, max: 59 }), 0, 0);

    await prisma.followUp.create({
      data: {
        title: faker.helpers.arrayElement([
          `Send discovery call summary to ${contact.firstName}`,
          `Confirm demo attendees for tomorrow`,
          `Review onboarding roadmap`,
          `Call back to discuss technical questions`,
        ]),
        description: `Action item from morning standup. Ensure demo environment is populated.`,
        dueAt: todayDue,
        priority: 'MEDIUM',
        status: 'PENDING',
        recurrence: 'NONE',
        contactId: contact.id,
        assigneeId: assignee.id,
        createdById: assignee.id,
      },
    });
  }

  // 15 Upcoming (due in next 1 to 30 days)
  for (let i = 0; i < 15; i++) {
    const assignee = faker.helpers.arrayElement(reps);
    const contact = faker.helpers.arrayElement(contacts);
    const lead = faker.helpers.arrayElement(leads);
    const dueAt = faker.date.soon({ days: 30, refDate: new Date(Date.now() + 86400 * 1000) });

    await prisma.followUp.create({
      data: {
        title: faker.helpers.arrayElement([
          `Quarterly business check-in with ${contact.firstName}`,
          `Renewal touchpoint call`,
          `Send updated product roadmap deck`,
          `Present proposal to VP of Revenue`,
          `Schedule technical integration session`,
        ]),
        description: `Scheduled touchpoint following initial qualification.`,
        dueAt,
        priority: faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH']),
        status: 'PENDING',
        recurrence: faker.helpers.arrayElement(['NONE', 'WEEKLY', 'MONTHLY']),
        contactId: contact.id,
        leadId: lead.id,
        assigneeId: assignee.id,
        createdById: assignee.id,
      },
    });
  }

  // 6 Completed (done)
  for (let i = 0; i < 6; i++) {
    const assignee = faker.helpers.arrayElement(reps);
    const contact = faker.helpers.arrayElement(contacts);
    const dueAt = faker.date.recent({ days: 10 });
    const completedAt = new Date(dueAt.getTime() + 3600 * 1000 * 2);

    await prisma.followUp.create({
      data: {
        title: `Introductory qualification call with ${contact.firstName}`,
        description: `Completed successfully. Key requirements captured and added to CRM profile.`,
        dueAt,
        priority: 'MEDIUM',
        status: 'DONE',
        recurrence: 'NONE',
        contactId: contact.id,
        assigneeId: assignee.id,
        createdById: assignee.id,
        completedAt,
      },
    });
  }

  // 4 Snoozed
  for (let i = 0; i < 4; i++) {
    const assignee = faker.helpers.arrayElement(reps);
    const contact = faker.helpers.arrayElement(contacts);
    const snoozedUntil = faker.date.soon({ days: 7, refDate: new Date(Date.now() + 86400 * 1000 * 2) });

    await prisma.followUp.create({
      data: {
        title: `Re-evaluate pipeline fit for ${contact.firstName}`,
        description: `Prospect currently out of office on holiday. Snoozed until return.`,
        dueAt: new Date(Date.now() - 86400 * 1000),
        snoozedUntil,
        priority: 'LOW',
        status: 'SNOOZED',
        recurrence: 'NONE',
        contactId: contact.id,
        assigneeId: assignee.id,
        createdById: assignee.id,
      },
    });
  }

  // -----------------------------------------------------------------
  // 10. SEED DEFAULT CAPTURE FORM
  // -----------------------------------------------------------------
  console.log('[Seed] Seeding default public capture form...');
  const websiteSource = sources.find((s) => s.name === 'Website') || sources[0];
  await prisma.captureForm.create({
    data: {
      key: 'default-inbound-lead-form',
      name: 'Default Inbound Lead Capture',
      defaultSourceId: websiteSource.id,
      defaultOwnerId: rep1.id,
      isActive: true,
    },
  });

  // -----------------------------------------------------------------
  // 11. COUNT SUMMARY
  // -----------------------------------------------------------------
  const [
    userCount,
    companyCount,
    contactCount,
    leadCount,
    activityCount,
    followUpCount,
    stageCount,
    sourceCount,
    tagCount,
    formCount,
    historyCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.company.count(),
    prisma.contact.count(),
    prisma.lead.count(),
    prisma.activity.count(),
    prisma.followUp.count(),
    prisma.pipelineStage.count(),
    prisma.leadSource.count(),
    prisma.tag.count(),
    prisma.captureForm.count(),
    prisma.leadStageHistory.count(),
  ]);

  console.log('\n====================================================');
  console.log('       SMARTCONNECT CRM — SEED SUMMARY TABLE       ');
  console.log('====================================================');
  console.table([
    { Table: 'User', Count: userCount },
    { Table: 'Company', Count: companyCount },
    { Table: 'Contact', Count: contactCount },
    { Table: 'Lead', Count: leadCount },
    { Table: 'LeadStageHistory', Count: historyCount },
    { Table: 'Activity', Count: activityCount },
    { Table: 'FollowUp', Count: followUpCount },
    { Table: 'PipelineStage', Count: stageCount },
    { Table: 'LeadSource', Count: sourceCount },
    { Table: 'Tag', Count: tagCount },
    { Table: 'CaptureForm', Count: formCount },
  ]);
  console.log('====================================================\n');
  console.log('[Seed] Demo Credentials:');
  console.log('  • ADMIN:   admin@smartconnect.com       / Admin@123');
  console.log('  • MANAGER: sarah.manager@smartconnect.com / Admin@123');
  console.log('  • REPs:    alex.rep@smartconnect.com    / Admin@123');
  console.log('             jordan.rep@smartconnect.com  / Admin@123');
  console.log('             morgan.rep@smartconnect.com  / Admin@123');
  console.log('====================================================\n');
}

main()
  .catch((e) => {
    console.error('[Seed] Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
