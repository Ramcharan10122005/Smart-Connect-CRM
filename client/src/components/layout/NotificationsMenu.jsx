import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, ExternalLink, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function NotificationsMenu() {
  const queryClient = useQueryClient();

  // Fetch unread count every 30 seconds
  const { data: countData } = useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: async () => {
      const res = await api.get('/notifications/unread-count');
      return res.data?.data?.count || 0;
    },
    refetchInterval: 30000,
  });

  // Fetch recent notifications
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: queryKeys.notifications.list({ limit: 5 }),
    queryFn: async () => {
      const res = await api.get('/notifications?limit=5');
      const data = res.data?.data;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.items)) return data.items;
      return [];
    },
    refetchInterval: 30000,
  });

  // Mutation: mark single read
  const markReadMutation = useMutation({
    mutationFn: async (id) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });

  // Mutation: mark all read
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });

  const unreadCount = countData || 0;
  const notifications = notificationsData || [];

  const isNotificationUnread = (item) => {
    if (typeof item.read === 'boolean') {
      return !item.read;
    }
    return !item.readAt;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Notifications (${unreadCount} unread)`}
          className="relative flex h-9 w-9 items-center justify-center rounded-crm border border-border/60 bg-background text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white shadow-sm ring-2 ring-background">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80 sm:w-96 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-sm">Notifications</span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="h-7 text-xs text-muted-foreground hover:text-foreground px-2"
            >
              <CheckCheck className="mr-1 h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-[360px] overflow-y-auto divide-y divide-border/60">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center">
              <Clock className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-xs font-medium text-foreground">All caught up!</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">No new notifications.</p>
            </div>
          ) : (
            notifications.map((item) => {
              const isUnread = isNotificationUnread(item);
              return (
                <div
                  key={item.id}
                  className={`p-3.5 text-xs transition-colors hover:bg-muted/50 ${
                    isUnread ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p
                        className={`font-medium ${isUnread ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}
                      >
                        {item.title}
                      </p>
                      <p className="text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.body}
                      </p>
                      <div className="flex items-center gap-2 pt-1 text-[10px] text-muted-foreground">
                        <span>{formatDate(item.createdAt, 'relative')}</span>
                        {item.link && (
                          <Link
                            to={item.link}
                            onClick={() => isUnread && markReadMutation.mutate(item.id)}
                            className="inline-flex items-center text-primary hover:underline font-medium"
                          >
                            View <ExternalLink className="ml-0.5 h-2.5 w-2.5" />
                          </Link>
                        )}
                      </div>
                    </div>

                    {isUnread && (
                      <button
                        type="button"
                        title="Mark as read"
                        onClick={(e) => {
                          e.stopPropagation();
                          markReadMutation.mutate(item.id);
                        }}
                        className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1 hover:ring-2 hover:ring-primary/40"
                      />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NotificationsMenu;
