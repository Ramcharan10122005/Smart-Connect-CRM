import { useNavigate } from 'react-router-dom';
import {
  Users,
  Target,
  BadgeDollarSign,
  Trophy,
  Percent,
  ClockAlert,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function MiniSparkline({ data = [], color = '#4F46E5', isPositive = true }) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 64;
  const height = 24;

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const strokeColor = color || (isPositive ? '#10B981' : '#EF4444');

  return (
    <svg width={width} height={height} className="overflow-visible shrink-0 opacity-80">
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export function KpiCardsRow({ summary, isLoading = false }) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="p-4 space-y-2">
            <div className="flex justify-between items-center">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-14" />
          </Card>
        ))}
      </div>
    );
  }

  const {
    totalCustomers = 0,
    customerGrowthRate = 0,
    openLeads = 0,
    weightedPipelineValue = 0,
    wonValueThisMonth = 0,
    leadWinRate = 0,
    overdueFollowUps = 0,
  } = summary || {};

  const cards = [
    {
      title: 'Total Customers',
      value: totalCustomers.toLocaleString(),
      subtitle: `${customerGrowthRate >= 0 ? '+' : ''}${customerGrowthRate}% vs last mo`,
      trend: customerGrowthRate >= 0 ? 'up' : 'down',
      icon: Users,
      route: '/customers?stage=CUSTOMER',
      sparkline: [2, 4, 3, 5, 7, 8, totalCustomers || 9],
      color: '#4F46E5',
    },
    {
      title: 'Open Deals',
      value: openLeads.toLocaleString(),
      subtitle: 'Active opportunities',
      trend: 'neutral',
      icon: Target,
      route: '/leads?status=OPEN',
      sparkline: [5, 8, 6, 9, 7, 10, openLeads || 12],
      color: '#6366F1',
    },
    {
      title: 'Weighted Pipeline',
      value: formatCurrency(weightedPipelineValue),
      subtitle: 'Probability-adjusted',
      trend: 'neutral',
      icon: BadgeDollarSign,
      route: '/leads',
      sparkline: [12000, 18000, 15000, 22000, 28000, weightedPipelineValue || 35000],
      color: '#3B82F6',
    },
    {
      title: 'Won This Month',
      value: formatCurrency(wonValueThisMonth),
      subtitle: 'Closed won revenue',
      trend: wonValueThisMonth > 0 ? 'up' : 'neutral',
      icon: Trophy,
      route: '/leads?status=WON',
      sparkline: [0, 5000, 12000, 18000, wonValueThisMonth || 25000],
      color: '#10B981',
    },
    {
      title: 'Lead Win Rate',
      value: `${leadWinRate}%`,
      subtitle: 'Deals closed won',
      trend: leadWinRate >= 25 ? 'up' : 'neutral',
      icon: Percent,
      route: '/leads',
      sparkline: [15, 18, 22, 20, 26, leadWinRate || 30],
      color: '#06B6D4',
    },
    {
      title: 'Overdue Follow-ups',
      value: overdueFollowUps.toLocaleString(),
      subtitle: overdueFollowUps > 0 ? 'Immediate action required' : 'All tasks on schedule',
      trend: overdueFollowUps > 0 ? 'alert' : 'positive',
      icon: ClockAlert,
      route: '/follow-ups?view=overdue',
      sparkline: [3, 2, 4, 1, overdueFollowUps || 0],
      color: overdueFollowUps > 0 ? '#EF4444' : '#10B981',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        const isAlert = card.trend === 'alert';
        const isUp = card.trend === 'up';
        const isDown = card.trend === 'down';

        return (
          <Card
            key={idx}
            onClick={() => navigate(card.route)}
            className={`group cursor-pointer transition-all duration-200 hover:shadow-card hover:-translate-y-0.5 border select-none ${
              isAlert ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20' : ''
            }`}
          >
            <CardContent className="p-3.5 flex flex-col justify-between h-full space-y-2">
              {/* Header: Title and Icon */}
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-medium tracking-tight truncate mr-1">
                  {card.title}
                </span>
                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors group-hover:text-primary ${
                    isAlert ? 'text-rose-600 dark:text-rose-400' : ''
                  }`}
                />
              </div>

              {/* Value and Sparkline */}
              <div className="flex items-baseline justify-between gap-1">
                <span
                  className={`text-lg sm:text-xl font-bold tracking-tight truncate ${
                    isAlert ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-foreground'
                  }`}
                >
                  {card.value}
                </span>
                <MiniSparkline
                  data={card.sparkline}
                  color={card.color}
                  isPositive={!isDown && !isAlert}
                />
              </div>

              {/* Trend / Subtitle */}
              <div className="flex items-center gap-1 text-[11px] pt-0.5">
                {isUp && <ArrowUpRight className="h-3 w-3 text-emerald-600 shrink-0" />}
                {isDown && <ArrowDownRight className="h-3 w-3 text-rose-600 shrink-0" />}
                <span
                  className={`truncate font-medium ${
                    isAlert
                      ? 'text-rose-600 dark:text-rose-400 font-semibold'
                      : isUp
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : isDown
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-muted-foreground'
                  }`}
                >
                  {card.subtitle}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default KpiCardsRow;
