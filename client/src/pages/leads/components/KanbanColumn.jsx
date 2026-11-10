import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LeadCard } from './LeadCard';

export function KanbanColumn({
  stage,
  leads = [],
  totalValue = 0,
  weightedValue = 0,
  onAddLeadToStage,
  onCardClick,
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: {
      type: 'STAGE',
      stage,
    },
  });

  const leadIds = leads.map((l) => l.id);

  return (
    <div
      className={cn(
        'w-80 shrink-0 flex flex-col rounded-card border bg-muted/30 max-h-[calc(100vh-210px)] transition-colors',
        isOver && 'border-primary ring-1 ring-primary/30 bg-primary/5'
      )}
    >
      {/* Column Header */}
      <div className="p-3 border-b bg-card rounded-t-card space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: stage.color || '#4F46E5' }}
            />
            <span className="font-semibold text-xs text-foreground truncate">
              {stage.name}
            </span>
            <Badge variant="secondary" className="h-4.5 px-1.5 text-[10px] rounded-full font-medium">
              {leads.length}
            </Badge>
          </div>

          {/* Quick Add Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onAddLeadToStage(stage.id)}
            className="h-6 w-6 rounded-crm text-muted-foreground hover:text-foreground hover:bg-muted"
            title={`Add lead to ${stage.name}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Stage Value Subtotal & Probability */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">
            {formatCurrency(totalValue)}
          </span>
          <span className="text-[10px] opacity-75">
            {stage.probability}% prob. ({formatCurrency(weightedValue)})
          </span>
        </div>
      </div>

      {/* Cards Scrollable Body */}
      <div
        ref={setNodeRef}
        className="p-2 flex-1 overflow-y-auto space-y-2.5 min-h-[150px]"
      >
        <SortableContext items={leadIds} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onClick={onCardClick}
            />
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <div className="h-28 flex items-center justify-center border-2 border-dashed border-border/50 rounded-card text-center p-3">
            <p className="text-[11px] text-muted-foreground/60 italic">
              Drop leads here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default KanbanColumn;

