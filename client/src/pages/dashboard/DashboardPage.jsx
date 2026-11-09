import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';
import { DashboardHeader } from './components/DashboardHeader';
import { KpiCardsRow } from './components/KpiCardsRow';
import { RevenueChart } from './components/RevenueChart';
import { StageFunnelChart } from './components/StageFunnelChart';
import { LeadSourceChart } from './components/LeadSourceChart';
import { ActivityChart } from './components/ActivityChart';
import { TodaysFollowUpsWidget } from './components/TodaysFollowUpsWidget';
import { RecentActivityWidget } from './components/RecentActivityWidget';
import { LeaderboardWidget } from './components/LeaderboardWidget';

export default function DashboardPage() {
  const { isManager } = useAuthStore();
  const [dateRange, setDateRange] = useState('30d');
  const [selectedRepId, setSelectedRepId] = useState(null);

  // Helper query string builder
  const getParams = () => {
    const params = new URLSearchParams();
    if (selectedRepId) params.append('ownerId', selectedRepId);
    return params.toString() ? `?${params.toString()}` : '';
  };

  // 1. KPI Summary Query
  const {
    data: summaryData,
    isLoading: summaryLoading,
    isError: summaryError,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: queryKeys.dashboard.summary(selectedRepId ? { ownerId: selectedRepId } : {}),
    queryFn: async () => {
      const res = await api.get(`/dashboard/summary${getParams()}`);
      return res.data?.data;
    },
    refetchInterval: 60000,
  });

  // 2. Charts Query
  const {
    data: chartsData,
    isLoading: chartsLoading,
    isError: chartsError,
    refetch: refetchCharts,
  } = useQuery({
    queryKey: queryKeys.dashboard.charts(selectedRepId ? { ownerId: selectedRepId } : {}),
    queryFn: async () => {
      const res = await api.get(`/dashboard/charts${getParams()}`);
      return res.data?.data;
    },
  });

  // 3. Upcoming Activities & Tasks Query
  const {
    data: upcomingData,
    isLoading: upcomingLoading,
    isError: upcomingError,
    refetch: refetchUpcoming,
  } = useQuery({
    queryKey: ['dashboard', 'upcoming', selectedRepId],
    queryFn: async () => {
      const res = await api.get(`/dashboard/upcoming${getParams()}`);
      return res.data?.data;
    },
  });

  // 4. Leaderboard Query (Manager / Admin only)
  const {
    data: leaderboardData,
    isLoading: leaderboardLoading,
    isError: leaderboardError,
    refetch: refetchLeaderboard,
  } = useQuery({
    queryKey: queryKeys.dashboard.leaderboard(),
    queryFn: async () => {
      const res = await api.get('/dashboard/leaderboard');
      return res.data?.data;
    },
    enabled: isManager(),
  });

  // 5. Team Reps Query (for manager filter dropdown)
  const { data: repsData, isLoading: repsLoading } = useQuery({
    queryKey: ['users', 'list', 'filter'],
    queryFn: async () => {
      const res = await api.get('/users?limit=100');
      return res.data?.data?.users || [];
    },
    enabled: isManager(),
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in-50 duration-200">
      {/* 1. Header with greeting, quick actions, date range & rep selector */}
      <DashboardHeader
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        selectedRepId={selectedRepId}
        onRepChange={setSelectedRepId}
        reps={repsData || []}
        loadingReps={repsLoading}
      />

      {/* 2. KPI Cards Row (6 metrics with sparklines and growth rates) */}
      <KpiCardsRow
        summary={summaryData}
        isLoading={summaryLoading}
        isError={summaryError}
        onRetry={refetchSummary}
      />

      {/* 3. Charts Grid (Won Revenue, Pipeline Stages, Lead Sources, Activities) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart
          data={chartsData?.monthlyWonRevenue}
          isLoading={chartsLoading}
          isError={chartsError}
          onRetry={refetchCharts}
        />

        <StageFunnelChart
          data={chartsData?.leadsByStage}
          isLoading={chartsLoading}
          isError={chartsError}
          onRetry={refetchCharts}
        />

        <LeadSourceChart
          data={chartsData?.leadsBySource}
          isLoading={chartsLoading}
          isError={chartsError}
          onRetry={refetchCharts}
        />

        <ActivityChart
          data={chartsData?.activitiesPerType}
          isLoading={chartsLoading}
          isError={chartsError}
          onRetry={refetchCharts}
        />
      </div>

      {/* 4. Operational Row (Today's Follow-ups + Recent Activity Feed) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TodaysFollowUpsWidget ownerId={selectedRepId} />

        <RecentActivityWidget
          activities={upcomingData?.recentActivities || []}
          isLoading={upcomingLoading}
          isError={upcomingError}
          onRetry={refetchUpcoming}
        />
      </div>

      {/* 5. Team Leaderboard (Managers and Admins only) */}
      {isManager() && (
        <LeaderboardWidget
          leaderboard={leaderboardData || []}
          isLoading={leaderboardLoading}
          isError={leaderboardError}
          onRetry={refetchLeaderboard}
        />
      )}
    </div>
  );
}
