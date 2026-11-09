import prisma from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Resolves effective owner filter according to RBAC:
 * - REP: strictly scoped to self
 * - MANAGER / ADMIN: can view all or filter by a specific ownerId
 */
function resolveScopedOwnerId(user, requestedOwnerId) {
  if (user.role === 'REP') {
    return user.id;
  }
  return requestedOwnerId || null;
}

export async function getSummary(query, user) {
  const targetOwnerId = resolveScopedOwnerId(user, query.ownerId);

  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const contactBaseWhere = {
    deletedAt: null,
    lifecycleStage: 'CUSTOMER',
    ...(targetOwnerId ? { ownerId: targetOwnerId } : {}),
  };

  const leadBaseWhere = {
    deletedAt: null,
    ...(targetOwnerId ? { ownerId: targetOwnerId } : {}),
  };

  const followUpBaseWhere = {
    ...(targetOwnerId ? { assigneeId: targetOwnerId } : {}),
  };

  const [
    totalCustomers,
    newCustomersThisMonth,
    newCustomersLastMonth,
    openLeads,
    openLeadsWithStage,
    wonLeadsThisMonth,
    totalWonLeads,
    totalLostLeads,
    overdueFollowUps,
  ] = await Promise.all([
    // Total customers
    prisma.contact.count({ where: contactBaseWhere }),

    // New customers this month
    prisma.contact.count({
      where: {
        ...contactBaseWhere,
        createdAt: { gte: startOfThisMonth },
      },
    }),

    // New customers last month
    prisma.contact.count({
      where: {
        ...contactBaseWhere,
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
    }),

    // Total open leads count
    prisma.lead.count({
      where: {
        ...leadBaseWhere,
        status: 'OPEN',
      },
    }),

    // Open leads with stage probability for weighted pipeline calculation
    prisma.lead.findMany({
      where: {
        ...leadBaseWhere,
        status: 'OPEN',
      },
      select: {
        value: true,
        stage: { select: { probability: true } },
      },
    }),

    // Leads won this month
    prisma.lead.findMany({
      where: {
        ...leadBaseWhere,
        status: 'WON',
        updatedAt: { gte: startOfThisMonth },
      },
      select: { value: true },
    }),

    // Lifetime won leads count
    prisma.lead.count({
      where: {
        ...leadBaseWhere,
        status: 'WON',
      },
    }),

    // Lifetime lost leads count
    prisma.lead.count({
      where: {
        ...leadBaseWhere,
        status: 'LOST',
      },
    }),

    // Overdue follow-ups
    prisma.followUp.count({
      where: {
        ...followUpBaseWhere,
        status: 'PENDING',
        dueAt: { lt: now },
      },
    }),
  ]);

  // % change vs last month
  let customerGrowthRate = 0;
  if (newCustomersLastMonth === 0) {
    customerGrowthRate = newCustomersThisMonth > 0 ? 100 : 0;
  } else {
    customerGrowthRate =
      Math.round(((newCustomersThisMonth - newCustomersLastMonth) / newCustomersLastMonth) * 1000) /
      10;
  }

  // Weighted pipeline value = sum(value * probability / 100)
  const weightedPipelineValue = openLeadsWithStage.reduce((acc, lead) => {
    const prob = lead.stage?.probability ?? 0;
    return acc + (Number(lead.value) * prob) / 100;
  }, 0);

  // Won value this month
  const wonValueThisMonth = wonLeadsThisMonth.reduce(
    (acc, lead) => acc + Number(lead.value || 0),
    0
  );

  // Lead win rate = (won / (won + lost)) * 100
  const closedLeads = totalWonLeads + totalLostLeads;
  const leadWinRate = closedLeads > 0 ? Math.round((totalWonLeads / closedLeads) * 1000) / 10 : 0;

  return {
    totalCustomers,
    newCustomersThisMonth,
    newCustomersLastMonth,
    customerGrowthRate,
    openLeads,
    weightedPipelineValue: Math.round(weightedPipelineValue * 100) / 100,
    wonValueThisMonth: Math.round(wonValueThisMonth * 100) / 100,
    leadWinRate,
    overdueFollowUps,
  };
}

export async function getCharts(query, user) {
  const targetOwnerId = resolveScopedOwnerId(user, query.ownerId);
  const now = new Date();

  const leadBaseWhere = {
    deletedAt: null,
    ...(targetOwnerId ? { ownerId: targetOwnerId } : {}),
  };

  const activityBaseWhere = {
    ...(targetOwnerId ? { createdById: targetOwnerId } : {}),
  };

  // 1. Leads by Stage
  const stages = await prisma.pipelineStage.findMany({
    orderBy: { position: 'asc' },
  });

  const leadsInStages = await prisma.lead.groupBy({
    by: ['stageId'],
    where: leadBaseWhere,
    _count: { id: true },
    _sum: { value: true },
  });

  const stageCountMap = new Map();
  leadsInStages.forEach((s) => {
    stageCountMap.set(s.stageId, {
      count: s._count.id,
      value: Number(s._sum.value || 0),
    });
  });

  const leadsByStage = stages.map((st) => ({
    stageId: st.id,
    name: st.name,
    color: st.color,
    type: st.type,
    probability: st.probability,
    count: stageCountMap.get(st.id)?.count || 0,
    value: stageCountMap.get(st.id)?.value || 0,
  }));

  // 2. Leads by Source
  const sources = await prisma.leadSource.findMany();
  const leadsInSources = await prisma.lead.groupBy({
    by: ['sourceId'],
    where: leadBaseWhere,
    _count: { id: true },
    _sum: { value: true },
  });

  const sourceMap = new Map();
  leadsInSources.forEach((s) => {
    if (s.sourceId) {
      sourceMap.set(s.sourceId, {
        count: s._count.id,
        value: Number(s._sum.value || 0),
      });
    }
  });

  const leadsBySource = sources.map((src) => ({
    sourceId: src.id,
    name: src.name,
    count: sourceMap.get(src.id)?.count || 0,
    value: sourceMap.get(src.id)?.value || 0,
  }));

  // 3. Monthly Won Revenue for Last 12 Months
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const wonLeadsLast12Months = await prisma.lead.findMany({
    where: {
      ...leadBaseWhere,
      status: 'WON',
      updatedAt: { gte: twelveMonthsAgo },
    },
    select: {
      value: true,
      updatedAt: true,
    },
  });

  const monthlyWonRevenue = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    let revenue = 0;
    let count = 0;

    for (const l of wonLeadsLast12Months) {
      const lDate = new Date(l.updatedAt);
      const lKey = `${lDate.getFullYear()}-${String(lDate.getMonth() + 1).padStart(2, '0')}`;
      if (lKey === key) {
        revenue += Number(l.value || 0);
        count++;
      }
    }

    monthlyWonRevenue.push({
      month: key,
      label,
      wonRevenue: Math.round(revenue * 100) / 100,
      count,
    });
  }

  // 4. New Leads Per Week for Last 12 Weeks
  const twelveWeeksAgo = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
  const recentLeads = await prisma.lead.findMany({
    where: {
      ...leadBaseWhere,
      createdAt: { gte: twelveWeeksAgo },
    },
    select: {
      value: true,
      createdAt: true,
    },
  });

  const newLeadsPerWeek = [];
  for (let w = 11; w >= 0; w--) {
    const startOfWeek = new Date(now.getTime() - (w + 1) * 7 * 24 * 60 * 60 * 1000);
    const endOfWeek = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);
    const label = startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    let count = 0;
    let value = 0;

    for (const l of recentLeads) {
      const cTime = new Date(l.createdAt).getTime();
      if (cTime >= startOfWeek.getTime() && cTime < endOfWeek.getTime()) {
        count++;
        value += Number(l.value || 0);
      }
    }

    newLeadsPerWeek.push({
      weekStart: startOfWeek.toISOString().slice(0, 10),
      label: `Week of ${label}`,
      count,
      value: Math.round(value * 100) / 100,
    });
  }

  // 5. Activities Per Type for Last 8 Weeks
  const eightWeeksAgo = new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000);
  const recentActivities = await prisma.activity.findMany({
    where: {
      ...activityBaseWhere,
      occurredAt: { gte: eightWeeksAgo },
    },
    select: {
      type: true,
      occurredAt: true,
    },
  });

  const activityCountsByType = {
    CALL: 0,
    EMAIL: 0,
    MEETING: 0,
    NOTE: 0,
    SYSTEM: 0,
  };

  recentActivities.forEach((act) => {
    if (activityCountsByType[act.type] !== undefined) {
      activityCountsByType[act.type]++;
    }
  });

  const activitiesPerType = [
    { type: 'CALL', count: activityCountsByType.CALL },
    { type: 'EMAIL', count: activityCountsByType.EMAIL },
    { type: 'MEETING', count: activityCountsByType.MEETING },
    { type: 'NOTE', count: activityCountsByType.NOTE },
    { type: 'SYSTEM', count: activityCountsByType.SYSTEM },
  ];

  return {
    leadsByStage,
    leadsBySource,
    monthlyWonRevenue,
    newLeadsPerWeek,
    activitiesPerType,
  };
}

