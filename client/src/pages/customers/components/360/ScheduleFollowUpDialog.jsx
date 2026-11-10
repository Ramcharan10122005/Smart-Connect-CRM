import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';
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

export function ScheduleFollowUpDialog({
  open,
  onOpenChange,
  contactId = null,
  leadId = null,
  onSuccess,
}) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('09:00');
  const [priority, setPriority] = useState('MEDIUM');
  const [recurrence, setRecurrence] = useState('NONE');
  const [assigneeId, setAssigneeId] = useState('');

  // Team users for assignee
  const { data: usersData } = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: async () => {
      const res = await api.get('/users?limit=100');
      return res.data?.data || [];
    },
  });
  const users = usersData || [];

  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      // Default to tomorrow 9:00 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDueDate(tomorrow.toISOString().slice(0, 10));
      setDueTime('09:00');
      setPriority('MEDIUM');
      setRecurrence('NONE');
      setAssigneeId(currentUser?.id || '');
    }
  }, [open, currentUser]);

  const scheduleMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/follow-ups', payload);
      return res.data?.data;
    },
    onSuccess: (data) => {
      if (contactId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.contacts.overview(contactId) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.followUps?.all || ['follow-ups'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Follow-up scheduled successfully');
      onOpenChange(false);
      if (onSuccess) onSuccess(data);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to schedule follow-up');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter a follow-up title');
      return;
    }
    if (!dueDate) {
      toast.error('Please select a due date');
      return;
    }

    const [hours, minutes] = dueTime.split(':');
    const combinedDueAt = new Date(dueDate);
    combinedDueAt.setHours(Number(hours || 9), Number(minutes || 0), 0, 0);

    scheduleMutation.mutate({
      title: title.trim(),
      description: description.trim() || null,
      dueAt: combinedDueAt,
      priority,
      recurrence,
      assigneeId: assigneeId || null,
      contactId: contactId || null,
      leadId: leadId || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            Schedule Follow-up Task
          </DialogTitle>
          <DialogDescription className="text-xs">
            Set a reminder to reconnect with this customer and keep momentum going.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="fuTitle" className="text-xs font-medium">
              Task Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="fuTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Call to review proposal pricing"
              className="h-9 text-xs rounded-crm"
              required
            />
          </div>

          {/* Due Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fuDate" className="text-xs font-medium">
                Due Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fuDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9 text-xs rounded-crm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fuTime" className="text-xs font-medium">
                Time
              </Label>
              <Input
                id="fuTime"
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="h-9 text-xs rounded-crm"
              />
            </div>
          </div>

          {/* Priority & Recurrence */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-9 text-xs rounded-crm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent (Red Alert)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Recurrence</Label>
              <Select value={recurrence} onValueChange={setRecurrence}>
                <SelectTrigger className="h-9 text-xs rounded-crm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No repeat</SelectItem>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignee */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Assignee</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger className="h-9 text-xs rounded-crm">
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="fuDesc" className="text-xs font-medium">
              Instructions or Context
            </Label>
            <Textarea
              id="fuDesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Specific questions to ask, deliverables to confirm..."
              rows={3}
              className="text-xs rounded-crm"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={scheduleMutation.isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={scheduleMutation.isPending}
              className="min-w-28"
            >
              {scheduleMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Scheduling...
                </>
              ) : (
                'Save Follow-up'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ScheduleFollowUpDialog;

