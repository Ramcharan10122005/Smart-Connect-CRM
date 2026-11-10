import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock,
  CheckCircle2,
  Loader2,
  User,
  Target,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';
import { useDialogStore } from '@/stores/dialogStore';
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

export function FollowUpModal() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const { followUpModalOpen, followUpModalData, closeFollowUpModal } = useDialogStore();

  const isEdit = Boolean(followUpModalData?.isEdit);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [recurrence, setRecurrence] = useState('NONE');
  const [assigneeId, setAssigneeId] = useState('');

  // Target entity
  const [linkType, setLinkType] = useState('contact'); // 'contact' | 'lead'
  const [contactId, setContactId] = useState('');
  const [leadId, setLeadId] = useState('');

  // Fetch users for assignment
  const { data: usersData } = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: async () => {
      const res = await api.get('/users?limit=100');
      return res.data?.data || [];
    },
    enabled: followUpModalOpen,
  });

  // Fetch contacts
  const { data: contactsData } = useQuery({
    queryKey: queryKeys.contacts.list({ limit: 100 }),
    queryFn: async () => {
      const res = await api.get('/contacts?limit=100');
      return res.data?.data || [];
    },
    enabled: followUpModalOpen,
  });

  // Fetch leads
  const { data: leadsData } = useQuery({
    queryKey: queryKeys.leads.list({ limit: 100 }),
    queryFn: async () => {
      const res = await api.get('/leads?limit=100');
      return res.data?.data || [];
    },
    enabled: followUpModalOpen,
  });

  useEffect(() => {
    if (followUpModalOpen) {
      if (isEdit && followUpModalData) {
        setTitle(followUpModalData.title || '');
        setDescription(followUpModalData.description || '');

        if (followUpModalData.dueAt) {
          const d = new Date(followUpModalData.dueAt);
          d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
          setDueAt(d.toISOString().slice(0, 16));
        } else {
          setDueAt('');
        }

        setPriority(followUpModalData.priority || 'MEDIUM');
        setRecurrence(followUpModalData.recurrence || 'NONE');
        setAssigneeId(followUpModalData.assigneeId || followUpModalData.assignee?.id || currentUser?.id || '');

        if (followUpModalData.leadId) {
          setLinkType('lead');
          setLeadId(followUpModalData.leadId);
          setContactId('');
        } else {
          setLinkType('contact');
          setContactId(followUpModalData.contactId || '');
          setLeadId('');
        }
      } else {
        // Create mode
        setTitle(followUpModalData?.title || '');
        setDescription(followUpModalData?.description || '');

        // Default dueAt
        if (followUpModalData?.dueAt) {
          const d = new Date(followUpModalData.dueAt);
          d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
          setDueAt(d.toISOString().slice(0, 16));
        } else {
          const d = new Date();
          d.setDate(d.getDate() + 1);
          d.setHours(10, 0, 0, 0);
          d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
          setDueAt(d.toISOString().slice(0, 16));
        }

        setPriority(followUpModalData?.priority || 'MEDIUM');
        setRecurrence(followUpModalData?.recurrence || 'NONE');
        setAssigneeId(followUpModalData?.assigneeId || currentUser?.id || '');

        if (followUpModalData?.leadId) {
          setLinkType('lead');
          setLeadId(followUpModalData.leadId);
          setContactId('');
        } else if (followUpModalData?.contactId) {
          setLinkType('contact');
          setContactId(followUpModalData.contactId);
          setLeadId('');
        } else {
          setLinkType('contact');
          setContactId('');
          setLeadId('');
        }
      }
    }
  }, [followUpModalOpen, followUpModalData, isEdit, currentUser]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        dueAt: dueAt ? new Date(dueAt).toISOString() : new Date().toISOString(),
        priority,
        recurrence,
        assigneeId: assigneeId || currentUser?.id,
        contactId: linkType === 'contact' ? contactId || null : null,
        leadId: linkType === 'lead' ? leadId || null : null,
      };

      if (isEdit && followUpModalData?.id) {
        const res = await api.patch(`/follow-ups/${followUpModalData.id}`, payload);
        return res.data?.data;
      } else {
        const res = await api.post('/follow-ups', payload);
        return res.data?.data;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Follow-up task updated!' : 'Follow-up task scheduled!');
      queryClient.invalidateQueries({ queryKey: queryKeys.followUps.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.upcoming() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
      closeFollowUpModal();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err.message || 'Failed to save follow-up');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Task title is required');
      return;
    }
    mutation.mutate();
  };

  const users = usersData || [];
  const contacts = contactsData || [];
  const leads = leadsData || [];

  return (
    <Dialog open={followUpModalOpen} onOpenChange={(val) => !val && closeFollowUpModal()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-crm bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <CalendarClock className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                {isEdit ? 'Edit Follow-up Task' : 'Schedule New Follow-up'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {isEdit
                  ? 'Update task details, due date, priority, or reassignment.'
                  : 'Set a reminder to reach out, send a proposal, or follow up on a lead.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="fu-title" className="text-xs font-semibold">
              Task Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="fu-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Call John to review revised proposal"
              className="h-9 text-xs"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="fu-desc" className="text-xs font-semibold">
              Description / Notes
            </Label>
            <Textarea
              id="fu-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Context or preparation notes for this task..."
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          {/* Due date, Priority & Recurrence */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Due Date & Time <span className="text-destructive">*</span>
              </Label>
              <Input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <RefreshCw className="h-3 w-3 text-muted-foreground" />
                <span>Recurrence</span>
              </Label>
              <Select value={recurrence} onValueChange={setRecurrence}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">One-time</SelectItem>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignee */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Assigned Sales Rep</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select assignee..." />
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

          {/* Linked Record (Contact or Lead) */}
          <div className="space-y-2 rounded-card border bg-muted/20 p-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">
                Linked Record (Optional)
              </Label>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant={linkType === 'contact' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-6 text-[11px] px-2"
                  onClick={() => {
                    setLinkType('contact');
                    setLeadId('');
                  }}
                >
                  <User className="h-3 w-3 mr-1" /> Contact
                </Button>
                <Button
                  type="button"
                  variant={linkType === 'lead' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-6 text-[11px] px-2"
                  onClick={() => {
                    setLinkType('lead');
                    setContactId('');
                  }}
                >
                  <Target className="h-3 w-3 mr-1" /> Lead
                </Button>
              </div>
            </div>

            {linkType === 'contact' ? (
              <Select value={contactId} onValueChange={setContactId}>
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="Link to a contact..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="none">-- None --</SelectItem>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.firstName} {c.lastName} {c.company?.name ? `(${c.company.name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select value={leadId} onValueChange={setLeadId}>
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="Link to a lead..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="none">-- None --</SelectItem>
                  {leads.map((l) => (
                    <SelectItem key={l.id} value={l.id} className="text-xs">
                      {l.title} {l.companyName ? `• ${l.companyName}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={closeFollowUpModal}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  {isEdit ? 'Save Changes' : 'Schedule Task'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
