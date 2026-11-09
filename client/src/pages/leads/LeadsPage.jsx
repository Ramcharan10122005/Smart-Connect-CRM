import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Target, LayoutGrid, List } from 'lucide-react';

export default function LeadsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads & Pipeline"
        description="Track active deals through stages, view Kanban board, and score incoming opportunities."
        actions={
          <>
            <div className="flex items-center rounded-crm border border-border/60 bg-muted/30 p-0.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 text-xs bg-background shadow-xs"
              >
                <LayoutGrid className="mr-1.5 h-3.5 w-3.5" /> Board
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 text-xs text-muted-foreground"
              >
                <List className="mr-1.5 h-3.5 w-3.5" /> List
              </Button>
            </div>
            <Button size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New Lead
            </Button>
          </>
        }
      />

      <Card className="min-h-[400px] flex items-center justify-center border-dashed">
        <div className="text-center p-8">
          <Target className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
          <h3 className="font-semibold text-sm">Pipeline Stages & Deals</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Kanban drag-and-drop board with stage metrics and lead conversion workflows.
          </p>
        </div>
      </Card>
    </div>
  );
}
