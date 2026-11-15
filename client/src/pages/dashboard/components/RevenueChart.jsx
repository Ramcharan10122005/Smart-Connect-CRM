import { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useUIStore } from '@/stores/uiStore';
import { formatCurrency } from '@/lib/utils';
import { WidgetCard } from './WidgetCard';

export function RevenueChart({
  data = [],
  range = '12m',
  isLoading = false,
  isError = false,
  onRetry,
}) {
  const { theme } = useUIStore();
  const isDark = theme === 'dark';

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((item) => ({
      name: item.label || item.month,
      revenue: item.wonRevenue || 0,
      count: item.count || 0,
    }));
  }, [data]);

  const totalWonRevenue = useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.revenue, 0);
  }, [chartData]);

  const rangeLabels = {
    '7d': '7-day',
    '30d': '30-day',
    '90d': '90-day',
    '12m': '12-month',
  };
  const rangeText = rangeLabels[range] || 'Period';

  return (
    <WidgetCard
      title="Won Revenue Velocity"
      description={`${rangeText} closed won volume: ${formatCurrency(totalWonRevenue)}`}
      isLoading={isLoading}
      isError={isError}
      onRetry={onRetry}
    >
      <div className="h-64 w-full pt-2">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
            No closed won revenue recorded in this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={isDark ? 0.45 : 0.3} />
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
              />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }}
                dy={6}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }}
                tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const rev = payload[0].value;
                    const count = payload[0].payload.count;
                    return (
                      <div className="rounded-lg border bg-popover p-2.5 text-xs shadow-md border-border">
                        <p className="font-semibold text-foreground">{label}</p>
                        <p className="text-primary font-bold mt-1">{formatCurrency(rev)}</p>
                        <p className="text-[11px] text-muted-foreground">{count} deals won</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#4F46E5"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#revenueGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </WidgetCard>
  );
}

export default RevenueChart;

