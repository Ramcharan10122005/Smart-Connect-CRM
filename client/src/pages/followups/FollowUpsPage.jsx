import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, CheckSquare } from 'lucide-react';

export default function FollowUpsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Follow-ups & Tasks"
        description="Schedule reminders, snooze upcoming tasks, and manage recurring sales touchpoints."
        actions={
          <Button size="sm">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> New Follow-up
          </Button>
        }
      />

      <Card className="min-h-[400px] flex items-center justify-center border-dashed">
        <div className="text-center p-8">
          <CheckSquare className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
          <h3 className="font-semibold text-sm">Follow-up Task Manager</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Overdue, today, and upcoming tasks with automated reminder notifications.
          </p>
        </div>
      </Card>
    </div>
  );
}
