import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserCheck, Loader2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function ReassignFollowUpDialog({ open, onOpenChange, followUp }) {
  const queryClient = useQueryClient();
  const [assigneeId, setAssigneeId] = useState('');

  // Fetch users
  const { data: usersData } = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: async () => {
      const res = await api.get('/users?limit=100');
      return res.data?.data || [];
    },
    enabled: open,
  });

  useEffect(() => {
    if (open && followUp) {
      setAssigneeId(followUp.assigneeId || followUp.assignee?.id || '');
    }
  }, [open, followUp]);

  const reassignMutation = useMutation({
    mutationFn: async () => {
      if (!followUp?.id || !assigneeId) return;
      const res = await api.patch(`/follow-ups/${followUp.id}/reassign`, { assigneeId });
      return res.data?.data;
    },
    onSuccess: () => {
      toast.success('Task reassigned successfully!');
      queryClient.invalidateQueries({ queryKey: queryKeys.followUps.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.upcoming() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to reassign task');
    },
  });

  if (!followUp) return null;
  const users = usersData || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-crm bg-primary/10 text-primary">
              <UserCheck className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">Reassign Follow-up Task</DialogTitle>
              <DialogDescription className="text-xs truncate max-w-[280px]">
                {followUp.title}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <Label className="text-xs font-semibold">Select New Assignee</Label>
          <Select value={assigneeId} onValueChange={setAssigneeId}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Choose a sales rep..." />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id} className="text-xs">
                  {u.name} ({u.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={reassignMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => reassignMutation.mutate()}
            disabled={reassignMutation.isPending || !assigneeId}
          >
            {reassignMutation.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Reassigning...
              </>
            ) : (
              'Save Assignee'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

