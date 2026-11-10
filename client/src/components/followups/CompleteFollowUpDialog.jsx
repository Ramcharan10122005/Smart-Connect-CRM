import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

export function CompleteFollowUpDialog({ open, onOpenChange, followUp }) {
  const queryClient = useQueryClient();
  const [logActivity, setLogActivity] = useState(true);
  const [note, setNote] = useState('');

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!followUp?.id) return;
      const res = await api.patch(`/follow-ups/${followUp.id}/complete`, {
        logActivity,
        note: note.trim() || undefined,
      });
      return res.data?.data;
    },
    onSuccess: (data) => {
      toast.success(
        data?.nextOccurrence
          ? 'Task completed! Next recurring task has been created.'
          : 'Task marked as completed!'
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.followUps.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.upcoming() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
      onOpenChange(false);
      setNote('');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to complete task');
    },
  });

  if (!followUp) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-crm bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">Complete Follow-up Task</DialogTitle>
              <DialogDescription className="text-xs truncate max-w-[280px]">
                {followUp.title}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="rounded-card border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="log-note-check"
                checked={logActivity}
                onCheckedChange={(checked) => setLogActivity(Boolean(checked))}
              />
              <Label
                htmlFor="log-note-check"
                className="text-xs font-semibold text-foreground cursor-pointer flex items-center gap-1.5"
              >
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span>Log a note activity about this task</span>
              </Label>
            </div>

            {logActivity && (
              <div className="pt-1">
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Summarize outcome, client feedback, or touchpoint notes..."
                  rows={3}
                  className="text-xs resize-none bg-background"
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={completeMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => completeMutation.mutate()}
            disabled={completeMutation.isPending}
          >
            {completeMutation.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Completing...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Mark Completed
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

