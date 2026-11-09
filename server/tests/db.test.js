import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import prisma from '../src/config/prisma.js';

describe('Prisma Database Connection', () => {
  after(async () => {
    await prisma.$disconnect();
  });

  it('should successfully query database version and seeded stages', async () => {
    const stageCount = await prisma.pipelineStage.count();
    assert.ok(stageCount >= 6, `Expected at least 6 stages, got ${stageCount}`);

    const sourcesCount = await prisma.leadSource.count();
    assert.ok(sourcesCount >= 5, `Expected at least 5 lead sources, got ${sourcesCount}`);
  });
});