export async function getLeaderboard(user) {
  if (user.role === 'REP') {
    throw ApiError.forbidden('Only Managers and Admins can view the sales leaderboard');
  }

  // Find sales reps and active users
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
    },
  });

  const repStats = await Promise.all(
    users.map(async (u) => {
      const [leadsWon, wonValueResult, activitiesLogged, followUpsCompleted] = await Promise.all([
        prisma.lead.count({
          where: {
            ownerId: u.id,
            status: 'WON',
            deletedAt: null,
          },
        }),
        prisma.lead.aggregate({
          where: {
            ownerId: u.id,
            status: 'WON',
            deletedAt: null,
          },
          _sum: { value: true },
        }),
        prisma.activity.count({
          where: {
            createdById: u.id,
          },
        }),
        prisma.followUp.count({
          where: {
            assigneeId: u.id,
            status: 'DONE',
          },
        }),
      ]);

      const wonValue = Number(wonValueResult._sum.value || 0);

      return {
        user: u,
        leadsWon,
        wonValue: Math.round(wonValue * 100) / 100,
        activitiesLogged,
        followUpsCompleted,
      };
    })
  );

  // Sort descending by wonValue, then leadsWon
  repStats.sort((a, b) => b.wonValue - a.wonValue || b.leadsWon - a.leadsWon);

  return repStats;
}

export async function getUpcoming(query, user) {
  const targetOwnerId = resolveScopedOwnerId(user, query.ownerId);
  const now = new Date();

  const [followUps, activities] = await Promise.all([
    // Next 10 follow-ups (due soonest)
    prisma.followUp.findMany({
      where: {
        status: 'PENDING',
        dueAt: { gte: now },
        ...(targetOwnerId ? { assigneeId: targetOwnerId } : {}),
      },
      orderBy: { dueAt: 'asc' },
      take: 10,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        lead: { select: { id: true, title: true, value: true } },
        assignee: { select: { id: true, name: true, avatarUrl: true } },
      },
    }),

    // 10 most recent activities
    prisma.activity.findMany({
      where: {
        ...(targetOwnerId ? { createdById: targetOwnerId } : {}),
      },
      orderBy: { occurredAt: 'desc' },
      take: 10,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        lead: { select: { id: true, title: true } },
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
      },
    }),
  ]);

  return {
    upcomingFollowUps: followUps,
    recentActivities: activities,
  };
}

export default {
  getSummary,
  getCharts,
  getLeaderboard,
  getUpcoming,
};
