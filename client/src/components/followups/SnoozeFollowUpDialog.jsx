import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Loader2, Calendar } from 'lucide-react';
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
import { Input } from '@/components/ui/input';

const PRESETS = [
  { id: '1_hour', label: '1 Hour', description: 'Remind me in 60 minutes' },
  { id: 'tomorrow_9am', label: 'Tomorrow 9:00 AM', description: 'Next business morning' },
  { id: 'next_week', label: 'Next Week', description: '7 days from today at 9:00 AM' },
];

export function SnoozeFollowUpDialog({ open, onOpenChange, followUp }) {
  const queryClient = useQueryClient();
  const [selectedPreset, setSelectedPreset] = useState('tomorrow_9am');
  const [customUntil, setCustomUntil] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const snoozeMutation = useMutation({
    mutationFn: async () => {
      if (!followUp?.id) return;
      const payload = useCustom && customUntil
        ? { until: new Date(customUntil).toISOString() }
        : { preset: selectedPreset };

      const res = await api.patch(`/follow-ups/${followUp.id}/snooze`, payload);
      return res.data?.data;
    },
    onSuccess: () => {
      toast.success('Task snoozed successfully!');
      queryClient.invalidateQueries({ queryKey: queryKeys.followUps.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.upcoming() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to snooze task');
    },
  });

  if (!followUp) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-crm bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">Snooze Follow-up</DialogTitle>
              <DialogDescription className="text-xs truncate max-w-[280px]">
                {followUp.title}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <Label className="text-xs font-semibold">Choose Snooze Preset</Label>
          <div className="grid grid-cols-1 gap-2">
            {PRESETS.map((p) => {
              const isSelected = !useCustom && selectedPreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setUseCustom(false);
                    setSelectedPreset(p.id);
                  }}
                  className={`flex items-center justify-between p-3 rounded-crm border text-left text-xs transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/5 text-primary font-medium ring-1 ring-primary'
                      : 'border-border hover:bg-muted/50 text-foreground'
                  }`}
                >
                  <span className="font-semibold">{p.label}</span>
                  <span className="text-[11px] text-muted-foreground">{p.description}</span>
                </button>
              );
            })}
          </div>

          {/* Custom Date Option */}
          <div className="pt-2 border-t space-y-2">
            <button
              type="button"
              onClick={() => setUseCustom(true)}
              className={`flex items-center gap-2 text-xs font-semibold ${
                useCustom ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Or pick a custom date & time</span>
            </button>

            {useCustom && (
              <Input
                type="datetime-local"
                value={customUntil}
                onChange={(e) => setCustomUntil(e.target.value)}
                className="h-9 text-xs"
                required
              />
            )}
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={snoozeMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => snoozeMutation.mutate()}
            disabled={snoozeMutation.isPending || (useCustom && !customUntil)}
          >
            {snoozeMutation.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Snoozing...
              </>
            ) : (
              <>
                <Clock className="mr-1.5 h-3.5 w-3.5" /> Snooze Task
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

