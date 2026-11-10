import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { UserCheck, TrendingUp, Users, Percent } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function CustomerGrowthReport({ data = {}, isLoading = false }) {
  const growth = data.growth || [];

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

  const latestMonth = growth.length > 0 ? growth[growth.length - 1] : null;
  const totalCumulative = latestMonth ? latestMonth.cumulativeCustomers : 0;
  const totalNewInPeriod = growth.reduce((acc, m) => acc + (m.newCustomers || 0), 0);
  const avgMonthlyNew =
    growth.length > 0 ? Math.round((totalNewInPeriod / growth.length) * 10) / 10 : 0;

  const statCards = [
    {
      title: 'Total Customers',
      value: totalCumulative,
      subtext: 'Current active accounts',
      icon: Users,
      color: 'text-primary bg-primary/10',
    },
    {
      title: 'New In Period',
      value: totalNewInPeriod,
      subtext: 'Converted accounts',
      icon: UserCheck,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
    },
    {
      title: 'Avg Monthly Growth',
      value: `+${avgMonthlyNew}`,
      subtext: 'Accounts / month',
      icon: TrendingUp,
      color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10',
    },
    {
      title: 'Latest Growth Rate',
      value: `${latestMonth?.growthRate || 0}%`,
      subtext: latestMonth?.label || 'Last recorded month',
      icon: Percent,
      color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10',
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
          <CardTitle className="text-sm font-semibold">Cumulative Customer Trajectory</CardTitle>
          <CardDescription className="text-xs">
            Long-term expansion of closed customer accounts over time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {growth.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
              No customer growth timeline recorded in this window.
            </div>
          ) : (
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="customerGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} />
                  <Tooltip
                    formatter={(val, name) => [
                      val,
                      name === 'cumulativeCustomers' ? 'Total Customers' : 'New Customers',
                    ]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulativeCustomers"
                    stroke="#4F46E5"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#customerGrowthGrad)"
                    name="cumulativeCustomers"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Monthly Acquisition Ledger</CardTitle>
          <CardDescription className="text-xs">
            New additions, running cumulative customer count, and month-over-month growth rate.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-semibold">Month</TableHead>
                <TableHead className="text-xs font-semibold text-right">New Customers</TableHead>
                <TableHead className="text-xs font-semibold text-right">Cumulative Base</TableHead>
                <TableHead className="text-xs font-semibold text-right">Growth Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {growth.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-xs text-muted-foreground">
                    No customer records found.
                  </TableCell>
                </TableRow>
              ) : (
                growth.map((row) => (
                  <TableRow key={row.period}>
                    <TableCell className="text-xs font-medium text-foreground">
                      {row.label || row.period}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                      +{row.newCustomers}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono font-semibold">
                      {row.cumulativeCustomers}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                      {row.growthRate}%
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
