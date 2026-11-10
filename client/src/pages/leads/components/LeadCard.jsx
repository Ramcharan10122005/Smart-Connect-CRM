import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Building2,
  User,
  Clock,
  Calendar,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { cn, formatCurrency, formatDate, initials } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function LeadCard({ lead, onClick, isOverlay = false }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lead.id,
    data: {
      type: 'LEAD',
      lead,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const contactName = lead.contact
    ? `${lead.contact.firstName} ${lead.contact.lastName}`
    : lead.firstName && lead.lastName
    ? `${lead.firstName} ${lead.lastName}`
    : null;

  const companyName = lead.company?.name || lead.companyName || null;

  // Calculate days in current stage
  const stageDate = lead.stageUpdatedAt || lead.createdAt;
  const daysInStage = Math.max(
    0,
    Math.floor((Date.now() - new Date(stageDate).getTime()) / (1000 * 60 * 60 * 24))
  );

  // Next follow-up (if present on lead or through relation)
  const nextFollowUp = lead.nextFollowUp || (lead.followUps && lead.followUps[0]);
  const isFollowUpOverdue =
    nextFollowUp?.dueAt && new Date(nextFollowUp.dueAt) < new Date();

  // Priority badge styling
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'URGENT':
        return (
          <Badge variant="destructive" className="text-[10px] py-0 px-1.5 font-medium">
            Urgent
          </Badge>
        );
      case 'HIGH':
        return (
          <Badge
            variant="outline"
            className="text-[10px] py-0 px-1.5 text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/40 font-medium"
          >
            High
          </Badge>
        );
      case 'LOW':
        return (
          <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-muted-foreground font-normal">
            Low
          </Badge>
        );
      case 'MEDIUM':
      default:
        return (
          <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
            Med
          </Badge>
        );
    }
  };

  // Score styling (0 - 100)
  const score = lead.score ?? 50;
  const scoreColor =
    score >= 70
      ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
      : score >= 40
      ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
      : 'text-slate-500 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick && onClick(lead)}
      className={cn(
        'rounded-card border bg-card p-3 shadow-xs space-y-2.5 transition-all cursor-grab active:cursor-grabbing hover:border-primary/50 group select-none',
        isDragging && 'opacity-30 border-dashed border-primary',
        isOverlay && 'shadow-xl border-primary ring-2 ring-primary/20 cursor-grabbing rotate-1 scale-105'
      )}
    >
      {/* Top Header: Title + Priority */}
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-tight">
          {lead.title}
        </h4>
        <div className="shrink-0">{getPriorityBadge(lead.priority)}</div>
      </div>

      {/* Contact & Company */}
      {(contactName || companyName) && (
        <div className="space-y-0.5 text-[11px] text-muted-foreground">
          {contactName && (
            <div className="flex items-center gap-1.5 truncate">
              <User className="h-3 w-3 shrink-0 opacity-60" />
              <span className="truncate">{contactName}</span>
            </div>
          )}
          {companyName && (
            <div className="flex items-center gap-1.5 truncate">
              <Building2 className="h-3 w-3 shrink-0 opacity-60" />
              <span className="truncate">{companyName}</span>
            </div>
          )}
        </div>
      )}

      {/* Middle Row: Deal Value + Score Ring */}
      <div className="flex items-center justify-between pt-1">
        <span className="font-bold text-sm text-foreground">
          {formatCurrency(lead.value || 0, lead.currency || 'USD')}
        </span>

        {/* Lead Score Tooltip */}
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
              <div
                className={cn(
                  'flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-bold cursor-help',
                  scoreColor
                )}
              >
                <Sparkles className="h-2.5 w-2.5" />
                <span>{score}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs p-2.5 space-y-1">
              <div className="font-semibold flex items-center justify-between pb-1 border-b">
                <span>Lead Quality Score</span>
                <span className="text-primary font-bold">{score}/100</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal">
                Computed from contact completeness (+20), deal value (+25), acquisition source (+15), 14-day activity velocity (+20), and stage probability (+20).
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Footer: Owner Avatar, Days in Stage, Follow-up Reminder */}
      <div className="flex items-center justify-between pt-2 border-t text-[10px] text-muted-foreground">
        <div className="flex items-center gap-2 truncate">
          {/* Owner Avatar */}
          <Avatar className="h-5 w-5 shrink-0" title={`Owner: ${lead.owner?.name || 'Unassigned'}`}>
            <AvatarImage src={lead.owner?.avatarUrl} alt={lead.owner?.name} />
            <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
              {initials(lead.owner?.name || 'SC')}
            </AvatarFallback>
          </Avatar>

          {/* Days in stage */}
          <span className="flex items-center gap-1 truncate" title="Days in current pipeline stage">
            <Clock className="h-2.5 w-2.5 opacity-60" />
            <span>{daysInStage}d in stage</span>
          </span>
        </div>

        {/* Next follow-up */}
        {nextFollowUp && (
          <span
            className={cn(
              'flex items-center gap-1 shrink-0 font-medium',
              isFollowUpOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'
            )}
            title={isFollowUpOverdue ? 'Overdue task reminder!' : 'Next task due'}
          >
            {isFollowUpOverdue ? (
              <AlertCircle className="h-2.5 w-2.5" />
            ) : (
              <Calendar className="h-2.5 w-2.5 opacity-60" />
            )}
            <span>{formatDate(nextFollowUp.dueAt, { relative: true })}</span>
          </span>
        )}
      </div>
    </div>
  );
}

export default LeadCard;
