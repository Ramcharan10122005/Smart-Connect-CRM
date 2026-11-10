import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { DollarSign, Percent, TrendingUp, Clock } from 'lucide-react';
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

export function SalesReport({ data = {}, isLoading = false }) {
  const summary = data.summary || {
    leadsCreated: 0,
    leadsWon: 0,
    leadsLost: 0,
    openLeads: 0,
    totalWonValue: 0,
    totalOpenValue: 0,
    winRate: 0,
    avgDealSize: 0,
    avgCycleDays: 0,
  };

  const breakdown = data.breakdown || [];

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

  const statCards = [
    {
      title: 'Won Revenue',
      value: formatCurrency(summary.totalWonValue),
      subtext: `${summary.leadsWon} deals closed won`,
      icon: DollarSign,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
    },
    {
      title: 'Win Rate',
      value: `${summary.winRate}%`,
      subtext: `${summary.leadsLost} closed lost deals`,
      icon: Percent,
      color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10',
    },
    {
      title: 'Avg Deal Size',
      value: formatCurrency(summary.avgDealSize),
      subtext: 'Per won contract',
      icon: TrendingUp,
      color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10',
    },
    {
      title: 'Sales Cycle',
      value: `${summary.avgCycleDays} days`,
      subtext: 'Creation to close',
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
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
          <CardTitle className="text-sm font-semibold">Won Revenue Trend Over Time</CardTitle>
          <CardDescription className="text-xs">
            Closed revenue volume grouped by monthly intervals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {breakdown.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
              No won deal data in this time range.
            </div>
          ) : (
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={breakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      name === 'wonValue' ? formatCurrency(value) : value,
                      name === 'wonValue' ? 'Won Revenue' : 'Leads Won',
                    ]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="wonValue" fill="#4F46E5" radius={[4, 4, 0, 0]} name="wonValue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Performance Breakdown</CardTitle>
          <CardDescription className="text-xs">
            Monthly aggregate numbers for won opportunities.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-semibold">Period</TableHead>
                <TableHead className="text-xs font-semibold text-right">Deals Won</TableHead>
                <TableHead className="text-xs font-semibold text-right">Closed Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {breakdown.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-6 text-xs text-muted-foreground">
                    No closed deal records found.
                  </TableCell>
                </TableRow>
              ) : (
                breakdown.map((row) => (
                  <TableRow key={row.period}>
                    <TableCell className="text-xs font-medium text-foreground">
                      {row.period}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono font-medium">
                      {row.leadsWon}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(row.wonValue)}
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
