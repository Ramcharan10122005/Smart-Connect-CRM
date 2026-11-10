import { Link } from 'react-router-dom';
import {
  Phone,
  Mail,
  Users,
  FileText,
  Info,
  CalendarDays,
  ExternalLink,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { WidgetCard } from './WidgetCard';

const TYPE_CONFIG = {
  CALL: {
    icon: Phone,
    color: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
  },
  EMAIL: {
    icon: Mail,
    color: 'text-purple-600 bg-purple-500/10 border-purple-500/20',
  },
  MEETING: {
    icon: Users,
    color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
  },
  NOTE: {
    icon: FileText,
    color: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
  },
  SYSTEM: {
    icon: Info,
    color: 'text-slate-600 bg-slate-500/10 border-slate-500/20',
  },
};

export function RecentActivityWidget({ activities = [], isLoading = false, isError = false, onRetry }) {
  return (
    <WidgetCard
      title="Recent Activity Feed"
      description="Real-time log of customer touchpoints"
      headerAction={
        <Link
          to="/activities"
          className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
        >
          <span>View All</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
      }
      isLoading={isLoading}
      isError={isError}
      onRetry={onRetry}
    >
      <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
        {activities.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/30" />
            <p className="text-xs font-semibold text-foreground">No recent activities logged</p>
            <p className="text-[11px] text-muted-foreground">
              Interactions logged with contacts and leads will appear here.
            </p>
          </div>
        ) : (
          activities.map((item) => {
            const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.NOTE;
            const Icon = config.icon;

            return (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 rounded-crm border border-border/60 bg-card hover:bg-muted/30 transition-colors"
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${config.color}`}
                >
                  <Icon className="h-4 w-4" />
                </div>

                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground truncate">
                      {item.subject}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                      {formatDate(item.occurredAt, 'relative')}
                    </span>
                  </div>

                  {item.body && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {item.body}
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-0.5 text-[11px] text-muted-foreground flex-wrap">
                    {item.contact && (
                      <Link
                        to={`/customers/contact/${item.contact.id}`}
                        className="text-primary hover:underline truncate max-w-[140px] font-medium"
                      >
                        {item.contact.firstName} {item.contact.lastName}
                      </Link>
                    )}
                    {item.lead && (
                      <Link
                        to={`/leads?id=${item.lead.id}`}
                        className="hover:text-foreground truncate max-w-[140px]"
                      >
                        • Deal: {item.lead.title}
                      </Link>
                    )}
                    {item.createdBy && (
                      <span className="text-[10px] text-muted-foreground/80">
                        by {item.createdBy.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </WidgetCard>
  );
}

export default RecentActivityWidget;

