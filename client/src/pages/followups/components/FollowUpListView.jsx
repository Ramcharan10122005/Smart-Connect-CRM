import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MoreHorizontal,
  Edit2,
  Clock,
  UserCheck,
  Trash2,
  Calendar,
  AlertCircle,
  User,
  Target,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { cn, formatDate, initials } from '@/lib/utils';
import { useDialogStore } from '@/stores/dialogStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { CompleteFollowUpDialog } from '@/components/followups/CompleteFollowUpDialog';
import { SnoozeFollowUpDialog } from '@/components/followups/SnoozeFollowUpDialog';
import { ReassignFollowUpDialog } from '@/components/followups/ReassignFollowUpDialog';

const PRIORITY_STYLES = {
  URGENT: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-900',
  HIGH: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-900',
  MEDIUM: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-900',
  LOW: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-900',
};

export function FollowUpListView({ followUps = [], isLoading = false, activeFilter = 'all' }) {
  const queryClient = useQueryClient();
  const { openEditFollowUp } = useDialogStore();

  // Dialog states for selected task
  const [completeTarget, setCompleteTarget] = useState(null);
  const [snoozeTarget, setSnoozeTarget] = useState(null);
  const [reassignTarget, setReassignTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/follow-ups/${id}`);
    },
    onSuccess: () => {
      toast.success('Task deleted successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.followUps.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.upcoming() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to delete task');
    },
  });

  // Group follow-ups into buckets
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const tomorrowEnd = new Date(todayEnd);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

  const weekEnd = new Date(todayEnd);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const groups = {
    overdue: [],
    today: [],
    tomorrow: [],
    thisWeek: [],
    later: [],
    completed: [],
  };

  followUps.forEach((item) => {
    if (item.status === 'DONE') {
      groups.completed.push(item);
      return;
    }
    const due = new Date(item.dueAt);
    if (due < now) {
      groups.overdue.push(item);
    } else if (due >= todayStart && due <= todayEnd) {
      groups.today.push(item);
    } else if (due >= tomorrowStart && due <= tomorrowEnd) {
      groups.tomorrow.push(item);
    } else if (due > tomorrowEnd && due <= weekEnd) {
      groups.thisWeek.push(item);
    } else {
      groups.later.push(item);
    }
  });

  const SECTION_CONFIG = [
    {
      key: 'overdue',
      title: 'Overdue',
      badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-900',
      icon: AlertCircle,
      items: groups.overdue,
    },
    {
      key: 'today',
      title: 'Today',
      badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-900',
      icon: Clock,
      items: groups.today,
    },
    {
      key: 'tomorrow',
      title: 'Tomorrow',
      badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-900',
      icon: Calendar,
      items: groups.tomorrow,
    },
    {
      key: 'thisWeek',
      title: 'This Week',
      badgeClass: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-900',
      icon: Calendar,
      items: groups.thisWeek,
    },
    {
      key: 'later',
      title: 'Later',
      badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-800',
      icon: Calendar,
      items: groups.later,
    },
    {
      key: 'completed',
      title: 'Completed',
      badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-900',
      icon: CheckCircle2,
      items: groups.completed,
    },
  ];

  // If filter chip is active, filter visible sections
  const visibleSections = SECTION_CONFIG.filter((section) => {
    if (activeFilter === 'today') return section.key === 'today';
    if (activeFilter === 'overdue') return section.key === 'overdue';
    if (activeFilter === 'upcoming')
      return ['tomorrow', 'thisWeek', 'later'].includes(section.key);
    if (activeFilter === 'completed') return section.key === 'completed';
    return true; // 'all'
  });

  const totalVisibleItems = visibleSections.reduce((acc, s) => acc + s.items.length, 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-card border bg-card p-4 animate-pulse" />
        ))}
      </div>
    );
  }

  if (totalVisibleItems === 0) {
    return (
      <div className="rounded-card border border-dashed bg-card/50 p-12 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
        <h4 className="font-semibold text-sm text-foreground">No follow-ups found</h4>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          {activeFilter !== 'all'
            ? `No tasks matching the "${activeFilter}" filter.`
            : 'All caught up! Schedule a new follow-up reminder above.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {visibleSections.map((sec) => {
        if (sec.items.length === 0) return null;
        const SectionIcon = sec.icon;

        return (
          <div key={sec.key} className="space-y-2.5">
            {/* Group Header */}
            <div className="flex items-center gap-2 px-1">
              <SectionIcon className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-xs tracking-wide text-foreground uppercase">
                {sec.title}
              </h3>
              <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-4 font-mono font-semibold', sec.badgeClass)}>
                {sec.items.length}
              </Badge>
            </div>

            {/* Rows Card Container */}
            <div className="divide-y divide-border rounded-card border bg-card shadow-sm overflow-hidden">
              {sec.items.map((fu) => {
                const isOverdue = sec.key === 'overdue';
                const isDone = fu.status === 'DONE';

                return (
                  <div
                    key={fu.id}
                    className={cn(
                      'flex items-center justify-between gap-3 p-3.5 hover:bg-muted/30 transition-colors',
                      isDone ? 'opacity-70 bg-muted/10' : ''
                    )}
                  >
                    {/* Left: Checkbox + Title + Linked Entity */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <Checkbox
                        checked={isDone}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setCompleteTarget(fu);
                          }
                        }}
                        disabled={isDone}
                        className={cn(
                          'h-4 w-4 transition-transform active:scale-90',
                          isDone ? 'data-[state=checked]:bg-emerald-600' : ''
                        )}
                        aria-label="Complete task"
                      />

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p
                            className={cn(
                              'text-xs font-semibold text-foreground truncate',
                              isDone ? 'line-through text-muted-foreground' : ''
                            )}
                          >
                            {fu.title}
                          </p>

                          {/* Priority badge */}
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[9px] uppercase px-1.5 py-0 h-4 font-semibold',
                              PRIORITY_STYLES[fu.priority] || PRIORITY_STYLES.MEDIUM
                            )}
                          >
                            {fu.priority}
                          </Badge>

                          {/* Recurrence badge */}
                          {fu.recurrence && fu.recurrence !== 'NONE' && (
                            <Badge
                              variant="secondary"
                              className="text-[9px] px-1.5 py-0 h-4 flex items-center gap-1 font-mono"
                            >
                              <RefreshCw className="h-2.5 w-2.5" />
                              {fu.recurrence}
                            </Badge>
                          )}
                        </div>

                        {/* Linked Entity & Description snippet */}
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                          {fu.contact && (
                            <Link
                              to={`/customers/contact/${fu.contact.id}`}
                              className="flex items-center gap-1 text-primary hover:underline font-medium"
                            >
                              <User className="h-3 w-3" />
                              <span>{fu.contact.firstName} {fu.contact.lastName}</span>
                            </Link>
                          )}

                          {fu.lead && (
                            <Link
                              to={`/leads`}
                              className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                            >
                              <Target className="h-3 w-3" />
                              <span>{fu.lead.title}</span>
                            </Link>
                          )}

                          {fu.description && (
                            <span className="truncate max-w-xs text-muted-foreground/80">
                              • {fu.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Due Date/Time, Assignee Avatar, Menu */}
                    <div className="flex items-center gap-3 shrink-0">
                      {/* Due Time */}
                      <div className="text-right">
                        <div
                          className={cn(
                            'text-xs font-semibold',
                            isOverdue
                              ? 'text-rose-600 dark:text-rose-400 flex items-center gap-1 justify-end'
                              : 'text-foreground'
                          )}
                        >
                          {isOverdue && <AlertCircle className="h-3 w-3 text-rose-500" />}
                          <span>{formatDate(fu.dueAt, { includeTime: true })}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {fu.status === 'SNOOZED' ? 'Snoozed' : isDone ? 'Completed' : 'Scheduled'}
                        </span>
                      </div>

                      {/* Assignee Avatar */}
                      <div className="flex items-center" title={`Assigned to ${fu.assignee?.name || 'Unassigned'}`}>
                        <Avatar className="h-6 w-6 ring-1 ring-border">
                          {fu.assignee?.avatarUrl && (
                            <AvatarImage src={fu.assignee.avatarUrl} alt={fu.assignee.name} />
                          )}
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                            {initials(fu.assignee?.name || 'SC')}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      {/* Row Action Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={() => openEditFollowUp(fu)}
                            className="cursor-pointer text-xs"
                          >
                            <Edit2 className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                            <span>Edit task</span>
                          </DropdownMenuItem>

                          {!isDone && (
                            <DropdownMenuItem
                              onClick={() => setSnoozeTarget(fu)}
                              className="cursor-pointer text-xs"
                            >
                              <Clock className="mr-2 h-3.5 w-3.5 text-amber-500" />
                              <span>Snooze</span>
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem
                            onClick={() => setReassignTarget(fu)}
                            className="cursor-pointer text-xs"
                          >
                            <UserCheck className="mr-2 h-3.5 w-3.5 text-primary" />
                            <span>Reassign</span>
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(fu)}
                            className="cursor-pointer text-xs text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Action Dialogs */}
      <CompleteFollowUpDialog
        open={Boolean(completeTarget)}
        onOpenChange={(open) => !open && setCompleteTarget(null)}
        followUp={completeTarget}
      />

      <SnoozeFollowUpDialog
        open={Boolean(snoozeTarget)}
        onOpenChange={(open) => !open && setSnoozeTarget(null)}
        followUp={snoozeTarget}
      />

      <ReassignFollowUpDialog
        open={Boolean(reassignTarget)}
        onOpenChange={(open) => !open && setReassignTarget(null)}
        followUp={reassignTarget}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Follow-up Task"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmText="Delete Task"
        variant="destructive"
        onConfirm={() => deleteMutation.mutate(deleteTarget?.id)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
