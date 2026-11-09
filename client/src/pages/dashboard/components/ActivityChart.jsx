import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { useUIStore } from '@/stores/uiStore';
import { WidgetCard } from './WidgetCard';

const TYPE_COLORS = {
  CALL: '#3B82F6', // Blue
  EMAIL: '#8B5CF6', // Purple
  MEETING: '#10B981', // Emerald
  NOTE: '#F59E0B', // Amber
  SYSTEM: '#64748B', // Slate
};

export function ActivityChart({ data = [], isLoading = false, isError = false, onRetry }) {
  const { theme } = useUIStore();
  const isDark = theme === 'dark';

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((item) => ({
      name: item.type,
      count: item.count || 0,
      color: TYPE_COLORS[item.type] || '#4F46E5',
    }));
  }, [data]);

  const totalActivities = useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.count, 0);
  }, [chartData]);

  return (
    <WidgetCard
      title="Activities Logged"
      description={`Total interactions logged: ${totalActivities}`}
      isLoading={isLoading}
      isError={isError}
      onRetry={onRetry}
    >
      <div className="h-64 w-full pt-2">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
            No activities logged during this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const row = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-popover p-2.5 text-xs shadow-md border-border">
                        <p className="font-semibold text-foreground">{row.name}</p>
                        <p className="text-primary font-bold mt-1">{row.count} completed</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </WidgetCard>
  );
}

export default ActivityChart;
