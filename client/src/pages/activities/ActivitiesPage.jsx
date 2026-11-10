import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Phone,
  Mail,
  Calendar,
  FileText,
  ShieldAlert,
  Search,
  Plus,
  Clock,
  User,
  Building2,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';
import { useDialogStore } from '@/stores/dialogStore';
import { cn, formatDate } from '@/lib/utils';
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
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const ACTIVITY_TYPE_CONFIG = {
  CALL: {
    label: 'Call',
    icon: Phone,
    badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-900',
    iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  EMAIL: {
    label: 'Email',
    icon: Mail,
    badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-900',
    iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  },
  MEETING: {
    label: 'Meeting',
    icon: Calendar,
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-900',
    iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  NOTE: {
    label: 'Note',
    icon: FileText,
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-900',
    iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  SYSTEM: {
    label: 'System',
    icon: ShieldAlert,
    badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-800',
    iconBg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
  },
};

export default function ActivitiesPage() {
  const queryClient = useQueryClient();
  const { user: currentUser, role } = useAuthStore();
  const { openLogActivity } = useDialogStore();

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [userFilter, setUserFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState('30d'); // 'today' | '7d' | '30d' | 'all'
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Compute dateFrom based on range
  const getDateFrom = (range) => {
    const now = new Date();
    if (range === 'today') {
      now.setHours(0, 0, 0, 0);
      return now.toISOString();
    }
    if (range === '7d') {
      now.setDate(now.getDate() - 7);
      return now.toISOString();
    }
    if (range === '30d') {
      now.setDate(now.getDate() - 30);
      return now.toISOString();
    }
    return undefined;
  };

  // 1. Fetch Users
  const { data: usersData } = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: async () => {
      const res = await api.get('/users?limit=100');
      return res.data?.data || [];
    },
  });

  // 2. Fetch Activities Feed
  const queryParams = {
    limit: 100,
    search: search || undefined,
    type: typeFilter !== 'ALL' ? typeFilter : undefined,
    createdById: userFilter !== 'ALL' ? userFilter : undefined,
    dateFrom: getDateFrom(dateRange),
  };

  const { data: activitiesData, isLoading } = useQuery({
    queryKey: queryKeys.activities.list(queryParams),
    queryFn: async () => {
      const cleanParams = Object.fromEntries(
        Object.entries(queryParams).filter(([_, v]) => v !== undefined && v !== null && v !== '')
      );
      const res = await api.get('/activities', { params: cleanParams });
      return res.data?.data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/activities/${id}`);
    },
    onSuccess: () => {
      toast.success('Activity deleted successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.upcoming() });
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to delete activity');
    },
  });

  const activities = activitiesData || [];
  const users = usersData || [];

  // Group activities by date (day string: YYYY-MM-DD)
  const groupedByDay = activities.reduce((acc, act) => {
    const date = new Date(act.occurredAt);
    const dayKey = date.toISOString().slice(0, 10);
    if (!acc[dayKey]) {
      acc[dayKey] = {
        date,
        items: [],
      };
    }
    acc[dayKey].items.push(act);
    return acc;
  }, {});

  const sortedDayKeys = Object.keys(groupedByDay).sort((a, b) => (a < b ? 1 : -1));

  const formatDayHeading = (date) => {
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';

    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const hasActiveFilters =
    search || typeFilter !== 'ALL' || userFilter !== 'ALL' || dateRange !== '30d';

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('ALL');
    setUserFilter('ALL');
    setDateRange('30d');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Activity Log"
        description="Unified audit stream of all customer calls, emails, meetings, and internal notes."
        actions={
          <Button size="sm" onClick={() => openLogActivity()} className="h-9">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Log Activity
          </Button>
        }
      />

      {/* Filter Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 rounded-card border bg-card p-3 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activity subjects, notes, outcomes..."
            className="pl-9 h-9 text-xs bg-background"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Type Filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 w-32 text-xs bg-background">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="CALL">Calls</SelectItem>
              <SelectItem value="EMAIL">Emails</SelectItem>
              <SelectItem value="MEETING">Meetings</SelectItem>
              <SelectItem value="NOTE">Notes</SelectItem>
              <SelectItem value="SYSTEM">System</SelectItem>
            </SelectContent>
          </Select>

          {/* User / Rep Filter */}
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="h-9 w-36 text-xs bg-background">
              <SelectValue placeholder="Team Member" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Team Members</SelectItem>
              <SelectItem value={currentUser?.id || ''}>My Activities</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id} className="text-xs">
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Range Filter */}
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="h-9 w-32 text-xs bg-background">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>

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

      {/* Global Activity Feed */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-card border bg-card p-4 animate-pulse" />
          ))}
        </div>
      ) : sortedDayKeys.length === 0 ? (
        <div className="rounded-card border border-dashed bg-card/50 p-12 text-center">
          <Calendar className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
          <h4 className="font-semibold text-sm text-foreground">No activities found</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {hasActiveFilters
              ? 'No activity entries match your active filter criteria.'
              : 'Start logging customer calls, meetings, or notes to build up your team feed.'}
          </p>
          <Button
            size="sm"
            onClick={() => openLogActivity()}
            className="mt-4 h-8 text-xs"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Log First Activity
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDayKeys.map((dayKey) => {
            const group = groupedByDay[dayKey];
            return (
              <div key={dayKey} className="space-y-3">
                {/* Day Header */}
                <div className="flex items-center gap-2 px-1">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  <h3 className="font-semibold text-xs tracking-wide text-foreground uppercase">
                    {formatDayHeading(group.date)}
                  </h3>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    ({group.items.length})
                  </span>
                </div>

                {/* Items in Day */}
                <div className="divide-y divide-border rounded-card border bg-card shadow-sm overflow-hidden">
                  {group.items.map((act) => {
                    const typeConfig = ACTIVITY_TYPE_CONFIG[act.type] || ACTIVITY_TYPE_CONFIG.NOTE;
                    const Icon = typeConfig.icon;
                    const canDelete =
                      act.type !== 'SYSTEM' &&
                      (role === 'ADMIN' || act.createdById === currentUser?.id);

                    return (
                      <div
                        key={act.id}
                        className="p-4 hover:bg-muted/30 transition-colors space-y-2.5"
                      >
                        {/* Top Row: Type Icon + Subject + Time + Actor */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            {/* Type Icon Badge */}
                            <div
                              className={cn(
                                'flex h-8 w-8 shrink-0 items-center justify-center rounded-crm',
                                typeConfig.iconBg
                              )}
                            >
                              <Icon className="h-4 w-4" />
                            </div>

                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-xs font-semibold text-foreground">
                                  {act.subject}
                                </h4>

                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-[9px] uppercase px-1.5 py-0 h-4 font-semibold',
                                    typeConfig.badgeClass
                                  )}
                                >
                                  {typeConfig.label}
                                </Badge>

                                {act.outcome && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[9px] px-1.5 py-0 h-4 font-medium"
                                  >
                                    {act.outcome}
                                  </Badge>
                                )}

                                {act.durationMinutes && (
                                  <span className="text-[11px] text-muted-foreground flex items-center gap-0.5 font-mono">
                                    <Clock className="h-3 w-3 inline" />
                                    {act.durationMinutes}m
                                  </span>
                                )}
                              </div>

                              {/* Actor & Time */}
                              <p className="text-[11px] text-muted-foreground">
                                Logged by{' '}
                                <span className="font-medium text-foreground">
                                  {act.createdBy?.name || 'SmartConnect System'}
                                </span>{' '}
                                • {formatDate(act.occurredAt, { includeTime: true })}
                              </p>
                            </div>
                          </div>

                          {/* Delete Option */}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTarget(act)}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                              title="Delete activity"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>

                        {/* Body / Description */}
                        {act.body && (
                          <div className="pl-11 pr-4">
                            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap rounded-crm bg-muted/20 p-2.5 border border-border/40">
                              {act.body}
                            </p>
                          </div>
                        )}

                        {/* Linked Entity Chips */}
                        <div className="flex items-center gap-2 pl-11 flex-wrap">
                          {act.contact && (
                            <Link
                              to={`/customers/contact/${act.contact.id}`}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-[11px] font-medium hover:bg-primary/10 transition-colors"
                            >
                              <User className="h-3 w-3" />
                              <span>
                                {act.contact.firstName} {act.contact.lastName}
                              </span>
                            </Link>
                          )}

                          {act.company && (
                            <Link
                              to={`/customers/company/${act.company.id}`}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-sky-500/20 bg-sky-500/5 text-sky-600 dark:text-sky-400 text-[11px] font-medium hover:bg-sky-500/10 transition-colors"
                            >
                              <Building2 className="h-3 w-3" />
                              <span>{act.company.name}</span>
                            </Link>
                          )}

                          {act.lead && (
                            <Link
                              to="/leads"
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 text-[11px] font-medium hover:bg-indigo-500/10 transition-colors"
                            >
                              <Target className="h-3 w-3" />
                              <span>{act.lead.title}</span>
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Activity"
        description="Are you sure you want to delete this activity entry? This will permanently remove it from the timeline."
        confirmText="Delete Activity"
        variant="destructive"
        onConfirm={() => deleteMutation.mutate(deleteTarget?.id)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
