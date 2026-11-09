import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Plus, Target, Users, CheckSquare, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="High-level overview of active pipeline, won revenue, and pending follow-ups."
        actions={
          <>
            <Link to="/leads?action=new">
              <Button size="sm">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> New Lead
              </Button>
            </Link>
            <Link to="/customers?action=new">
              <Button variant="outline" size="sm">
                Add Customer
              </Button>
            </Link>
          </>
        }
      />

      {/* KPI Cards Placeholder */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Customers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground mt-1">Active accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Open Deals</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground mt-1">In active negotiation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Won Revenue (MTD)
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground mt-1">Closed won this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Overdue Tasks
            </CardTitle>
            <CheckSquare className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">--</div>
            <p className="text-xs text-muted-foreground mt-1">Requires immediate follow-up</p>
          </CardContent>
        </Card>
      </div>

      <Card className="min-h-[300px] flex items-center justify-center border-dashed">
        <div className="text-center p-8">
          <TrendingUp className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
          <h3 className="font-semibold text-sm">Full Analytics Dashboard</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Visual charts, revenue velocity, and sales leaderboard will display here.
          </p>
        </div>
      </Card>
    </div>
  );
}
