import prisma from '../config/prisma.js';

function parseDateRange(query) {
  const to = query.to ? new Date(query.to) : new Date();
  // Default to 90 days ago if from is not provided
  const from = query.from
    ? new Date(query.from)
    : new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000);

  return { from, to };
}

function resolveOwnerScope(user, queryOwnerId) {
  if (user.role === 'REP') {
    return user.id;
  }
  return queryOwnerId || null;
}

// -------------------------------------------------------------
// 1. Sales Performance Report
// -------------------------------------------------------------
export async function getSalesPerformance(query, user) {
  const { from, to } = parseDateRange(query);
  const ownerId = resolveOwnerScope(user, query.ownerId);

  const baseWhere = {
    deletedAt: null,
    createdAt: { gte: from, lte: to },
    ...(ownerId ? { ownerId } : {}),
  };

  const [leadsCreated, wonLeads, lostLeads, openLeads] = await Promise.all([
    prisma.lead.count({ where: baseWhere }),
    prisma.lead.findMany({
      where: {
        ...baseWhere,
        status: 'WON',
      },
      select: {
        id: true,
        title: true,
        value: true,
        createdAt: true,
        updatedAt: true,
        owner: { select: { id: true, name: true } },
      },
    }),
    prisma.lead.count({
      where: {
        ...baseWhere,
        status: 'LOST',
      },
    }),
    prisma.lead.findMany({
      where: {
        ...baseWhere,
        status: 'OPEN',
      },
      select: { value: true },
    }),
  ]);

  const wonCount = wonLeads.length;
  const totalWonValue = wonLeads.reduce((acc, l) => acc + Number(l.value || 0), 0);
  const totalOpenValue = openLeads.reduce((acc, l) => acc + Number(l.value || 0), 0);

  const closedCount = wonCount + lostLeads;
  const winRate = closedCount > 0 ? Math.round((wonCount / closedCount) * 1000) / 10 : 0;
  const avgDealSize = wonCount > 0 ? Math.round((totalWonValue / wonCount) * 100) / 100 : 0;

  // Average sales cycle in days for won leads
  let totalCycleDays = 0;
  wonLeads.forEach((l) => {
    const diff =
      (new Date(l.updatedAt).getTime() - new Date(l.createdAt).getTime()) / (1000 * 3600 * 24);
    totalCycleDays += Math.max(0, diff);
  });
  const avgCycleDays = wonCount > 0 ? Math.round((totalCycleDays / wonCount) * 10) / 10 : 0;

  // Monthly breakdown rows
  const monthMap = new Map();
  wonLeads.forEach((l) => {
    const d = new Date(l.updatedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap.has(key)) {
      monthMap.set(key, { period: key, leadsWon: 0, wonValue: 0 });
    }
    const item = monthMap.get(key);
    item.leadsWon++;
    item.wonValue += Number(l.value || 0);
  });

  const breakdown = Array.from(monthMap.values()).sort((a, b) => a.period.localeCompare(b.period));

  return {
    period: { from: from.toISOString(), to: to.toISOString() },
    summary: {
      leadsCreated,
      leadsWon: wonCount,
      leadsLost: lostLeads,
      openLeads: openLeads.length,
      totalWonValue: Math.round(totalWonValue * 100) / 100,
      totalOpenValue: Math.round(totalOpenValue * 100) / 100,
      winRate,
      avgDealSize,
      avgCycleDays,
    },
    breakdown,
  };
}

export const salesPerformanceColumns = [
  { header: 'Period', key: 'period' },
  { header: 'Leads Won', key: 'leadsWon' },
  { header: 'Won Revenue', key: 'wonValue' },
];

