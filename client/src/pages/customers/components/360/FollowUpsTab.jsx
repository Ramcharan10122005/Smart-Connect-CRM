import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { cn, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScheduleFollowUpDialog } from './ScheduleFollowUpDialog';

export function FollowUpsTab({ contactId = null, leadId = null }) {
  const queryClient = useQueryClient();
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [completingId, setCompletingId] = useState(null);

  // Fetch follow-ups for this contact
  const queryParams = {
    contactId: contactId || undefined,
    leadId: leadId || undefined,
    limit: 50,
  };

  const { data: followUpsData, isLoading } = useQuery({
    queryKey: ['follow-ups', 'customer-360', queryParams],
    queryFn: async () => {
      const res = await api.get('/follow-ups', { params: queryParams });
      return res.data?.data || [];
    },
  });

  const followUps = followUpsData || [];

  // Separate pending/snoozed vs done
  const activeTasks = followUps.filter((f) => f.status !== 'DONE');
  const completedTasks = followUps.filter((f) => f.status === 'DONE');

  // Complete mutation with optimistic update
  const completeMutation = useMutation({
    mutationFn: async ({ id }) => {
      const res = await api.patch(`/follow-ups/${id}/complete`, {
        logActivity: true,
      });
      return res.data?.data;
    },
    onMutate: async ({ id }) => {
      setCompletingId(id);
      const queryKey = ['follow-ups', 'customer-360', queryParams];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);

      if (previous) {
        queryClient.setQueryData(
          queryKey,
          previous.map((t) => (t.id === id ? { ...t, status: 'DONE' } : t))
        );
      }
      return { previous, queryKey };
    },
    onError: (err, _vars, context) => {
      if (context?.queryKey && context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
      toast.error(err.message || 'Failed to complete task');
    },
    onSettled: () => {
      setCompletingId(null);
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
      if (contactId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.contacts.overview(contactId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.activities.timeline({ contactId }) });
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Task marked complete & logged to activity');
    },
  });

  // Snooze mutation
  const snoozeMutation = useMutation({
    mutationFn: async ({ id, preset }) => {
      const res = await api.patch(`/follow-ups/${id}/snooze`, { preset });
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
      if (contactId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.contacts.overview(contactId) });
      }
      toast.success('Task snoozed');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to snooze task');
    },
  });

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'URGENT':
        return <Badge variant="destructive" className="text-[10px] py-0 px-1.5">Urgent</Badge>;
      case 'HIGH':
        return <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-amber-600 border-amber-300 bg-amber-50">High</Badge>;
      case 'LOW':
        return <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-muted-foreground">Low</Badge>;
      case 'MEDIUM':
      default:
        return <Badge variant="outline" className="text-[10px] py-0 px-1.5">Medium</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm text-foreground">Follow-up Tasks</h3>
          <p className="text-xs text-muted-foreground">
            {activeTasks.length} pending reminder{activeTasks.length !== 1 ? 's' : ''} to complete.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setScheduleModalOpen(true)}
          className="h-8 gap-1.5 text-xs rounded-crm font-medium shadow-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Schedule Task</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-xs text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
          <p className="mt-2">Loading tasks...</p>
        </div>
      ) : followUps.length === 0 ? (
        <div className="rounded-card border border-dashed p-10 text-center text-muted-foreground space-y-3">
          <CalendarClock className="h-8 w-8 mx-auto opacity-40" />
          <div className="space-y-1">
            <h4 className="font-semibold text-sm text-foreground">No follow-ups scheduled</h4>
            <p className="text-xs max-w-sm mx-auto">
              Schedule a call, proposal check-in, or email reminder for this customer.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScheduleModalOpen(true)}
            className="text-xs"
          >
            Schedule First Task
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Tasks */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Upcoming & Due ({activeTasks.length})
              </span>
              <div className="h-px bg-border flex-1" />
            </div>

            {activeTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 italic py-2">
                All caught up! No pending follow-ups.
              </p>
            ) : (
              <div className="divide-y rounded-card border bg-card">
                {activeTasks.map((task) => {
                  const isOverdue = new Date(task.dueAt) < new Date();
                  const isCompleting = completingId === task.id;

                  return (
                    <div
                      key={task.id}
                      className={cn(
                        'p-3.5 flex items-start justify-between gap-3 transition-colors',
                        isOverdue && 'bg-rose-500/5'
                      )}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Checkbox
                          checked={task.status === 'DONE'}
                          disabled={isCompleting}
                          onCheckedChange={() => completeMutation.mutate({ id: task.id })}
                          className="mt-0.5"
                        />

                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-foreground">
                              {task.title}
                            </span>
                            {getPriorityBadge(task.priority)}
                            {isOverdue && (
                              <Badge
                                variant="destructive"
                                className="text-[10px] py-0 px-1.5 flex items-center gap-1"
                              >
                                <AlertCircle className="h-2.5 w-2.5" /> Overdue
                              </Badge>
                            )}
                          </div>

                          {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {task.description}
                            </p>
                          )}

                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                            <span className={cn('flex items-center gap-1 font-medium', isOverdue && 'text-rose-600 dark:text-rose-400')}>
                              <Clock className="h-3 w-3" />
                              <span>{formatDate(task.dueAt, { relative: true })}</span>
                            </span>

                            {task.assignee && (
                              <span>• Assigned to {task.assignee.name}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Snooze Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-crm opacity-70 hover:opacity-100"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuLabel className="text-xs">Snooze reminder</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => snoozeMutation.mutate({ id: task.id, preset: '1_hour' })}
                            className="text-xs cursor-pointer"
                          >
                            In 1 hour
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => snoozeMutation.mutate({ id: task.id, preset: 'tomorrow_9am' })}
                            className="text-xs cursor-pointer"
                          >
                            Tomorrow 9:00 AM
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => snoozeMutation.mutate({ id: task.id, preset: 'next_week' })}
                            className="text-xs cursor-pointer"
                          >
                            Next week
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Completed ({completedTasks.length})
                </span>
                <div className="h-px bg-border flex-1" />
              </div>

              <div className="divide-y rounded-card border bg-muted/20 opacity-70">
                {completedTasks.map((task) => (
                  <div key={task.id} className="p-3 flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="text-xs text-muted-foreground line-through flex-1 truncate">
                      {task.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatDate(task.completedAt || task.updatedAt, { formatStr: 'MMM d' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Schedule Dialog */}
      <ScheduleFollowUpDialog
        open={scheduleModalOpen}
        onOpenChange={setScheduleModalOpen}
        contactId={contactId}
        leadId={leadId}
      />
    </div>
  );
}

export default FollowUpsTab;
