import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { useUIStore } from '@/stores/uiStore';
import { formatCurrency } from '@/lib/utils';
import { WidgetCard } from './WidgetCard';

export function StageFunnelChart({ data = [], isLoading = false, isError = false, onRetry }) {
  const { theme } = useUIStore();
  const isDark = theme === 'dark';

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((st) => ({
      name: st.name,
      count: st.count || 0,
      value: st.value || 0,
      probability: st.probability || 0,
      color: st.color || '#4F46E5',
    }));
  }, [data]);

  return (
    <WidgetCard
      title="Leads by Pipeline Stage"
      description="Active deal count across sales cycle"
      isLoading={isLoading}
      isError={isError}
      onRetry={onRetry}
    >
      <div className="h-64 w-full pt-2">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
            No active pipeline stages configured.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 25, bottom: 5 }}
            >
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }}
                width={75}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const row = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-popover p-2.5 text-xs shadow-md border-border">
                        <p className="font-semibold text-foreground">{row.name}</p>
                        <p className="text-primary font-bold mt-1">
                          {row.count} {row.count === 1 ? 'deal' : 'deals'}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Value: {formatCurrency(row.value)} ({row.probability}% win prob)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color || '#4F46E5'}
                    opacity={isDark ? 0.85 : 0.9}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </WidgetCard>
  );
}

export default StageFunnelChart;
