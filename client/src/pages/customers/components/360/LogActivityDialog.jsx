import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Phone, Mail, Calendar, StickyNote, Loader2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const ACTIVITY_TYPES = [
  { type: 'CALL', label: 'Phone Call', icon: Phone },
  { type: 'EMAIL', label: 'Email', icon: Mail },
  { type: 'MEETING', label: 'Meeting', icon: Calendar },
  { type: 'NOTE', label: 'Quick Note', icon: StickyNote },
];

export function LogActivityDialog({
  open,
  onOpenChange,
  defaultType = 'CALL',
  contactId = null,
  companyId = null,
  leadId = null,
  onSuccess,
}) {
  const queryClient = useQueryClient();

  const [type, setType] = useState(defaultType);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [outcome, setOutcome] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');

  useEffect(() => {
    if (open) {
      setType(defaultType);
      const defaultSubjects = {
        CALL: 'Phone call logged',
        EMAIL: 'Email correspondence',
        MEETING: 'Meeting notes',
        NOTE: 'Note logged',
      };
      setSubject(defaultSubjects[defaultType] || 'Activity logged');
      setBody('');
      setOutcome('');
      setDurationMinutes(defaultType === 'CALL' ? '15' : defaultType === 'MEETING' ? '30' : '');
    }
  }, [open, defaultType]);

  const logMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/activities', payload);
      return res.data?.data;
    },
    // Optimistic update
    onMutate: async (newActivity) => {
      const timelineKey = queryKeys.activities.timeline({
        contactId: contactId || undefined,
        companyId: companyId || undefined,
      });
      await queryClient.cancelQueries({ queryKey: timelineKey });
      const previousTimeline = queryClient.getQueryData(timelineKey);

      if (previousTimeline) {
        const optimisticItem = {
          id: `temp-${Date.now()}`,
          timelineType: 'ACTIVITY',
          activityType: newActivity.type,
          subject: newActivity.subject,
          body: newActivity.body,
          outcome: newActivity.outcome,
          durationMinutes: newActivity.durationMinutes,
          timestamp: new Date().toISOString(),
          actor: { name: 'You' },
        };
        queryClient.setQueryData(timelineKey, [optimisticItem, ...previousTimeline]);
      }

      return { previousTimeline, timelineKey };
    },
    onError: (err, _variables, context) => {
      if (context?.timelineKey && context?.previousTimeline) {
        queryClient.setQueryData(context.timelineKey, context.previousTimeline);
      }
      toast.error(err.message || 'Failed to log activity');
    },
    onSettled: (data) => {
      if (contactId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.contacts.overview(contactId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.activities.timeline({ contactId }) });
      }
      if (companyId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.companies.overview(companyId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.activities.timeline({ companyId }) });
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Activity logged successfully');
      onOpenChange(false);
      if (onSuccess) onSuccess(data);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }

    logMutation.mutate({
      type,
      subject: subject.trim(),
      body: body.trim() || null,
      outcome: outcome.trim() || null,
      durationMinutes: durationMinutes ? Number(durationMinutes) : null,
      contactId: contactId || null,
      companyId: companyId || null,
      leadId: leadId || null,
      occurredAt: new Date(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Log Interaction</DialogTitle>
          <DialogDescription className="text-xs">
            Record a call, meeting, email, or internal note to customer history.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Type Selector Pills */}
          <div className="grid grid-cols-4 gap-1.5 p-1 bg-muted/60 rounded-crm">
            {ACTIVITY_TYPES.map((t) => {
              const Icon = t.icon;
              const isSelected = type === t.type;
              return (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => {
                    setType(t.type);
                    if (subject.endsWith('logged') || subject.endsWith('notes') || subject.endsWith('correspondence')) {
                      const def = {
                        CALL: 'Phone call logged',
                        EMAIL: 'Email correspondence',
                        MEETING: 'Meeting notes',
                        NOTE: 'Note logged',
                      };
                      setSubject(def[t.type] || 'Activity logged');
                    }
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-crm text-[11px] font-medium transition-all cursor-pointer',
                    isSelected
                      ? 'bg-background text-primary shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{t.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label htmlFor="actSubject" className="text-xs font-medium">
              Subject <span className="text-destructive">*</span>
            </Label>
            <Input
              id="actSubject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Initial intro call, contract discussion"
              className="h-9 text-xs rounded-crm"
              required
            />
          </div>

          {/* Outcome & Duration (for Call / Meeting) */}
          {(type === 'CALL' || type === 'MEETING') && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="actOutcome" className="text-xs font-medium">
                  Outcome
                </Label>
                <Select value={outcome} onValueChange={setOutcome}>
                  <SelectTrigger className="h-8 text-xs rounded-crm">
                    <SelectValue placeholder="Select outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Connected">Connected / Positive</SelectItem>
                    <SelectItem value="Left Voicemail">Left Voicemail</SelectItem>
                    <SelectItem value="No Answer">No Answer / Busy</SelectItem>
                    <SelectItem value="Follow-up Required">Follow-up Required</SelectItem>
                    <SelectItem value="Wrong Number">Wrong Number</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="actDuration" className="text-xs font-medium">
                  Duration (mins)
                </Label>
                <Input
                  id="actDuration"
                  type="number"
                  min="0"
                  placeholder="15"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className="h-8 text-xs rounded-crm"
                />
              </div>
            </div>
          )}

          {/* Body / Description */}
          <div className="space-y-1.5">
            <Label htmlFor="actBody" className="text-xs font-medium">
              Notes & Discussion Details
            </Label>
            <Textarea
              id="actBody"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Key talking points, client feedback, action items agreed upon..."
              rows={4}
              className="text-xs rounded-crm"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={logMutation.isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={logMutation.isPending}
              className="min-w-24"
            >
              {logMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving...
                </>
              ) : (
                'Save Activity'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default LogActivityDialog;

