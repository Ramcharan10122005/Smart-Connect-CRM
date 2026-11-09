import 'dotenv/config';
import prisma from '../src/config/prisma.js';

async function main() {
  console.log('[Seed] Seeding default pipeline stages...');

  const defaultStages = [
    { name: 'Lead In', position: 1, probability: 10, type: 'OPEN', color: '#3B82F6' },
    { name: 'Contact Made', position: 2, probability: 30, type: 'OPEN', color: '#6366F1' },
    { name: 'Meeting Scheduled', position: 3, probability: 50, type: 'OPEN', color: '#8B5CF6' },
    { name: 'Proposal Sent', position: 4, probability: 75, type: 'OPEN', color: '#EC4899' },
    { name: 'Closed Won', position: 5, probability: 100, type: 'WON', color: '#10B981' },
    { name: 'Closed Lost', position: 6, probability: 0, type: 'LOST', color: '#EF4444' },
  ];

  for (const stage of defaultStages) {
    const existing = await prisma.pipelineStage.findFirst({
      where: { name: stage.name },
    });
    if (!existing) {
      await prisma.pipelineStage.create({ data: stage });
    }
  }

  console.log('[Seed] Seeding default lead sources...');
  const defaultSources = ['Website Form', 'Referral', 'Inbound Call', 'LinkedIn', 'Cold Outreach'];

  for (const sourceName of defaultSources) {
    await prisma.leadSource.upsert({
      where: { name: sourceName },
      update: {},
      create: { name: sourceName, isActive: true },
    });
  }

  console.log('[Seed] Seeding default tags...');
  const defaultTags = [
    { name: 'High Value', color: '#EF4444' },
    { name: 'Enterprise', color: '#8B5CF6' },
    { name: 'SMB', color: '#3B82F6' },
    { name: 'Hot Lead', color: '#F97316' },
  ];

  for (const tag of defaultTags) {
    await prisma.tag.upsert({
      where: { name: tag.name },
      update: {},
      create: tag,
    });
  }

  console.log('[Seed] Database seeded successfully.');
}

main()
  .catch((e) => {
    console.error('[Seed] Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