// -------------------------------------------------------------
// 2. Lead Funnel Report
// -------------------------------------------------------------
export async function getLeadFunnel(query, user) {
  const { from, to } = parseDateRange(query);
  const ownerId = resolveOwnerScope(user, query.ownerId);

  const stages = await prisma.pipelineStage.findMany({
    orderBy: { position: 'asc' },
  });

  const leadsInStages = await prisma.lead.groupBy({
    by: ['stageId'],
    where: {
      deletedAt: null,
      createdAt: { gte: from, lte: to },
      ...(ownerId ? { ownerId } : {}),
    },
    _count: { id: true },
    _sum: { value: true },
  });

  const stageCounts = new Map();
  leadsInStages.forEach((s) => {
    stageCounts.set(s.stageId, {
      count: s._count.id,
      value: Number(s._sum.value || 0),
    });
  });

  const totalLeads = leadsInStages.reduce((acc, s) => acc + s._count.id, 0);

  let prevCount = totalLeads;
  const funnel = stages.map((st, idx) => {
    const stats = stageCounts.get(st.id) || { count: 0, value: 0 };
    const conversionRate = prevCount > 0 ? Math.round((stats.count / prevCount) * 1000) / 10 : 0;
    const overallConversion =
      totalLeads > 0 ? Math.round((stats.count / totalLeads) * 1000) / 10 : 0;

    if (idx > 0 && stats.count > 0) {
      prevCount = stats.count;
    }

    return {
      stageId: st.id,
      stageName: st.name,
      stageType: st.type,
      probability: st.probability,
      leadsCount: stats.count,
      totalValue: Math.round(stats.value * 100) / 100,
      conversionRate,
      overallConversion,
    };
  });

  return {
    period: { from: from.toISOString(), to: to.toISOString() },
    totalLeads,
    funnel,
  };
}

export const leadFunnelColumns = [
  { header: 'Stage', key: 'stageName' },
  { header: 'Type', key: 'stageType' },
  { header: 'Probability (%)', key: 'probability' },
  { header: 'Leads Count', key: 'leadsCount' },
  { header: 'Total Value', key: 'totalValue' },
  { header: 'Conversion Rate (%)', key: 'conversionRate' },
  { header: 'Overall Conversion (%)', key: 'overallConversion' },
];

// -------------------------------------------------------------
// 3. Lead Source Performance Report
// -------------------------------------------------------------
export async function getLeadSourcePerformance(query, user) {
  const { from, to } = parseDateRange(query);
  const ownerId = resolveOwnerScope(user, query.ownerId);

  const sources = await prisma.leadSource.findMany();

  const leads = await prisma.lead.findMany({
    where: {
      deletedAt: null,
      createdAt: { gte: from, lte: to },
      ...(ownerId ? { ownerId } : {}),
    },
    select: {
      sourceId: true,
      status: true,
      value: true,
    },
  });

  const sourceStatsMap = new Map();
  sources.forEach((s) => {
    sourceStatsMap.set(s.id, {
      sourceId: s.id,
      sourceName: s.name,
      totalLeads: 0,
      wonLeads: 0,
      lostLeads: 0,
      openLeads: 0,
      wonValue: 0,
      totalValue: 0,
    });
  });

  leads.forEach((l) => {
    if (l.sourceId && sourceStatsMap.has(l.sourceId)) {
      const stat = sourceStatsMap.get(l.sourceId);
      stat.totalLeads++;
      stat.totalValue += Number(l.value || 0);
      if (l.status === 'WON') {
        stat.wonLeads++;
        stat.wonValue += Number(l.value || 0);
      } else if (l.status === 'LOST') {
        stat.lostLeads++;
      } else {
        stat.openLeads++;
      }
    }
  });

  const sourceReport = Array.from(sourceStatsMap.values()).map((s) => {
    const closed = s.wonLeads + s.lostLeads;
    const winRate = closed > 0 ? Math.round((s.wonLeads / closed) * 1000) / 10 : 0;
    const avgValue = s.totalLeads > 0 ? Math.round((s.totalValue / s.totalLeads) * 100) / 100 : 0;

    return {
      ...s,
      wonValue: Math.round(s.wonValue * 100) / 100,
      totalValue: Math.round(s.totalValue * 100) / 100,
      winRate,
      avgValue,
    };
  });

  return {
    period: { from: from.toISOString(), to: to.toISOString() },
    sources: sourceReport,
  };
}

export const leadSourceColumns = [
  { header: 'Lead Source', key: 'sourceName' },
  { header: 'Total Leads', key: 'totalLeads' },
  { header: 'Won Leads', key: 'wonLeads' },
  { header: 'Lost Leads', key: 'lostLeads' },
  { header: 'Open Leads', key: 'openLeads' },
  { header: 'Won Value', key: 'wonValue' },
  { header: 'Win Rate (%)', key: 'winRate' },
  { header: 'Avg Lead Value', key: 'avgValue' },
];

