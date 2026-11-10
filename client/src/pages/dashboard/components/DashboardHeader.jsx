import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, UserPlus, CalendarPlus, Users } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function DashboardHeader({
  dateRange,
  onDateRangeChange,
  selectedRepId,
  onRepChange,
  reps = [],
  loadingReps = false,
}) {
  const { user, isManager } = useAuthStore();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const firstName = user?.name ? user.name.split(' ')[0] : 'there';

  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const dateRanges = [
    { label: '7D', value: '7d' },
    { label: '30D', value: '30d' },
    { label: '90D', value: '90d' },
    { label: '12M', value: '12m' },
  ];

  return (
    <div className="flex flex-col gap-4 pb-6 border-b border-border/60">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Left: Greeting and Date */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5">
            <span>{todayFormatted}</span>
            <span className="text-border">•</span>
            <span>Real-time Pipeline Overview</span>
          </p>
        </div>

        {/* Right: Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/leads?action=new">
            <Button size="sm" className="shadow-subtle">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              <span>New Lead</span>
            </Button>
          </Link>

          <Link to="/customers?action=new">
            <Button variant="outline" size="sm">
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              <span>New Contact</span>
            </Button>
          </Link>

          <Link to="/activities?action=new">
            <Button variant="outline" size="sm">
              <CalendarPlus className="mr-1.5 h-3.5 w-3.5" />
              <span>Log Activity</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Toolbar: Rep Scope (if manager) & Date Range */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {/* Rep Selector for Managers/Admins */}
        <div className="flex items-center gap-2">
          {isManager() && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select
                value={selectedRepId || 'all'}
                onValueChange={(val) => onRepChange(val === 'all' ? null : val)}
                disabled={loadingReps}
              >
                <SelectTrigger className="h-8 w-44 sm:w-52 text-xs">
                  <SelectValue placeholder="All Team Members" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Team Members</SelectItem>
                  {reps.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} ({r.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Date Range Selector Pills */}
        <div className="flex items-center rounded-crm border border-border/70 bg-muted/40 p-0.5">
          {dateRanges.map((range) => {
            const active = dateRange === range.value;
            return (
              <button
                key={range.value}
                type="button"
                onClick={() => onDateRangeChange(range.value)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all duration-150 ${
                  active
                    ? 'bg-background text-foreground shadow-xs font-bold text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {range.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default DashboardHeader;

