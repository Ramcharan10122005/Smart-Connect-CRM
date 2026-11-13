import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Zap,
  Plus,
  Play,
  Edit2,
  Trash2,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const TRIGGER_LABELS = {
  LEAD_CREATED: 'New Lead Created',
  LEAD_STAGE_CHANGED: 'Lead Stage Changed',
  LEAD_STALE_IN_STAGE: 'Lead Stale in Stage',
  FOLLOWUP_OVERDUE: 'Follow-up Overdue',
  CONTACT_CREATED: 'New Contact Created',
};

const ACTION_LABELS = {
  CREATE_FOLLOWUP: 'Create Follow-up',
  SEND_EMAIL_TEMPLATE: 'Send Email Template',
  ASSIGN_OWNER: 'Assign Owner (Round-Robin)',
  ADD_TAG: 'Add Tag',
  NOTIFY_USER: 'Send In-App Notification',
};

export function AutomationsSettings() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('rules'); // 'rules' | 'history'

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Builder Form State
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('LEAD_CREATED');
  const [action, setAction] = useState('CREATE_FOLLOWUP');
  const [isActive, setIsActive] = useState(true);

  // Condition Inputs
  const [conditionStageId, setConditionStageId] = useState('');
  const [conditionDays, setConditionDays] = useState(7);

  // Action Config Inputs
  const [followUpTitle, setFollowUpTitle] = useState('Automated Follow-up');
  const [followUpDueDays, setFollowUpDueDays] = useState(1);
  const [followUpPriority, setFollowUpPriority] = useState('MEDIUM');
  const [templateId, setTemplateId] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [tagId, setTagId] = useState('');
  const [notifyTitle, setNotifyTitle] = useState('Action required on {{name}}');
  const [notifyBody, setNotifyBody] = useState('Please review this record.');
  const [notifyRecipient, setNotifyRecipient] = useState('OWNER');

  // 1. Fetch Rules
  const { data: rules = [], isLoading: rulesLoading } = useQuery({
    queryKey: queryKeys.automations.rules(),
    queryFn: async () => {
      const res = await api.get('/automations/rules');
      return res.data?.data || [];
    },
  });

  // 2. Fetch Logs
  const { data: logsData, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: queryKeys.automations.logs({ limit: 50 }),
    queryFn: async () => {
      const res = await api.get('/automations/logs?limit=50');
      return res.data?.data || [];
    },
    enabled: activeTab === 'history',
  });

  // 3. Fetch Pipelines, Templates, Users, Tags for builder pickers
  const { data: stages = [] } = useQuery({
    queryKey: queryKeys.pipelineStages.all,
    queryFn: () => api.get('/pipeline-stages').then((r) => r.data?.data || []),
  });

  const { data: templates = [] } = useQuery({
    queryKey: queryKeys.emailTemplates.list(),
    queryFn: () => api.get('/email-templates').then((r) => r.data?.data || []),
  });

  const { data: users = [] } = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: () => api.get('/users?limit=100').then((r) => r.data?.data || []),
  });

  const { data: tags = [] } = useQuery({
    queryKey: queryKeys.tags.all,
    queryFn: () => api.get('/tags').then((r) => r.data?.data || []),
  });

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, nextActive }) => {
      return api.patch(`/automations/rules/${id}`, { isActive: nextActive });
    },
    onSuccess: (_, { nextActive }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.automations.rules() });
      toast.success(nextActive ? 'Rule activated' : 'Rule deactivated');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to toggle rule');
    },
  });

  // Save rule mutation
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingRule) {
        return api.patch(`/automations/rules/${editingRule.id}`, payload);
      }
      return api.post('/automations/rules', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.automations.rules() });
      toast.success(editingRule ? 'Rule updated successfully' : 'Rule created successfully');
      setModalOpen(false);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to save rule');
    },
  });

  // Delete rule mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return api.delete(`/automations/rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.automations.rules() });
      toast.success('Rule deleted successfully');
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to delete rule');
    },
  });

  // Run scheduled checks now
  const runScheduledMutation = useMutation({
    mutationFn: async () => {
      return api.post('/automations/run-scheduled');
    },
    onSuccess: (res) => {
      toast.success(`Ran scheduled automations (${res.data?.data?.processed || 0} evaluated)`);
      queryClient.invalidateQueries({ queryKey: queryKeys.automations.all });
      refetchLogs();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error?.message || 'Run failed');
    },
  });

  const handleOpenCreate = () => {
    setEditingRule(null);
    setName('');
    setTrigger('LEAD_CREATED');
    setAction('CREATE_FOLLOWUP');
    setIsActive(true);
    setConditionStageId('');
    setConditionDays(7);
    setFollowUpTitle('Automated Follow-up');
    setFollowUpDueDays(1);
    setFollowUpPriority('MEDIUM');
    setTemplateId(templates[0]?.id || '');
    setSelectedUserIds(users.map((u) => u.id));
    setTagId(tags[0]?.id || '');
    setNotifyTitle('Action required on {{name}}');
    setNotifyBody('Please review this record.');
    setNotifyRecipient('OWNER');
    setModalOpen(true);
  };

  const handleOpenEdit = (rule) => {
    setEditingRule(rule);
    setName(rule.name);
    setTrigger(rule.trigger);
    setAction(rule.action);
    setIsActive(rule.isActive);

    const c = rule.conditions || {};
    setConditionStageId(c.stageId || '');
    setConditionDays(c.days || 7);

    const cfg = rule.actionConfig || {};
    setFollowUpTitle(cfg.title || 'Automated Follow-up');
    setFollowUpDueDays(cfg.dueInDays || 1);
    setFollowUpPriority(cfg.priority || 'MEDIUM');
    setTemplateId(cfg.templateId || '');
    setSelectedUserIds(cfg.userIds || []);
    setTagId(cfg.tagId || '');
    setNotifyTitle(cfg.title || 'Action required on {{name}}');
    setNotifyBody(cfg.body || 'Please review this record.');
    setNotifyRecipient(cfg.recipient || 'OWNER');
    setModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Rule name is required');

    // Build conditions object
    const conditions = {};
    if (trigger === 'LEAD_STAGE_CHANGED' || trigger === 'LEAD_STALE_IN_STAGE') {
      if (conditionStageId) conditions.stageId = conditionStageId;
      if (trigger === 'LEAD_STALE_IN_STAGE') conditions.days = Number(conditionDays || 7);
    } else if (trigger === 'FOLLOWUP_OVERDUE') {
      conditions.days = Number(conditionDays || 1);
    }

    // Build actionConfig object
    let actionConfig = {};
    if (action === 'CREATE_FOLLOWUP') {
      actionConfig = {
        title: followUpTitle.trim(),
        dueInDays: Number(followUpDueDays || 1),
        priority: followUpPriority,
      };
    } else if (action === 'SEND_EMAIL_TEMPLATE') {
      if (!templateId) return toast.error('Please select an email template');
      actionConfig = { templateId };
    } else if (action === 'ASSIGN_OWNER') {
      if (selectedUserIds.length === 0) return toast.error('Please select at least one rep');
      actionConfig = { userIds: selectedUserIds };
    } else if (action === 'ADD_TAG') {
      if (!tagId) return toast.error('Please select a tag');
      actionConfig = { tagId };
    } else if (action === 'NOTIFY_USER') {
      actionConfig = {
        title: notifyTitle.trim(),
        body: notifyBody.trim(),
        recipient: notifyRecipient,
      };
    }

    saveMutation.mutate({
      name: name.trim(),
      trigger,
      conditions,
      action,
      actionConfig,
      isActive,
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <span>Automation Engine</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Automate task creation, template emails, rep assignment, and notifications with event-driven rules.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => runScheduledMutation.mutate()}
              disabled={runScheduledMutation.isPending}
              className="h-8 gap-1.5 text-xs"
              title="Manually evaluate hourly stale & overdue rules right now"
            >
              {runScheduledMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5 text-emerald-600" />
              )}
              <span>Run Checks Now</span>
            </Button>
            <Button size="sm" onClick={handleOpenCreate} className="h-8 gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              <span>New Rule</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="h-8 bg-muted/60 p-0.5">
              <TabsTrigger value="rules" className="text-xs h-7 px-3">
                Automation Rules ({rules.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs h-7 px-3">
                Execution History
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: RULES LIST */}
            <TabsContent value="rules" className="pt-2">
              {rulesLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : rules.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <Zap className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm font-medium text-foreground">No automation rules configured</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    Create rules to automatically create follow-up tasks, assign leads to reps, or send emails when key events occur.
                  </p>
                  <Button size="sm" onClick={handleOpenCreate} className="mt-4 h-8 text-xs">
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Create First Rule
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 text-xs">
                        <TableHead className="w-16">Active</TableHead>
                        <TableHead>Rule Name</TableHead>
                        <TableHead>When Triggered</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Executions</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rules.map((rule) => (
                        <TableRow key={rule.id} className="text-xs">
                          <TableCell>
                            <Switch
                              checked={rule.isActive}
                              onCheckedChange={(checked) =>
                                toggleMutation.mutate({ id: rule.id, nextActive: checked })
                              }
                              disabled={toggleMutation.isPending}
                            />
                          </TableCell>
                          <TableCell className="font-semibold text-foreground">
                            <div>
                              <span>{rule.name}</span>
                              <p className="text-[10px] text-muted-foreground font-normal mt-0.5">
                                Created {formatDate(rule.createdAt)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge variant="outline" className="font-mono text-[10px]">
                                {TRIGGER_LABELS[rule.trigger] || rule.trigger}
                              </Badge>
                              {rule.conditions && Object.keys(rule.conditions).length > 0 && (
                                <p className="text-[10px] text-muted-foreground">
                                  {rule.conditions.days && `After ${rule.conditions.days}d idle`}
                                  {rule.conditions.stageId &&
                                    ` • in ${stages.find((s) => s.id === rule.conditions.stageId)?.name || 'Stage'}`}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium text-foreground">
                                {ACTION_LABELS[rule.action] || rule.action}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-muted-foreground">
                            {rule._count?.logs || 0} runs
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenEdit(rule)}
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                title="Edit Rule"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteTarget(rule)}
                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                title="Delete Rule"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* TAB 2: EXECUTION HISTORY */}
            <TabsContent value="history" className="pt-2">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs text-muted-foreground">
                  Showing recent automated executions (idempotent, rate limited to 100/hr)
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchLogs()}
                  className="h-7 text-xs gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Refresh</span>
                </Button>
              </div>

              {logsLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !logsData || logsData.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
                  No execution logs recorded yet. Once active rules trigger, history will appear here.
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 text-xs">
                        <TableHead>Time</TableHead>
                        <TableHead>Rule</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Result / Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logsData.map((log) => (
                        <TableRow key={log.id} className="text-xs">
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {formatDate(log.executedAt)}
                          </TableCell>
                          <TableCell className="font-medium text-foreground">
                            {log.rule?.name || 'Deleted Rule'}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">
                              {log.entityType} ({log.entityId.slice(0, 8)}...)
                            </span>
                          </TableCell>
                          <TableCell>
                            {log.status === 'SUCCESS' && (
                              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 text-[10px]">
                                SUCCESS
                              </Badge>
                            )}
                            {log.status === 'FAILED' && (
                              <Badge variant="destructive" className="text-[10px]">
                                FAILED
                              </Badge>
                            )}
                            {log.status === 'SKIPPED' && (
                              <Badge variant="secondary" className="text-[10px]">
                                SKIPPED
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-muted-foreground">
                            {log.error ? (
                              <span className="text-destructive font-medium">{log.error}</span>
                            ) : log.result ? (
                              JSON.stringify(log.result)
                            ) : (
                              'Completed'
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* RULE BUILDER MODAL */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <span>{editingRule ? 'Edit Automation Rule' : 'Create Automation Rule'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure an event trigger, matching conditions, and the automatic action to take.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Rule Name */}
            <div className="space-y-1">
              <Label htmlFor="rule-name" className="text-xs font-medium">
                Rule Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="rule-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. New lead -> Create follow-up in 1 day"
                className="h-9 text-xs"
                required
              />
            </div>

            {/* Trigger Selection */}
            <div className="space-y-1">
              <Label htmlFor="rule-trigger" className="text-xs font-medium">
                When this happens (Trigger)
              </Label>
              <Select value={trigger} onValueChange={setTrigger}>
                <SelectTrigger id="rule-trigger" className="h-9 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LEAD_CREATED">New Lead Created</SelectItem>
                  <SelectItem value="LEAD_STAGE_CHANGED">Lead Stage Changed</SelectItem>
                  <SelectItem value="LEAD_STALE_IN_STAGE">Lead Stale in Stage (Hourly Check)</SelectItem>
                  <SelectItem value="FOLLOWUP_OVERDUE">Follow-up Overdue (Hourly Check)</SelectItem>
                  <SelectItem value="CONTACT_CREATED">New Contact Created</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Contextual Conditions */}
            {(trigger === 'LEAD_STAGE_CHANGED' || trigger === 'LEAD_STALE_IN_STAGE') && (
              <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Trigger Conditions
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Pipeline Stage</Label>
                    <Select value={conditionStageId} onValueChange={setConditionStageId}>
                      <SelectTrigger className="h-9 text-xs bg-background">
                        <SelectValue placeholder="Any Stage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ANY">Any Stage</SelectItem>
                        {stages.map((st) => (
                          <SelectItem key={st.id} value={st.id}>
                            {st.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {trigger === 'LEAD_STALE_IN_STAGE' && (
                    <div className="space-y-1">
                      <Label className="text-xs">Idle / Stale Days</Label>
                      <Input
                        type="number"
                        min="1"
                        max="365"
                        value={conditionDays}
                        onChange={(e) => setConditionDays(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {trigger === 'FOLLOWUP_OVERDUE' && (
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                <Label className="text-xs font-medium">Overdue by (Days)</Label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={conditionDays}
                  onChange={(e) => setConditionDays(e.target.value)}
                  className="h-9 text-xs max-w-xs"
                />
              </div>
            )}

            {/* Action Selection */}
            <div className="space-y-1">
              <Label htmlFor="rule-action" className="text-xs font-medium">
                Then do this (Action)
              </Label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger id="rule-action" className="h-9 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CREATE_FOLLOWUP">Create Follow-up Task</SelectItem>
                  <SelectItem value="SEND_EMAIL_TEMPLATE">Send Email Template</SelectItem>
                  <SelectItem value="ASSIGN_OWNER">Assign Owner (Round-Robin Reps)</SelectItem>
                  <SelectItem value="ADD_TAG">Add Tag to Record</SelectItem>
                  <SelectItem value="NOTIFY_USER">Send In-App Notification</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Contextual Action Config */}
            <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Action Settings
              </span>

              {action === 'CREATE_FOLLOWUP' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Follow-up Title</Label>
                    <Input
                      value={followUpTitle}
                      onChange={(e) => setFollowUpTitle(e.target.value)}
                      placeholder="e.g. Call new prospect"
                      className="h-9 text-xs"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Due in (Days)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="90"
                        value={followUpDueDays}
                        onChange={(e) => setFollowUpDueDays(e.target.value)}
                        className="h-9 text-xs"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Priority</Label>
                      <Select value={followUpPriority} onValueChange={setFollowUpPriority}>
                        <SelectTrigger className="h-9 text-xs bg-background">
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
                </div>
              )}

              {action === 'SEND_EMAIL_TEMPLATE' && (
                <div className="space-y-2">
                  <Label className="text-xs">Email Template</Label>
                  <Select value={templateId} onValueChange={setTemplateId}>
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue placeholder="Choose a template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((tpl) => (
                        <SelectItem key={tpl.id} value={tpl.id}>
                          {tpl.name} — {tpl.subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {action === 'ASSIGN_OWNER' && (
                <div className="space-y-2">
                  <Label className="text-xs">Assignee Pool (Round-Robin)</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Leads will be assigned in turn among the selected team members.
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1 max-h-36 overflow-y-auto">
                    {users.map((u) => {
                      const isSelected = selectedUserIds.includes(u.id);
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedUserIds(selectedUserIds.filter((id) => id !== u.id));
                            } else {
                              setSelectedUserIds([...selectedUserIds, u.id]);
                            }
                          }}
                          className={`flex items-center justify-between p-2 rounded border text-xs text-left transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary/10 text-primary font-medium'
                              : 'bg-background hover:bg-muted text-muted-foreground'
                          }`}
                        >
                          <span className="truncate">{u.name}</span>
                          {isSelected && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {action === 'ADD_TAG' && (
                <div className="space-y-2">
                  <Label className="text-xs">Select Tag to Attach</Label>
                  <Select value={tagId} onValueChange={setTagId}>
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue placeholder="Choose a tag..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tags.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {action === 'NOTIFY_USER' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Recipient</Label>
                    <Select value={notifyRecipient} onValueChange={setNotifyRecipient}>
                      <SelectTrigger className="h-9 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OWNER">Record Owner (Assigned Rep)</SelectItem>
                        <SelectItem value="ADMINS">All Administrators</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Notification Title</Label>
                    <Input
                      value={notifyTitle}
                      onChange={(e) => setNotifyTitle(e.target.value)}
                      className="h-9 text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Notification Body</Label>
                    <Textarea
                      value={notifyBody}
                      onChange={(e) => setNotifyBody(e.target.value)}
                      rows={2}
                      className="text-xs"
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Enable switch */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <Label htmlFor="active-toggle" className="text-xs font-medium block">
                  Activate Rule Immediately
                </Label>
                <span className="text-[10px] text-muted-foreground">
                  When enabled, this rule will trigger as new records are processed.
                </span>
              </div>
              <Switch
                id="active-toggle"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saveMutation.isPending}
                className="text-xs gap-1.5"
              >
                {saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{editingRule ? 'Update Rule' : 'Save Rule'}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Automation Rule"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? Its execution history will also be removed.`}
        confirmText="Delete Rule"
        confirmVariant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
}

export default AutomationsSettings;
