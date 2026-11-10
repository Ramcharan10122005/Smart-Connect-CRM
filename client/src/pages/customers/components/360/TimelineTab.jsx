import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Phone,
  Mail,
  Calendar,
  StickyNote,
  GitCommit,
  CheckCircle2,
  Trash2,
  Send,
  Loader2,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { cn, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const TIMELINE_FILTERS = [
  { id: 'ALL', label: 'All Events' },
  { id: 'CALL', label: 'Calls', icon: Phone },
  { id: 'EMAIL', label: 'Emails', icon: Mail },
  { id: 'MEETING', label: 'Meetings', icon: Calendar },
  { id: 'NOTE', label: 'Notes', icon: StickyNote },
  { id: 'STAGE_CHANGE', label: 'Stage Changes', icon: GitCommit },
];

export function TimelineTab({ contactId = null, companyId = null }) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);

  // Filter state
  const [activeFilter, setActiveFilter] = useState('ALL');

  // Inline Composer State
  const [composerType, setComposerType] = useState('NOTE');
  const [composerSubject, setComposerSubject] = useState('');
  const [composerBody, setComposerBody] = useState('');
  const [composerOutcome, setComposerOutcome] = useState('');

  // Delete target
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  // Fetch timeline
  const timelineParams = {
    contactId: contactId || undefined,
    companyId: companyId || undefined,
    limit: 50,
  };

  const { data: timelineData, isLoading } = useQuery({
    queryKey: queryKeys.activities.timeline(timelineParams),
    queryFn: async () => {
      const res = await api.get('/activities/timeline', { params: timelineParams });
      return res.data?.data || [];
    },
  });

  const timelineItems = useMemo(() => timelineData || [], [timelineData]);

  // Optimistic create mutation
  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/activities', payload);
      return res.data?.data;
    },
    onMutate: async (newActivity) => {
      const timelineKey = queryKeys.activities.timeline(timelineParams);
      await queryClient.cancelQueries({ queryKey: timelineKey });
      const previousTimeline = queryClient.getQueryData(timelineKey);

      if (previousTimeline) {
        const optimisticEvent = {
          id: `temp-${Date.now()}`,
          timelineType: 'ACTIVITY',
          activityType: newActivity.type,
          subject: newActivity.subject,
          body: newActivity.body,
          outcome: newActivity.outcome,
          timestamp: new Date().toISOString(),
          actor: {
            id: currentUser?.id,
            name: currentUser?.name || 'You',
            avatarUrl: currentUser?.avatarUrl,
          },
        };
        queryClient.setQueryData(timelineKey, [optimisticEvent, ...previousTimeline]);
      }

      return { previousTimeline, timelineKey };
    },
    onError: (err, _vars, context) => {
      if (context?.timelineKey && context?.previousTimeline) {
        queryClient.setQueryData(context.timelineKey, context.previousTimeline);
      }
      toast.error(err.message || 'Failed to post interaction');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.timeline(timelineParams) });
      if (contactId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.contacts.overview(contactId) });
      }
      if (companyId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.companies.overview(companyId) });
      }
      setComposerBody('');
      setComposerSubject('');
      setComposerOutcome('');
      toast.success('Activity logged to timeline');
    },
  });

  // Delete activity mutation
  const deleteMutation = useMutation({
    mutationFn: async (activityId) => {
      await api.delete(`/activities/${activityId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.timeline(timelineParams) });
      toast.success('Activity removed');
      setDeleteTargetId(null);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to delete activity');
    },
  });

  const handleComposerSubmit = (e) => {
    e.preventDefault();
    if (!composerBody.trim()) {
      toast.error('Please enter note or activity content');
      return;
    }

    const defaultSubject = {
      NOTE: 'Quick Note',
      CALL: 'Phone Call Logged',
      EMAIL: 'Email Sent',
      MEETING: 'Meeting Note',
    }[composerType];

    createMutation.mutate({
      type: composerType,
      subject: composerSubject.trim() || defaultSubject,
      body: composerBody.trim(),
      outcome: composerOutcome.trim() || null,
      contactId: contactId || null,
      companyId: companyId || null,
      occurredAt: new Date(),
    });
  };

  // Filter items
  const filteredTimeline = useMemo(() => {
    if (activeFilter === 'ALL') return timelineItems;
    if (activeFilter === 'STAGE_CHANGE') {
      return timelineItems.filter((i) => i.timelineType === 'STAGE_CHANGE');
    }
    return timelineItems.filter(
      (i) => i.activityType === activeFilter && i.timelineType !== 'STAGE_CHANGE'
    );
  }, [timelineItems, activeFilter]);

  // Group items by relative date header
  const groupedTimeline = useMemo(() => {
    const groups = {};
    filteredTimeline.forEach((item) => {
      const date = new Date(item.timestamp);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      let groupKey;
      if (date.toDateString() === today.toDateString()) {
        groupKey = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = 'Yesterday';
      } else {
        groupKey = formatDate(date, { formatStr: 'MMMM d, yyyy' });
      }

      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(item);
    });
    return groups;
  }, [filteredTimeline]);

  const getActivityIcon = (item) => {
    if (item.timelineType === 'STAGE_CHANGE') {
      return <GitCommit className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
    }
    if (item.timelineType === 'COMPLETED_FOLLOW_UP') {
      return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
    }
    switch (item.activityType) {
      case 'CALL':
        return <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case 'EMAIL':
        return <Mail className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
      case 'MEETING':
        return <Calendar className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
      case 'NOTE':
      default:
        return <StickyNote className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Inline Activity Composer */}
      <div className="rounded-card border bg-card p-4 shadow-xs space-y-3">
        {/* Segmented Type Bar */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-crm w-fit">
          {[
            { type: 'NOTE', label: 'Note', icon: StickyNote },
            { type: 'CALL', label: 'Call', icon: Phone },
            { type: 'EMAIL', label: 'Email', icon: Mail },
            { type: 'MEETING', label: 'Meeting', icon: Calendar },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = composerType === item.type;
            return (
              <button
                key={item.type}
                type="button"
                onClick={() => setComposerType(item.type)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 rounded-crm text-xs font-medium transition-all cursor-pointer',
                  isSelected
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Composer Inputs */}
        <form onSubmit={handleComposerSubmit} className="space-y-2.5">
          {composerType !== 'NOTE' && (
            <Input
              placeholder={`Subject (e.g. ${composerType === 'CALL' ? 'Follow-up regarding proposal' : 'Discussion notes'})`}
              value={composerSubject}
              onChange={(e) => setComposerSubject(e.target.value)}
              className="h-8 text-xs rounded-crm"
            />
          )}

          <Textarea
            placeholder={
              composerType === 'NOTE'
                ? 'Write an internal note or update about this account...'
                : `Log details about this ${composerType.toLowerCase()}...`
            }
            value={composerBody}
            onChange={(e) => setComposerBody(e.target.value)}
            rows={3}
            className="text-xs rounded-crm resize-none"
          />

          <div className="flex items-center justify-between pt-1">
            {composerType === 'CALL' ? (
              <Input
                placeholder="Call outcome (e.g. Left message, Connected)"
                value={composerOutcome}
                onChange={(e) => setComposerOutcome(e.target.value)}
                className="h-7 text-xs max-w-xs rounded-crm"
              />
            ) : (
              <div />
            )}

            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending || !composerBody.trim()}
              className="h-8 text-xs gap-1.5 rounded-crm"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Log {composerType.charAt(0) + composerType.slice(1).toLowerCase()}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* 2. Type Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5 pb-1">
        {TIMELINE_FILTERS.map((f) => {
          const Icon = f.icon;
          const isActive = activeFilter === f.id;
          return (
            <Button
              key={f.id}
              variant={isActive ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveFilter(f.id)}
              className={cn(
                'h-7 px-2.5 text-xs rounded-full gap-1.5 font-normal',
                isActive && 'font-semibold shadow-xs'
              )}
            >
              {Icon && <Icon className="h-3 w-3" />}
              <span>{f.label}</span>
            </Button>
          );
        })}
      </div>

      {/* 3. Grouped Timeline Feed */}
      {isLoading ? (
        <div className="space-y-4 py-8 text-center text-xs text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
          <p>Loading customer history...</p>
        </div>
      ) : Object.keys(groupedTimeline).length === 0 ? (
        <div className="rounded-card border border-dashed p-10 text-center text-muted-foreground space-y-2">
          <Clock className="h-8 w-8 mx-auto opacity-40" />
          <h4 className="font-semibold text-sm text-foreground">No interactions recorded yet</h4>
          <p className="text-xs max-w-sm mx-auto">
            Use the composer above to log your first call, email, or internal note.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTimeline).map(([groupDate, items]) => (
            <div key={groupDate} className="space-y-3">
              {/* Date Header Tag */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {groupDate}
                </span>
                <div className="h-px bg-border flex-1" />
              </div>

              {/* Feed Items */}
              <div className="space-y-3 relative before:absolute before:left-5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border/60">
                {items.map((item) => {
                  const canDelete =
                    item.timelineType === 'ACTIVITY' &&
                    item.activityType !== 'SYSTEM' &&
                    (item.actor?.id === currentUser?.id || currentUser?.role === 'ADMIN');

                  return (
                    <div
                      key={item.id}
                      className="relative pl-10 group transition-all"
                    >
                      {/* Timeline Node Dot */}
                      <div className="absolute left-3 top-2 -translate-x-1/2 h-6 w-6 rounded-full bg-background border flex items-center justify-center shadow-xs">
                        {getActivityIcon(item)}
                      </div>

                      {/* Card Content */}
                      <div className="rounded-card border bg-card p-3.5 shadow-xs space-y-1.5 hover:border-primary/40 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-xs font-semibold text-foreground truncate">
                              {item.subject}
                            </span>
                            {item.outcome && (
                              <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                                {item.outcome}
                              </Badge>
                            )}
                            {item.durationMinutes && (
                              <span className="text-[10px] text-muted-foreground">
                                • {item.durationMinutes}m
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-muted-foreground">
                              {formatDate(item.timestamp, { formatStr: 'h:mm a' })}
                            </span>

                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => setDeleteTargetId(item.id)}
                                className="opacity-0 group-hover:opacity-100 hover:text-destructive text-muted-foreground p-0.5 rounded cursor-pointer transition-opacity"
                                title="Delete activity"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Body text */}
                        {item.body && (
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                            {item.body}
                          </p>
                        )}

                        {/* Actor footer */}
                        <div className="flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
                          {item.actor ? (
                            <>
                              <span>By</span>
                              <span className="font-medium text-foreground">{item.actor.name}</span>
                            </>
                          ) : (
                            <span>System event</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm Deletion */}
      <ConfirmDialog
        open={Boolean(deleteTargetId)}
        onOpenChange={(isOpen) => !isOpen && setDeleteTargetId(null)}
        title="Delete activity record?"
        description="Are you sure you want to remove this interaction from the customer's timeline? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={async () => {
          if (deleteTargetId) {
            await deleteMutation.mutateAsync(deleteTargetId);
          }
        }}
      />
    </div>
  );
}

export default TimelineTab;
