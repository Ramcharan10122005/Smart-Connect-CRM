import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CheckSquare, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { formatDate } from '@/lib/utils';
import { WidgetCard } from './WidgetCard';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

export function TodaysFollowUpsWidget({ ownerId }) {
  const queryClient = useQueryClient();
  const [completingId, setCompletingId] = useState(null);

  // Fetch today's and overdue follow-ups
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard', 'todays-followups', ownerId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (ownerId) params.append('assigneeId', ownerId);

      const [todayRes, overdueRes] = await Promise.all([
        api.get(`/follow-ups?view=today&${params.toString()}`),
        api.get(`/follow-ups?view=overdue&${params.toString()}`),
      ]);

      const todayItems = todayRes.data?.data?.items || [];
      const overdueItems = overdueRes.data?.data?.items || [];

      // Flag overdue items and place them on top
      const formattedOverdue = overdueItems.map((item) => ({ ...item, isOverdue: true }));
      const formattedToday = todayItems.map((item) => ({ ...item, isOverdue: false }));

      // Deduplicate in case an overdue task also meets today's boundary
      const seen = new Set();
      const merged = [];

      for (const item of [...formattedOverdue, ...formattedToday]) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          merged.push(item);
        }
      }

      return merged;
    },
    refetchInterval: 30000,
  });

  // Complete Mutation
  const completeMutation = useMutation({
    mutationFn: async (id) => {
      setCompletingId(id);
      await api.patch(`/follow-ups/${id}/complete`, { logActivity: true });
    },
    onSuccess: () => {
      toast.success('Follow-up completed and activity logged');
      queryClient.invalidateQueries({ queryKey: queryKeys.followUps.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to complete task');
    },
    onSettled: () => {
      setCompletingId(null);
    },
  });

  const items = data || [];
  const overdueCount = items.filter((i) => i.isOverdue).length;

  return (
    <WidgetCard
      title="Today's Tasks & Follow-ups"
      description={
        overdueCount > 0 ? (
          <span className="text-rose-600 dark:text-rose-400 font-semibold">
            {overdueCount} overdue item{overdueCount > 1 ? 's' : ''} require attention
          </span>
        ) : (
          `${items.length} tasks scheduled`
        )
      }
      headerAction={
        <Link
          to="/follow-ups"
          className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
        >
          <span>View All</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
      }
      isLoading={isLoading}
      isError={isError}
      onRetry={refetch}
    >
      <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
        {items.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <CheckSquare className="mx-auto h-8 w-8 text-muted-foreground/30" />
            <p className="text-xs font-semibold text-foreground">Zero pending follow-ups today!</p>
            <p className="text-[11px] text-muted-foreground">
              You are completely caught up with your scheduled communications.
            </p>
          </div>
        ) : (
          items.map((task) => {
            const isDone = task.status === 'DONE';
            const isProcessing = completingId === task.id;

            return (
              <div
                key={task.id}
                className={`flex items-start justify-between gap-3 p-3 rounded-crm border transition-all duration-150 ${
                  task.isOverdue
                    ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20'
                    : 'border-border/60 bg-card hover:bg-muted/40'
                }`}
              >
                {/* Left: Checkbox & Task details */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="pt-0.5">
                    <Checkbox
                      checked={isDone}
                      disabled={isProcessing || isDone}
                      onCheckedChange={() => completeMutation.mutate(task.id)}
                      aria-label={`Mark ${task.title} complete`}
                    />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs font-semibold leading-tight truncate ${
                          isDone ? 'line-through text-muted-foreground' : 'text-foreground'
                        }`}
                      >
                        {task.title}
                      </span>
                      {task.isOverdue && (
                        <span className="inline-flex items-center gap-1 rounded bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.2">
                          <AlertCircle className="h-2.5 w-2.5" /> OVERDUE
                        </span>
                      )}
                    </div>

                    {/* Linked contact or lead */}
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                      {task.contact && (
                        <Link
                          to={`/customers/contact/${task.contact.id}`}
                          className="hover:text-primary transition-colors truncate max-w-[130px] font-medium"
                        >
                          {task.contact.firstName} {task.contact.lastName}
                        </Link>
                      )}
                      {task.lead && (
                        <Link
                          to={`/leads?id=${task.lead.id}`}
                          className="hover:text-primary transition-colors truncate max-w-[130px]"
                        >
                          Deal: {task.lead.title}
                        </Link>
                      )}
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDate(task.dueAt, 'relative')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Priority badge */}
                <div className="shrink-0 pt-0.5">
                  <Badge
                    variant={
                      task.priority === 'URGENT'
                        ? 'urgent'
                        : task.priority === 'HIGH'
                          ? 'warning'
                          : 'secondary'
                    }
                    className="text-[10px] px-1.5 py-0 font-mono uppercase"
                  >
                    {task.priority}
                  </Badge>
                </div>
              </div>
            );
          })
        )}
      </div>
    </WidgetCard>
  );
}

export default TodaysFollowUpsWidget;
