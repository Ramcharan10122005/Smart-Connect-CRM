import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Loader2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function CreateLeadDialog({
  open,
  onOpenChange,
  contactId = null,
  companyId = null,
  companyName = null,
  contactName = null,
  onSuccess,
}) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);

  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [stageId, setStageId] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [sourceId, setSourceId] = useState('');

  // Fetch pipeline stages
  const { data: stagesData, isLoading: isStagesLoading } = useQuery({
    queryKey: queryKeys.pipelineStages.all,
    queryFn: async () => {
      const res = await api.get('/pipeline-stages');
      return res.data?.data || [];
    },
  });
  const stages = useMemo(() => stagesData || [], [stagesData]);

  // Fetch lead sources
  const { data: sourcesData } = useQuery({
    queryKey: queryKeys.leadSources.all,
    queryFn: async () => {
      const res = await api.get('/lead-sources');
      return res.data?.data || [];
    },
  });
  const sources = sourcesData || [];

  useEffect(() => {
    if (open) {
      const targetName = contactName || companyName || 'Deal';
      setTitle(`${targetName} - Growth Deal`);
      setValue('25000');
      if (stages.length > 0) {
        setStageId(stages[0].id);
      }
      setPriority('MEDIUM');
      // Default expected close in 30 days
      const closeDate = new Date();
      closeDate.setDate(closeDate.getDate() + 30);
      setExpectedCloseDate(closeDate.toISOString().slice(0, 10));
      setSourceId('');
    }
  }, [open, contactName, companyName, stages]);

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/leads', payload);
      return res.data?.data;
    },
    onSuccess: (data) => {
      if (contactId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.contacts.overview(contactId) });
      }
      if (companyId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.companies.overview(companyId) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(`Created lead "${data.title}"`);
      onOpenChange(false);
      if (onSuccess) onSuccess(data);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to create lead');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Lead title is required');
      return;
    }
    if (!stageId) {
      toast.error('Pipeline stage is required');
      return;
    }

    createMutation.mutate({
      title: title.trim(),
      value: value ? Number(value) : 0,
      stageId,
      priority,
      expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
      sourceId: sourceId || null,
      contactId: contactId || null,
      companyId: companyId || null,
      ownerId: currentUser?.id || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            Create New Lead / Deal
          </DialogTitle>
          <DialogDescription className="text-xs">
            Start a new pipeline opportunity associated with this customer profile.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="leadTitle" className="text-xs font-medium">
              Deal Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="leadTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Enterprise Cloud Migration 2026"
              className="h-9 text-xs rounded-crm"
              required
            />
          </div>

          {/* Deal Value & Stage */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="leadValue" className="text-xs font-medium">
                Value ($ USD)
              </Label>
              <Input
                id="leadValue"
                type="number"
                min="0"
                step="100"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="25000"
                className="h-9 text-xs rounded-crm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Pipeline Stage <span className="text-destructive">*</span>
              </Label>
              <Select value={stageId} onValueChange={setStageId} disabled={isStagesLoading}>
                <SelectTrigger className="h-9 text-xs rounded-crm">
                  <SelectValue placeholder={isStagesLoading ? 'Loading...' : 'Select stage'} />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((st) => (
                    <SelectItem key={st.id} value={st.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: st.color || '#4F46E5' }}
                        />
                        <span>{st.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Expected Close Date & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="leadClose" className="text-xs font-medium">
                Target Close Date
              </Label>
              <Input
                id="leadClose"
                type="date"
                value={expectedCloseDate}
                onChange={(e) => setExpectedCloseDate(e.target.value)}
                className="h-9 text-xs rounded-crm"
              />
            </div>

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
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lead Source */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Lead Source</Label>
            <Select
              value={sourceId || '__none__'}
              onValueChange={(val) => setSourceId(val === '__none__' ? '' : val)}
            >
              <SelectTrigger className="h-9 text-xs rounded-crm">
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-muted-foreground italic text-xs">
                  (None / Direct)
                </SelectItem>
                {sources.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={createMutation.isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending}
              className="min-w-28"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Creating...
                </>
              ) : (
                'Create Deal'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateLeadDialog;