// -------------------------------------------------------------
// 4. Rep Activity Report
// -------------------------------------------------------------
export async function getRepActivity(query, user) {
  const { from, to } = parseDateRange(query);
  const ownerId = resolveOwnerScope(user, query.ownerId);

  // If rep, report only includes self
  const repWhere = {
    isActive: true,
    ...(ownerId ? { id: ownerId } : {}),
  };

  const reps = await prisma.user.findMany({
    where: repWhere,
    select: { id: true, name: true, email: true, role: true },
  });

  const repReports = await Promise.all(
    reps.map(async (rep) => {
      const [activities, completedFollowUps] = await Promise.all([
        prisma.activity.findMany({
          where: {
            createdById: rep.id,
            occurredAt: { gte: from, lte: to },
          },
          select: { type: true },
        }),
        prisma.followUp.count({
          where: {
            assigneeId: rep.id,
            status: 'DONE',
            completedAt: { gte: from, lte: to },
          },
        }),
      ]);

      const counts = { CALL: 0, EMAIL: 0, MEETING: 0, NOTE: 0, SYSTEM: 0 };
      activities.forEach((act) => {
        if (counts[act.type] !== undefined) {
          counts[act.type]++;
        }
      });

      return {
        repId: rep.id,
        repName: rep.name,
        email: rep.email,
        role: rep.role,
        calls: counts.CALL,
        emails: counts.EMAIL,
        meetings: counts.MEETING,
        notes: counts.NOTE,
        system: counts.SYSTEM,
        totalActivities: activities.length,
        followUpsCompleted: completedFollowUps,
      };
    })
  );

  return {
    period: { from: from.toISOString(), to: to.toISOString() },
    reps: repReports,
  };
}

export const repActivityColumns = [
  { header: 'Rep Name', key: 'repName' },
  { header: 'Email', key: 'email' },
  { header: 'Role', key: 'role' },
  { header: 'Calls Logged', key: 'calls' },
  { header: 'Emails Sent', key: 'emails' },
  { header: 'Meetings Held', key: 'meetings' },
  { header: 'Notes Taken', key: 'notes' },
  { header: 'Total Activities', key: 'totalActivities' },
  { header: 'Follow-ups Completed', key: 'followUpsCompleted' },
];

// -------------------------------------------------------------
// 5. Customer Growth Report
// -------------------------------------------------------------
export async function getCustomerGrowth(query, user) {
  const { from, to } = parseDateRange(query);
  const ownerId = resolveOwnerScope(user, query.ownerId);

  const customers = await prisma.contact.findMany({
    where: {
      deletedAt: null,
      lifecycleStage: 'CUSTOMER',
      createdAt: { lte: to },
      ...(ownerId ? { ownerId } : {}),
    },
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  // Monthly buckets between from and to
  const monthMap = new Map();
  let cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const endCursor = new Date(to.getFullYear(), to.getMonth(), 1);

  while (cursor <= endCursor) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    monthMap.set(key, {
      period: key,
      label: cursor.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      newCustomers: 0,
      cumulativeCustomers: 0,
      growthRate: 0,
    });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  let runningTotal = 0;
  customers.forEach((c) => {
    const d = new Date(c.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (d < from) {
      runningTotal++;
    } else if (monthMap.has(key)) {
      monthMap.get(key).newCustomers++;
    }
  });

  let previousMonthCount = runningTotal;
  const growth = Array.from(monthMap.values()).map((m) => {
    runningTotal += m.newCustomers;
    m.cumulativeCustomers = runningTotal;
    if (previousMonthCount === 0) {
      m.growthRate = m.newCustomers > 0 ? 100 : 0;
    } else {
      m.growthRate = Math.round((m.newCustomers / previousMonthCount) * 1000) / 10;
    }
    previousMonthCount = runningTotal;
    return m;
  });

  return {
    period: { from: from.toISOString(), to: to.toISOString() },
    growth,
  };
}

export const customerGrowthColumns = [
  { header: 'Period', key: 'label' },
  { header: 'New Customers', key: 'newCustomers' },
  { header: 'Cumulative Customers', key: 'cumulativeCustomers' },
  { header: 'Growth Rate (%)', key: 'growthRate' },
];

export default {
  getSalesPerformance,
  getLeadFunnel,
  getLeadSourcePerformance,
  getRepActivity,
  getCustomerGrowth,
  salesPerformanceColumns,
  leadFunnelColumns,
  leadSourceColumns,
  repActivityColumns,
  customerGrowthColumns,
};
