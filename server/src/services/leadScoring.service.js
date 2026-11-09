import prisma from '../config/prisma.js';

/**
 * Computes a deterministic lead score (0-100) based on domain qualification rules:
 * 1. Contact completeness (max 20 pts)
 * 2. Deal value size (max 25 pts)
 * 3. Lead source quality (max 15 pts)
 * 4. Recent engagement velocity in the last 14 days (max 20 pts)
 * 5. Pipeline stage probability (max 20 pts)
 */
export function calculateScoreFromParameters({
  email,
  phone,
  value = 0,
  sourceName = '',
  recentActivityCount = 0,
  stageProbability = 0,
}) {
  let score = 0;

  // 1. Contact Completeness (0-20 pts)
  if (email && email.includes('@')) score += 10;
  if (phone && phone.trim().length >= 7) score += 10;

  // 2. Deal Value Size (0-25 pts)
  const numValue = Number(value) || 0;
  if (numValue >= 25000) {
    score += 25;
  } else if (numValue >= 10000) {
    score += 20;
  } else if (numValue >= 5000) {
    score += 15;
  } else if (numValue >= 1000) {
    score += 10;
  } else if (numValue > 0) {
    score += 5;
  }

  // 3. Lead Source Quality (0-15 pts)
  const normalizedSource = (sourceName || '').toLowerCase();
  if (normalizedSource.includes('referral') || normalizedSource.includes('inbound')) {
    score += 15;
  } else if (normalizedSource.includes('website')) {
    score += 12;
  } else if (normalizedSource.includes('linkedin')) {
    score += 10;
  } else if (normalizedSource.includes('event')) {
    score += 8;
  } else if (normalizedSource.includes('ad')) {
    score += 6;
  } else if (normalizedSource) {
    score += 4;
  }

  // 4. Activity Velocity in the last 14 days (0-20 pts)
  if (recentActivityCount >= 5) {
    score += 20;
  } else if (recentActivityCount >= 3) {
    score += 15;
  } else if (recentActivityCount >= 1) {
    score += 10;
  }

  // 5. Pipeline Stage Probability (0-20 pts)
  const prob = Number(stageProbability) || 0;
  score += Math.round((Math.min(100, Math.max(0, prob)) / 100) * 20);

  return Math.min(100, Math.max(0, score));
}

/**
 * Recomputes and persists the score for a specific lead ID.
 */
export async function recomputeLeadScore(leadId) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      stage: true,
      source: true,
      contact: true,
    },
  });

  if (!lead) return null;

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const recentActivityCount = await prisma.activity.count({
    where: {
      leadId,
      occurredAt: { gte: fourteenDaysAgo },
    },
  });

  const email = lead.email || lead.contact?.email;
  const phone = lead.phone || lead.contact?.phone;
  const sourceName = lead.source?.name || '';
  const stageProbability = lead.stage?.probability || 0;

  const score = calculateScoreFromParameters({
    email,
    phone,
    value: lead.value,
    sourceName,
    recentActivityCount,
    stageProbability,
  });

  if (score !== lead.score) {
    await prisma.lead.update({
      where: { id: leadId },
      data: { score },
    });
  }

  return score;
}

export default {
  calculateScoreFromParameters,
  recomputeLeadScore,
};
