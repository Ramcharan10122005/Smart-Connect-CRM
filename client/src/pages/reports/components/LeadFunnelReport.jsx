import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Target, Trophy, Percent, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const STAGE_COLORS = ['#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444'];

export function LeadFunnelReport({ data = {}, isLoading = false }) {
  const totalLeads = data.totalLeads || 0;
  const funnel = data.funnel || [];

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

  const wonStage = funnel.find((s) => s.stageType === 'WON');
  const wonCount = wonStage ? wonStage.leadsCount : 0;
  const wonValue = wonStage ? wonStage.totalValue : 0;
  const totalPipelineValue = funnel.reduce((acc, s) => acc + (s.totalValue || 0), 0);

  const statCards = [
    {
      title: 'Total In Funnel',
      value: totalLeads,
      subtext: 'Leads tracked in range',
      icon: Target,
      color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10',
    },
    {
      title: 'Won Opportunities',
      value: wonCount,
      subtext: formatCurrency(wonValue),
      icon: Trophy,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
    },
    {
      title: 'Overall Conversion',
      value: totalLeads > 0 ? `${Math.round((wonCount / totalLeads) * 100)}%` : '0%',
      subtext: 'Created to won',
      icon: Percent,
      color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10',
    },
    {
      title: 'Total Pipeline Value',
      value: formatCurrency(totalPipelineValue),
      subtext: 'Across all stages',
      icon: TrendingUp,
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
                  <h3 className="text-xl font-bold tracking-tight text-foreground mt-1">
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
          <CardTitle className="text-sm font-semibold">Funnel Conversion by Stage</CardTitle>
          <CardDescription className="text-xs">
            Volume of leads currently in or transitioned through each pipeline milestone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {funnel.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
              No pipeline stage data found.
            </div>
          ) : (
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={funnel}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="stageName"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    width={100}
                  />
                  <Tooltip
                    formatter={(val, name) => [
                      name === 'leadsCount' ? `${val} leads` : val,
                      name === 'leadsCount' ? 'Leads' : name,
                    ]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="leadsCount" radius={[0, 4, 4, 0]}>
                    {funnel.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={STAGE_COLORS[index % STAGE_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Stage Conversion Metrics</CardTitle>
          <CardDescription className="text-xs">
            Progression rate and deal volume across each stage.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-semibold">Stage Name</TableHead>
                <TableHead className="text-xs font-semibold">Type</TableHead>
                <TableHead className="text-xs font-semibold text-right">Probability</TableHead>
                <TableHead className="text-xs font-semibold text-right">Leads Count</TableHead>
                <TableHead className="text-xs font-semibold text-right">Total Value</TableHead>
                <TableHead className="text-xs font-semibold text-right">Stage Conversion</TableHead>
                <TableHead className="text-xs font-semibold text-right">Overall Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {funnel.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-xs text-muted-foreground">
                    No pipeline stages recorded.
                  </TableCell>
                </TableRow>
              ) : (
                funnel.map((row) => (
                  <TableRow key={row.stageId}>
                    <TableCell className="text-xs font-semibold text-foreground">
                      {row.stageName}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono uppercase ${
                          row.stageType === 'WON'
                            ? 'text-emerald-600 border-emerald-300'
                            : row.stageType === 'LOST'
                              ? 'text-rose-600 border-rose-300'
                              : 'text-indigo-600 border-indigo-300'
                        }`}
                      >
                        {row.stageType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      {row.probability}%
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono font-medium">
                      {row.leadsCount}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono font-semibold">
                      {formatCurrency(row.totalValue)}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono text-muted-foreground">
                      {row.conversionRate}%
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                      {row.overallConversion}%
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
