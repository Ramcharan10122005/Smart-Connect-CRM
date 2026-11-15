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
  const range = query.range || '30d';

  const now = new Date();

  // Period window resolution (7d, 30d, 90d, 12m)
  let periodDays = 30;
  if (range === '7d') periodDays = 7;
  else if (range === '90d') periodDays = 90;
  else if (range === '12m') periodDays = 365;

  const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const prevPeriodStart = new Date(now.getTime() - 2 * periodDays * 24 * 60 * 60 * 1000);
  const prevPeriodEnd = periodStart;

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
    periodWonLeads,
    periodLostLeads,
    totalWonLeads,
    totalLostLeads,
    overdueFollowUps,
  ] = await Promise.all([
    // Total customers
    prisma.contact.count({ where: contactBaseWhere }),

    // New customers in period
    prisma.contact.count({
      where: {
        ...contactBaseWhere,
        createdAt: { gte: periodStart },
      },
    }),

    // New customers in previous period of equal length
    prisma.contact.count({
      where: {
        ...contactBaseWhere,
        createdAt: { gte: prevPeriodStart, lte: prevPeriodEnd },
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

    // Leads won in period
    prisma.lead.findMany({
      where: {
        ...leadBaseWhere,
        status: 'WON',
        updatedAt: { gte: periodStart },
      },
      select: { value: true },
    }),

    // Won leads in period count
    prisma.lead.count({
      where: {
        ...leadBaseWhere,
        status: 'WON',
        updatedAt: { gte: periodStart },
      },
    }),

    // Lost leads in period count
    prisma.lead.count({
      where: {
        ...leadBaseWhere,
        status: 'LOST',
        updatedAt: { gte: periodStart },
      },
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

  // % change vs prior period
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

  // Won value in period
  const wonValueThisMonth = wonLeadsThisMonth.reduce(
    (acc, lead) => acc + Number(lead.value || 0),
    0
  );

  // Lead win rate = (won / (won + lost)) * 100
  const periodClosedLeads = periodWonLeads + periodLostLeads;
  const totalClosedLeads = totalWonLeads + totalLostLeads;
  let leadWinRate = 0;
  if (periodClosedLeads > 0) {
    leadWinRate = Math.round((periodWonLeads / periodClosedLeads) * 1000) / 10;
  } else if (totalClosedLeads > 0) {
    leadWinRate = Math.round((totalWonLeads / totalClosedLeads) * 1000) / 10;
  }

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
    range,
  };
}

export async function getCharts(query, user) {
  const targetOwnerId = resolveScopedOwnerId(user, query.ownerId);
  const range = query.range || '12m';
  const now = new Date();

  let rangeDays = 365;
  if (range === '7d') rangeDays = 7;
  else if (range === '30d') rangeDays = 30;
  else if (range === '90d') rangeDays = 90;

  // For pipeline and sources: if specific range (7d, 30d, 90d) is requested, filter leads created in period
  const periodStart =
    query.range && query.range !== '12m'
      ? new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000)
      : null;

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
    where: {
      ...leadBaseWhere,
      ...(periodStart ? { createdAt: { gte: periodStart } } : {}),
    },
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
    where: {
      ...leadBaseWhere,
      ...(periodStart ? { createdAt: { gte: periodStart } } : {}),
    },
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

  // 3. Won Revenue Velocity
  const monthlyWonRevenue = [];

  if (range === '7d') {
    const periodStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const wonLeadsPeriod = await prisma.lead.findMany({
      where: {
        ...leadBaseWhere,
        status: 'WON',
        updatedAt: { gte: periodStartDate },
      },
      select: { value: true, updatedAt: true },
    });

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      let revenue = 0;
      let count = 0;

      for (const l of wonLeadsPeriod) {
        if (new Date(l.updatedAt).toISOString().slice(0, 10) === key) {
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
  } else if (range === '30d') {
    const periodStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const wonLeadsPeriod = await prisma.lead.findMany({
      where: {
        ...leadBaseWhere,
        status: 'WON',
        updatedAt: { gte: periodStartDate },
      },
      select: { value: true, updatedAt: true },
    });

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      let revenue = 0;
      let count = 0;

      for (const l of wonLeadsPeriod) {
        if (new Date(l.updatedAt).toISOString().slice(0, 10) === key) {
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
  } else if (range === '90d') {
    const periodStartDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const wonLeadsPeriod = await prisma.lead.findMany({
      where: {
        ...leadBaseWhere,
        status: 'WON',
        updatedAt: { gte: periodStartDate },
      },
      select: { value: true, updatedAt: true },
    });

    for (let w = 11; w >= 0; w--) {
      const startOfWeek = new Date(now.getTime() - (w + 1) * 7 * 86400000);
      const endOfWeek = new Date(now.getTime() - w * 7 * 86400000);
      const label = startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      let revenue = 0;
      let count = 0;

      for (const l of wonLeadsPeriod) {
        const t = new Date(l.updatedAt).getTime();
        if (t >= startOfWeek.getTime() && t < endOfWeek.getTime()) {
          revenue += Number(l.value || 0);
          count++;
        }
      }

      monthlyWonRevenue.push({
        month: startOfWeek.toISOString().slice(0, 10),
        label: `Wk of ${label}`,
        wonRevenue: Math.round(revenue * 100) / 100,
        count,
      });
    }
  } else {
    // 12M or default (12 monthly buckets)
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
  }

  // 4. New Leads Per Week for Last 12 Weeks (kept 12 weeks for pipeline velocity stability)
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

  // 5. Activities Per Type (dynamically scoped to range)
  const activitySince = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);
  const recentActivities = await prisma.activity.findMany({
    where: {
      ...activityBaseWhere,
      occurredAt: { gte: activitySince },
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
    range,
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
