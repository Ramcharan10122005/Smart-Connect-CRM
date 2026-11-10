import { useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { WidgetCard } from './WidgetCard';

const SOURCE_COLORS = [
  '#4F46E5', // Indigo
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#64748B', // Slate
];

export function LeadSourceChart({ data = [], isLoading = false, isError = false, onRetry }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data
      .filter((s) => s.count > 0)
      .map((src, idx) => ({
        name: src.name,
        value: src.count,
        revenue: src.value || 0,
        color: SOURCE_COLORS[idx % SOURCE_COLORS.length],
      }));
  }, [data]);

  const totalLeads = useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.value, 0);
  }, [chartData]);

  return (
    <WidgetCard
      title="Leads by Source"
      description="Origin channels of inbound prospects"
      isLoading={isLoading}
      isError={isError}
      onRetry={onRetry}
    >
      <div className="h-64 w-full flex flex-col items-center justify-center pt-2">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
            No source distribution data available.
          </div>
        ) : (
          <div className="w-full h-full flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="relative w-40 h-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const row = payload[0].payload;
                        const pct = totalLeads > 0 ? ((row.value / totalLeads) * 100).toFixed(0) : 0;
                        return (
                          <div className="rounded-lg border bg-popover p-2.5 text-xs shadow-md border-border">
                            <p className="font-semibold text-foreground">{row.name}</p>
                            <p className="text-primary font-bold mt-1">
                              {row.value} leads ({pct}%)
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Volume: {formatCurrency(row.revenue)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Center counter */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold text-foreground leading-none">{totalLeads}</span>
                <span className="text-[10px] text-muted-foreground font-medium uppercase mt-0.5">Leads</span>
              </div>
            </div>

            {/* Custom Legend */}
            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-2 w-full sm:w-auto text-xs">
              {chartData.map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-3 min-w-[120px]">
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-semibold text-foreground text-xs">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </WidgetCard>
  );
}

export default LeadSourceChart;

