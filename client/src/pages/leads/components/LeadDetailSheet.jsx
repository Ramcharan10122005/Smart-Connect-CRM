import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import {
  Briefcase,
  UserCheck,
  CheckCircle2,
  Trash2,
  Sparkles,
  Calendar,
  Send,
  Loader2,
  Check,
  ThumbsDown,
  Info,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { cn, formatCurrency, formatDate, initials } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { LostReasonDialog } from './LostReasonDialog';
import { EmailComposerModal } from '@/components/email/EmailComposerModal';

export function LeadDetailSheet({ open, onOpenChange, leadId, onDeleted }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Active section in detail: 'timeline' | 'followups'
  const [activeTab, setActiveTab] = useState('timeline');
  const [emailComposerOpen, setEmailComposerOpen] = useState(false);

  // Dialog triggers
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [convertConfirmOpen, setConvertConfirmOpen] = useState(false);
  const [lostDialogOpen, setLostDialogOpen] = useState(false);

  // Composer state
  const [noteBody, setNoteBody] = useState('');

  // Fetch full lead detail
  const { data: leadData, isLoading } = useQuery({
    queryKey: queryKeys.leads.detail(leadId),
    queryFn: async () => {
      const res = await api.get(`/leads/${leadId}`);
      return res.data?.data;
    },
    enabled: Boolean(open && leadId),
  });

  const lead = leadData;

  // Fetch all stages for the top stepper
  const { data: stagesData } = useQuery({
    queryKey: queryKeys.pipelineStages.all,
    queryFn: async () => {
      const res = await api.get('/pipeline-stages');
      return res.data?.data || [];
    },
  });
  const stages = stagesData || [];

  // Stage change mutation
  const moveStageMutation = useMutation({
    mutationFn: async ({ stageId, lostReason }) => {
      const res = await api.patch(`/leads/${leadId}/stage`, {
        stageId,
        lostReason: lostReason || undefined,
      });
      return res.data?.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      const targetStage = stages.find((s) => s.id === variables.stageId);

      if (targetStage?.type === 'WON') {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#4F46E5', '#10B981', '#F59E0B', '#3B82F6'],
        });
        toast.success(`🎉 Opportunity marked as WON!`);
      } else if (targetStage?.type === 'LOST') {
        toast.info('Lead marked as Lost');
      } else {
        toast.success(`Stage moved to ${targetStage?.name || 'next stage'}`);
      }
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to move stage');
    },
  });

  // Convert lead to customer mutation
  const convertMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/leads/${leadId}/convert`, {});
      return res.data?.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Opportunity converted to Customer Contact!');
      onOpenChange(false);
      setConvertConfirmOpen(false);
      if (data?.contact?.id) {
        navigate(`/customers/contact/${data.contact.id}`);
      }
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to convert lead');
    },
  });

  // Delete lead mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/leads/${leadId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Opportunity deleted');
      onOpenChange(false);
      if (onDeleted) onDeleted(leadId);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to delete lead');
    },
  });

  // Inline Note Composer mutation
  const addNoteMutation = useMutation({
    mutationFn: async (body) => {
      const res = await api.post('/activities', {
        type: 'NOTE',
        subject: 'Deal Note',
        body,
        leadId,
        contactId: lead?.contactId || null,
        companyId: lead?.companyId || null,
        occurredAt: new Date(),
      });
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(leadId) });
      setNoteBody('');
      toast.success('Note added to deal timeline');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to add note');
    },
  });

  // Complete follow-up task on lead
  const completeTaskMutation = useMutation({
    mutationFn: async (taskId) => {
      await api.patch(`/follow-ups/${taskId}/complete`, { logActivity: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(leadId) });
      toast.success('Task marked done');
    },
  });

  const handleStageClick = (targetStage) => {
    if (targetStage.id === lead?.stageId) return;
    if (targetStage.type === 'LOST') {
      setLostDialogOpen(true);
      return;
    }
    moveStageMutation.mutate({ stageId: targetStage.id });
  };

  const handleMarkWon = () => {
    const wonStage = stages.find((s) => s.type === 'WON');
    if (wonStage) {
      moveStageMutation.mutate({ stageId: wonStage.id });
    }
  };

  const handleConfirmLost = (reason) => {
    const lostStage = stages.find((s) => s.type === 'LOST');
    if (lostStage) {
      moveStageMutation.mutate({ stageId: lostStage.id, lostReason: reason });
    }
    setLostDialogOpen(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto p-0 flex flex-col">
          {isLoading || !lead ? (
            <div className="p-8 text-center space-y-4 my-auto">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-xs text-muted-foreground">Loading opportunity details...</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="p-6 border-b bg-card sticky top-0 z-20 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Opportunity Record
                      </span>
                    </div>
                    <SheetTitle className="text-xl font-bold tracking-tight text-foreground">
                      {lead.title}
                    </SheetTitle>
                    <SheetDescription className="text-xs flex items-center gap-2">
                      <span className="text-lg font-bold text-foreground">
                        {formatCurrency(lead.value || 0, lead.currency)}
                      </span>
                      {lead.contact && (
                        <span>
                          • Linked to{' '}
                          <Link
                            to={`/customers/contact/${lead.contact.id}`}
                            className="text-primary hover:underline font-medium"
                          >
                            {lead.contact.firstName} {lead.contact.lastName}
                          </Link>
                        </span>
                      )}
                      {lead.company && (
                        <span>
                          •{' '}
                          <Link
                            to={`/customers/company/${lead.company.id}`}
                            className="text-primary hover:underline font-medium"
                          >
                            {lead.company.name}
                          </Link>
                        </span>
                      )}
                    </SheetDescription>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Send Email */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEmailComposerOpen(true)}
                      className="h-8 gap-1.5 text-xs rounded-crm font-medium"
                    >
                      <Mail className="h-3.5 w-3.5 text-purple-600" />
                      <span>Send Email</span>
                    </Button>

                    {/* Convert to Customer */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setConvertConfirmOpen(true)}
                      className="h-8 gap-1.5 text-xs rounded-crm font-medium"
                    >
                      <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Convert to Customer</span>
                    </Button>

                    {/* Mark Won */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleMarkWon}
                      disabled={lead.stage?.type === 'WON'}
                      className="h-8 gap-1.5 text-xs rounded-crm font-medium"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Won</span>
                    </Button>

                    {/* Mark Lost */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setLostDialogOpen(true)}
                      disabled={lead.stage?.type === 'LOST'}
                      className="h-8 gap-1.5 text-xs rounded-crm font-medium"
                    >
                      <ThumbsDown className="h-3.5 w-3.5 text-rose-600" />
                      <span>Lost</span>
                    </Button>

                    {/* Delete */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirmOpen(true)}
                      className="h-8 w-8 rounded-crm text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="Delete Deal"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* 1. Stage Stepper Bar (One-click stage progression) */}
                <div className="pt-2">
                  <div className="flex items-center gap-1 w-full overflow-x-auto pb-1">
                    {stages.map((st, idx) => {
                      const isActive = lead.stageId === st.id;
                      const isPast =
                        stages.findIndex((s) => s.id === lead.stageId) > idx;

                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => handleStageClick(st)}
                          disabled={moveStageMutation.isPending}
                          className={cn(
                            'flex-1 min-w-[100px] py-1.5 px-2 rounded-crm text-center border text-[11px] font-semibold transition-all cursor-pointer relative',
                            isActive
                              ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                              : isPast
                              ? 'bg-muted/70 text-foreground border-border hover:bg-muted'
                              : 'bg-background text-muted-foreground border-border/60 hover:border-primary/40'
                          )}
                        >
                          <div className="truncate flex items-center justify-center gap-1">
                            {isPast && <Check className="h-3 w-3 shrink-0" />}
                            <span className="truncate">{st.name}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 flex-1">
                {/* Score & Key Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-card border bg-muted/20">
                  {/* Score Explanation */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-primary" />
                      Lead Quality Score
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-foreground">{lead.score ?? 50}/100</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs p-3 space-y-1.5">
                            <p className="font-semibold text-primary">Score Factor Breakdown:</p>
                            <ul className="text-[11px] space-y-1 text-muted-foreground">
                              <li>• Contact Completeness (email, phone): up to +20 pts</li>
                              <li>• Opportunity Size ($ value): up to +25 pts</li>
                              <li>• Channel Acquisition Quality: up to +15 pts</li>
                              <li>• 14-Day Activity Velocity: up to +20 pts</li>
                              <li>• Stage Probability Factor: up to +20 pts</li>
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>

                  {/* Priority & Target Close */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                      Target Close Date
                    </span>
                    <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{lead.expectedCloseDate ? formatDate(lead.expectedCloseDate, { formatStr: 'MMM d, yyyy' }) : 'Not set'}</span>
                    </div>
                  </div>

                  {/* Deal Owner */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                      Account Owner
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={lead.owner?.avatarUrl} alt={lead.owner?.name} />
                        <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                          {initials(lead.owner?.name || 'SC')}
                        </AvatarFallback>
                      </Avatar>
                      <span>{lead.owner?.name || 'Unassigned'}</span>
                    </div>
                  </div>
                </div>

                {/* Lost Reason Alert if lost */}
                {lead.status === 'LOST' && lead.lostReason && (
                  <div className="rounded-card border border-rose-300 bg-rose-50 dark:bg-rose-950/30 p-3.5 text-rose-900 dark:text-rose-200 text-xs space-y-1">
                    <p className="font-semibold text-[11px] uppercase tracking-wider text-rose-800 dark:text-rose-300">
                      Closed Lost Reason
                    </p>
                    <p>{lead.lostReason}</p>
                  </div>
                )}

                {/* Tab Switcher: Timeline vs Follow-ups */}
                <div className="flex items-center gap-2 border-b pb-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('timeline')}
                    className={cn(
                      'text-xs font-semibold pb-1 border-b-2 transition-colors cursor-pointer',
                      activeTab === 'timeline'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Interaction History ({lead.activities?.length || 0})
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('followups')}
                    className={cn(
                      'text-xs font-semibold pb-1 border-b-2 transition-colors cursor-pointer',
                      activeTab === 'followups'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Follow-up Tasks ({lead.followUps?.length || 0})
                  </button>
                </div>

                {/* Timeline Content */}
                {activeTab === 'timeline' && (
                  <div className="space-y-4">
                    {/* Inline Deal Composer */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (noteBody.trim()) addNoteMutation.mutate(noteBody.trim());
                      }}
                      className="space-y-2 border rounded-card p-3 bg-muted/10"
                    >
                      <Textarea
                        placeholder="Log update, call notes, or next steps for this deal..."
                        rows={2}
                        value={noteBody}
                        onChange={(e) => setNoteBody(e.target.value)}
                        className="text-xs resize-none rounded-crm"
                      />
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          size="sm"
                          disabled={addNoteMutation.isPending || !noteBody.trim()}
                          className="h-7 text-xs gap-1 rounded-crm"
                        >
                          <Send className="h-3 w-3" />
                          <span>Post Note</span>
                        </Button>
                      </div>
                    </form>

                    {/* Timeline list */}
                    <div className="space-y-2.5">
                      {lead.activities?.map((act) => (
                        <div
                          key={act.id}
                          className="p-3 border rounded-card bg-card text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span className="font-semibold text-foreground">{act.subject}</span>
                            <span className="text-[10px]">
                              {formatDate(act.occurredAt || act.createdAt, { relative: true })}
                            </span>
                          </div>
                          {act.body && <p className="text-muted-foreground">{act.body}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Follow-ups Content */}
                {activeTab === 'followups' && (
                  <div className="space-y-2.5">
                    {lead.followUps?.length === 0 ? (
                      <p className="text-xs text-muted-foreground/60 italic py-4 text-center">
                        No tasks assigned to this deal.
                      </p>
                    ) : (
                      lead.followUps?.map((task) => (
                        <div
                          key={task.id}
                          className="p-3 border rounded-card bg-card text-xs flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5 flex-1 truncate">
                            <input
                              type="checkbox"
                              checked={task.status === 'DONE'}
                              onChange={() => completeTaskMutation.mutate(task.id)}
                              className="rounded border-border cursor-pointer"
                            />
                            <span
                              className={cn(
                                'font-medium truncate',
                                task.status === 'DONE' && 'line-through text-muted-foreground'
                              )}
                            >
                              {task.title}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            Due {formatDate(task.dueAt, { relative: true })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Convert Confirm Dialog */}
      <ConfirmDialog
        open={convertConfirmOpen}
        onOpenChange={setConvertConfirmOpen}
        title="Convert Lead to Customer?"
        description="This will create a new Customer profile (and company account if specified), archive the lead as WON, and redirect you to the new Customer 360 overview."
        confirmText="Convert Lead"
        variant="default"
        loading={convertMutation.isPending}
        onConfirm={async () => {
          await convertMutation.mutateAsync();
        }}
      />

      {/* Lost Reason Dialog */}
      <LostReasonDialog
        open={lostDialogOpen}
        onOpenChange={setLostDialogOpen}
        leadTitle={lead?.title || ''}
        loading={moveStageMutation.isPending}
        onConfirm={handleConfirmLost}
      />

      {/* Delete Deal Confirm */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={`Delete opportunity "${lead?.title}"?`}
        description="This will soft-delete this deal from the pipeline."
        confirmText="Delete Deal"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={async () => {
          await deleteMutation.mutateAsync();
        }}
      />

      {/* Email Composer Modal */}
      {lead && (
        <EmailComposerModal
          open={emailComposerOpen}
          onOpenChange={setEmailComposerOpen}
          lead={lead}
          contact={lead.contact || lead.convertedContact}
        />
      )}
    </>
  );
}

export default LeadDetailSheet;
