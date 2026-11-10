import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Phone, Mail, Calendar, CheckSquare } from 'lucide-react';
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

export function TeamActivityReport({ data = {}, isLoading = false }) {
  const reps = data.reps || [];

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

  const totalCalls = reps.reduce((acc, r) => acc + (r.calls || 0), 0);
  const totalEmails = reps.reduce((acc, r) => acc + (r.emails || 0), 0);
  const totalMeetings = reps.reduce((acc, r) => acc + (r.meetings || 0), 0);
  const totalCompletedFollowUps = reps.reduce((acc, r) => acc + (r.followUpsCompleted || 0), 0);

  const statCards = [
    {
      title: 'Calls Logged',
      value: totalCalls,
      subtext: 'Team telephone touchpoints',
      icon: Phone,
      color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10',
    },
    {
      title: 'Emails Sent',
      value: totalEmails,
      subtext: 'Logged customer emails',
      icon: Mail,
      color: 'text-purple-600 dark:text-purple-400 bg-purple-500/10',
    },
    {
      title: 'Meetings Held',
      value: totalMeetings,
      subtext: 'Client demos & discussions',
      icon: Calendar,
      color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
    },
    {
      title: 'Tasks Completed',
      value: totalCompletedFollowUps,
      subtext: 'Follow-ups executed',
      icon: CheckSquare,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
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
          <CardTitle className="text-sm font-semibold">Activity Volume per Sales Rep</CardTitle>
          <CardDescription className="text-xs">
            Stacked breakdown of calls, emails, meetings, and notes logged per team member.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reps.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
              No sales rep activity recorded in this period.
            </div>
          ) : (
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reps} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                  <XAxis dataKey="repName" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} />
                  <Tooltip
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
                    formatter={(val) => <span className="text-xs text-foreground capitalize">{val}</span>}
                  />
                  <Bar dataKey="calls" stackId="a" fill="#3B82F6" name="Calls" />
                  <Bar dataKey="emails" stackId="a" fill="#8B5CF6" name="Emails" />
                  <Bar dataKey="meetings" stackId="a" fill="#F59E0B" name="Meetings" />
                  <Bar dataKey="notes" stackId="a" fill="#10B981" name="Notes" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Rep Activity Summary</CardTitle>
          <CardDescription className="text-xs">
            Individual activity totals and completed follow-up commitments.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-semibold">Team Member</TableHead>
                <TableHead className="text-xs font-semibold">Role</TableHead>
                <TableHead className="text-xs font-semibold text-right">Calls</TableHead>
                <TableHead className="text-xs font-semibold text-right">Emails</TableHead>
                <TableHead className="text-xs font-semibold text-right">Meetings</TableHead>
                <TableHead className="text-xs font-semibold text-right">Notes</TableHead>
                <TableHead className="text-xs font-semibold text-right">Total Activities</TableHead>
                <TableHead className="text-xs font-semibold text-right">Tasks Done</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-xs text-muted-foreground">
                    No team activity records found.
                  </TableCell>
                </TableRow>
              ) : (
                reps.map((row) => (
                  <TableRow key={row.repId}>
                    <TableCell className="text-xs font-semibold text-foreground">
                      <div>
                        <p>{row.repName}</p>
                        <p className="text-[10px] text-muted-foreground font-normal">{row.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {row.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono font-medium">
                      {row.calls}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono font-medium">
                      {row.emails}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono font-medium">
                      {row.meetings}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono font-medium">
                      {row.notes}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono font-semibold text-primary">
                      {row.totalActivities}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {row.followUpsCompleted}
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
