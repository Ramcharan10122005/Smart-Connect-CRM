import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Layers, Trophy, DollarSign, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const SOURCE_COLORS = ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#64748B'];

export function LeadSourcesReport({ data = {}, isLoading = false }) {
  const sources = data.sources || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-card border bg-card animate-pulse" />
          ))}
        </div>
        <div className="h-80 rounded-card border bg-card animate-pulse" />
      </div>
    );
  }

  const totalLeadsAllSources = sources.reduce((acc, s) => acc + (s.totalLeads || 0), 0);
  const totalWonRevenue = sources.reduce((acc, s) => acc + (s.wonValue || 0), 0);

  // Find top producing source by leads
  const topSourceByLeads = [...sources].sort((a, b) => b.totalLeads - a.totalLeads)[0];
  // Find top producing source by revenue
  const topSourceByRev = [...sources].sort((a, b) => b.wonValue - a.wonValue)[0];

  const pieData = sources
    .filter((s) => s.totalLeads > 0)
    .map((s) => ({
      name: s.sourceName,
      value: s.totalLeads,
      wonValue: s.wonValue,
    }));

  const statCards = [
    {
      title: 'Active Sources',
      value: sources.length,
      subtext: `${totalLeadsAllSources} leads acquired`,
      icon: Layers,
      color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10',
    },
    {
      title: 'Top Source (Volume)',
      value: topSourceByLeads?.sourceName || 'None',
      subtext: `${topSourceByLeads?.totalLeads || 0} leads generated`,
      icon: TrendingUp,
      color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10',
    },
    {
      title: 'Top Source (Revenue)',
      value: topSourceByRev?.sourceName || 'None',
      subtext: formatCurrency(topSourceByRev?.wonValue || 0),
      icon: Trophy,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
    },
    {
      title: 'Total Won Revenue',
      value: formatCurrency(totalWonRevenue),
      subtext: 'Across all channels',
      icon: DollarSign,
      color: 'text-purple-600 dark:text-purple-400 bg-purple-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {card.title}
                  </p>
                  <h3 className="text-xl font-bold tracking-tight text-foreground mt-1 truncate max-w-[150px]">
                    {card.value}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{card.subtext}</p>
                </div>
                <div className={`p-2.5 rounded-crm ${card.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Chart */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Leads Distribution by Channel</CardTitle>
          <CardDescription className="text-xs">
            Relative contribution of inbound and outbound channels.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pieData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
              No lead source distribution data available.
            </div>
          ) : (
            <div className="h-72 w-full pt-2 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={SOURCE_COLORS[index % SOURCE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val, name, item) => [
                      `${val} leads (${formatCurrency(item.payload.wonValue)} won)`,
                      item.payload.name,
                    ]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    formatter={(val) => <span className="text-xs text-foreground">{val}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Source Performance Breakdown</CardTitle>
          <CardDescription className="text-xs">
            Volume, conversion rate, and revenue by acquisition channel.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-semibold">Lead Source</TableHead>
                <TableHead className="text-xs font-semibold text-right">Total Leads</TableHead>
                <TableHead className="text-xs font-semibold text-right">Won</TableHead>
                <TableHead className="text-xs font-semibold text-right">Lost</TableHead>
                <TableHead className="text-xs font-semibold text-right">Open</TableHead>
                <TableHead className="text-xs font-semibold text-right">Won Revenue</TableHead>
                <TableHead className="text-xs font-semibold text-right">Win Rate</TableHead>
                <TableHead className="text-xs font-semibold text-right">Avg Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-xs text-muted-foreground">
                    No lead sources found.
                  </TableCell>
                </TableRow>
              ) : (
                sources.map((row) => (
                  <TableRow key={row.sourceId}>
                    <TableCell className="text-xs font-semibold text-foreground">
                      {row.sourceName}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono font-medium">
                      {row.totalLeads}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                      {row.wonLeads}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono text-rose-600 dark:text-rose-400">
                      {row.lostLeads}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono text-muted-foreground">
                      {row.openLeads}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(row.wonValue)}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono font-semibold">
                      {row.winRate}%
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono font-medium">
                      {formatCurrency(row.avgValue)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
