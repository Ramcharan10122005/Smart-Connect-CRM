import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Plus,
  Calendar,
  List,
  AlertCircle,
  Clock,
  CheckCircle2,
  CalendarDays,
  Search,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';
import { useDialogStore } from '@/stores/dialogStore';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FollowUpListView } from './components/FollowUpListView';
import { FollowUpCalendarView } from './components/FollowUpCalendarView';

export default function FollowUpsPage() {
  const { role, user } = useAuthStore();
  const { openCreateFollowUp } = useDialogStore();

  // View toggle: 'list' | 'calendar'
  const [viewMode, setViewMode] = useState('list');

  // Active summary chip filter: 'all' | 'today' | 'overdue' | 'upcoming' | 'completed'
  const [activeChip, setActiveChip] = useState('all');

  // Filters
  const [search, setSearch] = useState('');
  const [assigneeId, setAssigneeId] = useState('all');
  const [priority, setPriority] = useState('all');
  const [status, setStatus] = useState('all');

  // 1. Fetch Summary Counts
  const { data: summaryData } = useQuery({
    queryKey: queryKeys.followUps.summary(),
    queryFn: async () => {
      const res = await api.get('/follow-ups/summary');
      return res.data?.data || { today: 0, overdue: 0, upcoming: 0, completed: 0 };
    },
  });

  // 2. Fetch Users (for manager/admin assignee filter)
  const { data: usersData } = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: async () => {
      const res = await api.get('/users?limit=100');
      return res.data?.data || [];
    },
    enabled: role === 'ADMIN' || role === 'MANAGER',
  });

  // 3. Fetch Follow-ups List
  const queryParams = {
    limit: 100,
    search: search || undefined,
    assigneeId: assigneeId !== 'all' ? assigneeId : undefined,
    priority: priority !== 'all' ? priority : undefined,
    status: status !== 'all' ? status : undefined,
    view: activeChip !== 'all' ? activeChip : undefined,
  };

  const { data: followUpsData, isLoading } = useQuery({
    queryKey: queryKeys.followUps.list(queryParams),
    queryFn: async () => {
      const cleanParams = Object.fromEntries(
        Object.entries(queryParams).filter(([_, v]) => v !== undefined && v !== null && v !== '')
      );
      const res = await api.get('/follow-ups', { params: cleanParams });
      return res.data?.data || [];
    },
  });

  const followUps = followUpsData || [];
  const summary = summaryData || { today: 0, overdue: 0, upcoming: 0, completed: 0 };
  const users = usersData || [];

  // Filter client-side search if needed
  const filteredFollowUps = followUps.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q)) ||
      (item.contact && `${item.contact.firstName} ${item.contact.lastName}`.toLowerCase().includes(q)) ||
      (item.lead && item.lead.title.toLowerCase().includes(q))
    );
  });

  const chips = [
    {
      id: 'all',
      label: 'All Tasks',
      count: followUps.length,
      icon: List,
      badgeColor: 'bg-muted text-foreground',
    },
    {
      id: 'today',
      label: 'Today',
      count: summary.today,
      icon: Clock,
      badgeColor: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-900',
    },
    {
      id: 'overdue',
      label: 'Overdue',
      count: summary.overdue,
      icon: AlertCircle,
      badgeColor: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-900',
    },
    {
      id: 'upcoming',
      label: 'Upcoming',
      count: summary.upcoming,
      icon: CalendarDays,
      badgeColor: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-300 dark:border-indigo-900',
    },
    {
      id: 'completed',
      label: 'Completed',
      count: summary.completed,
      icon: CheckCircle2,
      badgeColor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-900',
    },
  ];

  const hasActiveFilters =
    search || assigneeId !== 'all' || priority !== 'all' || status !== 'all';

  const clearFilters = () => {
    setSearch('');
    setAssigneeId('all');
    setPriority('all');
    setStatus('all');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Follow-ups & Tasks"
        description="Schedule reminders, snooze upcoming tasks, and manage recurring sales touchpoints."
        actions={
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-crm border border-border bg-muted/40 p-0.5">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8 px-2.5 text-xs"
              >
                <List className="h-3.5 w-3.5 mr-1.5" /> List
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('calendar')}
                className="h-8 px-2.5 text-xs"
              >
                <Calendar className="h-3.5 w-3.5 mr-1.5" /> Calendar
              </Button>
            </div>

            {/* Create Follow-up Button */}
            <Button size="sm" onClick={() => openCreateFollowUp()} className="h-9">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New Follow-up
            </Button>
          </div>
        }
      />

      {/* Summary Chips Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {chips.map((chip) => {
          const Icon = chip.icon;
          const isActive = activeChip === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => setActiveChip(chip.id)}
              className={cn(
                'flex items-center justify-between p-3 rounded-card border transition-all text-left shadow-sm',
                isActive
                  ? 'border-primary bg-primary/10 ring-1 ring-primary font-semibold text-primary'
                  : 'border-border bg-card hover:bg-muted/50 text-foreground'
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
                <span className="text-xs truncate">{chip.label}</span>
              </div>
              <Badge variant="outline" className={cn('text-xs font-mono font-bold px-2 py-0.5', chip.badgeColor)}>
                {chip.count}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-card border bg-card p-3 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks, linked contacts, or leads..."
            className="pl-9 h-9 text-xs bg-background"
          />
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Priority Filter */}
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="h-9 w-28 text-xs bg-background">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-28 text-xs bg-background">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="DONE">Completed</SelectItem>
              <SelectItem value="SNOOZED">Snoozed</SelectItem>
            </SelectContent>
          </Select>

          {/* Assignee Filter (Managers & Admins only) */}
          {(role === 'ADMIN' || role === 'MANAGER') && (
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger className="h-9 w-36 text-xs bg-background">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reps</SelectItem>
                <SelectItem value={user?.id || ''}>Assigned to Me</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id} className="text-xs">
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 text-xs px-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Area: List View or Calendar View */}
      {viewMode === 'list' ? (
        <FollowUpListView
          followUps={filteredFollowUps}
          isLoading={isLoading}
          activeFilter={activeChip}
        />
      ) : (
        <FollowUpCalendarView followUps={filteredFollowUps} />
      )}
    </div>
  );
}
