import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, CalendarDays } from 'lucide-react';

export default function ActivitiesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Activities"
        description="Unified log of all customer interactions including calls, emails, meetings, and notes."
        actions={
          <Button size="sm">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Log Activity
          </Button>
        }
      />

      <Card className="min-h-[400px] flex items-center justify-center border-dashed">
        <div className="text-center p-8">
          <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
          <h3 className="font-semibold text-sm">Activity Feed</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Chronological audit log of customer touchpoints with filterable types and links.
          </p>
        </div>
      </Card>
    </div>
  );
}
