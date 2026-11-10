import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Phone,
  Mail,
  Calendar,
  FileText,
  Clock,
  CheckCircle2,
  CalendarPlus,
  Loader2,
  Building2,
  User,
  Target,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
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
import { Checkbox } from '@/components/ui/checkbox';

const ACTIVITY_TABS = [
  { type: 'CALL', label: 'Call', icon: Phone, color: 'text-blue-500 bg-blue-500/10' },
  { type: 'EMAIL', label: 'Email', icon: Mail, color: 'text-purple-500 bg-purple-500/10' },
  { type: 'MEETING', label: 'Meeting', icon: Calendar, color: 'text-amber-500 bg-amber-500/10' },
  { type: 'NOTE', label: 'Note', icon: FileText, color: 'text-emerald-500 bg-emerald-500/10' },
];

const OUTCOME_SUGGESTIONS = {
  CALL: ['Connected', 'Left Voicemail', 'Busy / No Answer', 'Wrong Number', 'Gatekeeper Reached'],
  EMAIL: ['Sent', 'Received Reply', 'Meeting Invite Sent', 'Proposal Attached', 'Bounced'],
  MEETING: ['Completed', 'Rescheduled', 'No Show', 'Decision Maker Joined', 'Next Steps Agreed'],
  NOTE: ['Internal Review', 'Client Feedback', 'Strategy Update', 'Competitive Intel'],
};

export function LogActivityModal() {
  const queryClient = useQueryClient();
  const { logActivityOpen, logActivityDefaults, closeLogActivity } = useDialogStore();

  const [type, setType] = useState('CALL');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [outcome, setOutcome] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('15');
  const [occurredAt, setOccurredAt] = useState('');

  // Target entity linkage
  const [targetType, setTargetType] = useState('contact'); // 'contact' | 'company' | 'lead'
  const [selectedContactId, setSelectedContactId] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState('');

  // Dual follow-up creation
  const [scheduleFollowUp, setScheduleFollowUp] = useState(false);
  const [followUpTitle, setFollowUpTitle] = useState('');
  const [followUpDueAt, setFollowUpDueAt] = useState('');
  const [followUpPriority, setFollowUpPriority] = useState('MEDIUM');
  const [followUpRecurrence, setFollowUpRecurrence] = useState('NONE');

  // Search entity query
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch quick lists for entity selection
  const { data: contactsData } = useQuery({
    queryKey: queryKeys.contacts.list({ limit: 50 }),
    queryFn: async () => {
      const res = await api.get('/contacts?limit=50');
      return res.data?.data || [];
    },
    enabled: logActivityOpen,
  });

  const { data: companiesData } = useQuery({
    queryKey: queryKeys.companies.list({ limit: 50 }),
    queryFn: async () => {
      const res = await api.get('/companies?limit=50');
      return res.data?.data || [];
    },
    enabled: logActivityOpen,
  });

  const { data: leadsData } = useQuery({
    queryKey: queryKeys.leads.list({ limit: 50 }),
    queryFn: async () => {
      const res = await api.get('/leads?limit=50');
      return res.data?.data || [];
    },
    enabled: logActivityOpen,
  });

  // Reset and prefill state whenever dialog opens
  useEffect(() => {
    if (logActivityOpen) {
      const initialType = logActivityDefaults?.type || 'CALL';
      setType(initialType);

      const defaultSubjects = {
        CALL: 'Phone call logged',
        EMAIL: 'Email correspondence',
        MEETING: 'Meeting with customer',
        NOTE: 'Customer note',
      };
      setSubject(logActivityDefaults?.subject || defaultSubjects[initialType] || 'Activity logged');
      setBody(logActivityDefaults?.body || '');
      setOutcome(logActivityDefaults?.outcome || '');
      setDurationMinutes(
        logActivityDefaults?.durationMinutes
          ? String(logActivityDefaults.durationMinutes)
          : initialType === 'CALL'
            ? '15'
            : initialType === 'MEETING'
              ? '30'
              : ''
      );

      // Default occurredAt = current local ISO datetime-local
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setOccurredAt(now.toISOString().slice(0, 16));

      // Link defaults
      if (logActivityDefaults?.leadId) {
        setTargetType('lead');
        setSelectedLeadId(logActivityDefaults.leadId);
        setSelectedContactId('');
        setSelectedCompanyId('');
      } else if (logActivityDefaults?.companyId) {
        setTargetType('company');
        setSelectedCompanyId(logActivityDefaults.companyId);
        setSelectedContactId('');
        setSelectedLeadId('');
      } else if (logActivityDefaults?.contactId) {
        setTargetType('contact');
        setSelectedContactId(logActivityDefaults.contactId);
        setSelectedCompanyId('');
        setSelectedLeadId('');
      } else {
        setTargetType('contact');
        setSelectedContactId('');
        setSelectedCompanyId('');
        setSelectedLeadId('');
      }

      // Follow-up reset
      setScheduleFollowUp(false);
      setFollowUpTitle('');
      const defaultFollowUpDate = new Date();
      defaultFollowUpDate.setDate(defaultFollowUpDate.getDate() + 2);
      defaultFollowUpDate.setHours(10, 0, 0, 0);
      defaultFollowUpDate.setMinutes(defaultFollowUpDate.getMinutes() - defaultFollowUpDate.getTimezoneOffset());
      setFollowUpDueAt(defaultFollowUpDate.toISOString().slice(0, 16));
      setFollowUpPriority('MEDIUM');
      setFollowUpRecurrence('NONE');
      setSearchQuery('');
    }
  }, [logActivityOpen, logActivityDefaults]);

  // Sync follow-up title with activity subject
  useEffect(() => {
    if (scheduleFollowUp && !followUpTitle) {
      setFollowUpTitle(`Follow up on: ${subject || 'recent activity'}`);
    }
  }, [scheduleFollowUp, subject, followUpTitle]);

  const mutation = useMutation({
    mutationFn: async () => {
      // 1. Prepare activity payload
      const payload = {
        type,
        subject: subject.trim(),
        body: body.trim() || null,
        outcome: outcome.trim() || null,
        durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : null,
        occurredAt: occurredAt ? new Date(occurredAt).toISOString() : new Date().toISOString(),
        contactId: selectedContactId || null,
        companyId: selectedCompanyId || null,
        leadId: selectedLeadId || null,
      };

      if (!payload.contactId && !payload.companyId && !payload.leadId) {
        throw new Error('Please select a Contact, Company, or Lead to link this activity.');
      }

      const activityRes = await api.post('/activities', payload);
      const activityData = activityRes.data?.data;

      // 2. Schedule follow-up if checked
      if (scheduleFollowUp) {
        if (!followUpTitle.trim()) {
          throw new Error('Follow-up title is required when scheduling a follow-up.');
        }
        await api.post('/follow-ups', {
          title: followUpTitle.trim(),
          description: `Auto-scheduled from logged activity: ${subject}`,
          dueAt: followUpDueAt ? new Date(followUpDueAt).toISOString() : new Date().toISOString(),
          priority: followUpPriority,
          recurrence: followUpRecurrence,
          contactId: selectedContactId || null,
          leadId: selectedLeadId || null,
        });
      }

      return activityData;
    },
    onSuccess: () => {
      toast.success(
        scheduleFollowUp
          ? 'Activity logged and follow-up scheduled successfully!'
          : 'Activity logged successfully!'
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.followUps.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      closeLogActivity();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err.message || 'Failed to log activity');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!subject.trim()) {
      toast.error('Subject is required');
      return;
    }
    mutation.mutate();
  };

  const contacts = contactsData || [];
  const companies = companiesData || [];
  const leads = leadsData || [];

  const filteredContacts = contacts.filter((c) =>
    `${c.firstName} ${c.lastName} ${c.email || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredCompanies = companies.filter((c) =>
    `${c.name} ${c.domain || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredLeads = leads.filter((l) =>
    `${l.title} ${l.companyName || ''} ${l.contactName || ''}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={logActivityOpen} onOpenChange={(val) => !val && closeLogActivity()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-crm bg-primary/10 text-primary">
              <CalendarPlus className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">Log Customer Activity</DialogTitle>
              <DialogDescription className="text-xs">
                Record a phone call, email, meeting, or internal note with timeline linking.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Activity Type Tabs */}
        <div className="grid grid-cols-4 gap-2 pt-2">
          {ACTIVITY_TABS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = type === tab.type;
            return (
              <button
                key={tab.type}
                type="button"
                onClick={() => {
                  setType(tab.type);
                  const defaultSubjects = {
                    CALL: 'Phone call logged',
                    EMAIL: 'Email correspondence',
                    MEETING: 'Meeting notes',
                    NOTE: 'Customer note',
                  };
                  setSubject(defaultSubjects[tab.type] || 'Activity logged');
                  setDurationMinutes(
                    tab.type === 'CALL' ? '15' : tab.type === 'MEETING' ? '30' : ''
                  );
                }}
                className={cn(
                  'flex flex-col items-center justify-center py-2.5 px-2 rounded-crm border text-xs font-medium transition-all',
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary shadow-sm font-semibold'
                    : 'border-border bg-card hover:bg-muted/60 text-muted-foreground'
                )}
              >
                <Icon className={cn('h-4 w-4 mb-1.5', isSelected ? 'text-primary' : '')} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Linked Record Picker */}
          <div className="space-y-2 rounded-card border bg-muted/20 p-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">
                Linked Customer / Lead <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant={targetType === 'contact' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-6 text-[11px] px-2"
                  onClick={() => {
                    setTargetType('contact');
                    setSelectedCompanyId('');
                    setSelectedLeadId('');
                  }}
                >
                  <User className="h-3 w-3 mr-1" /> Contact
                </Button>
                <Button
                  type="button"
                  variant={targetType === 'company' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-6 text-[11px] px-2"
                  onClick={() => {
                    setTargetType('company');
                    setSelectedContactId('');
                    setSelectedLeadId('');
                  }}
                >
                  <Building2 className="h-3 w-3 mr-1" /> Company
                </Button>
                <Button
                  type="button"
                  variant={targetType === 'lead' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-6 text-[11px] px-2"
                  onClick={() => {
                    setTargetType('lead');
                    setSelectedContactId('');
                    setSelectedCompanyId('');
                  }}
                >
                  <Target className="h-3 w-3 mr-1" /> Lead
                </Button>
              </div>
            </div>

            {targetType === 'contact' && (
              <Select
                value={selectedContactId}
                onValueChange={setSelectedContactId}
              >
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="Select a contact..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {filteredContacts.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.firstName} {c.lastName} {c.email ? `(${c.email})` : ''}
                    </SelectItem>
                  ))}
                  {filteredContacts.length === 0 && (
                    <div className="p-2 text-center text-xs text-muted-foreground">
                      No contacts found
                    </div>
                  )}
                </SelectContent>
              </Select>
            )}

            {targetType === 'company' && (
              <Select
                value={selectedCompanyId}
                onValueChange={setSelectedCompanyId}
              >
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="Select a company..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {filteredCompanies.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name} {c.domain ? `(${c.domain})` : ''}
                    </SelectItem>
                  ))}
                  {filteredCompanies.length === 0 && (
                    <div className="p-2 text-center text-xs text-muted-foreground">
                      No companies found
                    </div>
                  )}
                </SelectContent>
              </Select>
            )}

            {targetType === 'lead' && (
              <Select
                value={selectedLeadId}
                onValueChange={setSelectedLeadId}
              >
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="Select a pipeline lead..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {filteredLeads.map((l) => (
                    <SelectItem key={l.id} value={l.id} className="text-xs">
                      {l.title} {l.companyName ? `• ${l.companyName}` : ''}
                    </SelectItem>
                  ))}
                  {filteredLeads.length === 0 && (
                    <div className="p-2 text-center text-xs text-muted-foreground">
                      No leads found
                    </div>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Subject Field */}
          <div className="space-y-1.5">
            <Label htmlFor="act-subject" className="text-xs font-semibold">
              Subject <span className="text-destructive">*</span>
            </Label>
            <Input
              id="act-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Discovery call regarding enterprise plan"
              className="h-9 text-xs"
              required
            />
          </div>

          {/* Body / Description */}
          <div className="space-y-1.5">
            <Label htmlFor="act-body" className="text-xs font-semibold">
              Notes & Discussion Details
            </Label>
            <Textarea
              id="act-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Key talking points, client questions, objections, agreed next steps..."
              rows={3}
              className="text-xs resize-none"
            />
          </div>

          {/* Outcome & Duration & OccurredAt Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Outcome */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Outcome / Status</Label>
              <Input
                list="outcome-suggestions"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder="e.g. Connected, Left message"
                className="h-9 text-xs"
              />
              <datalist id="outcome-suggestions">
                {(OUTCOME_SUGGESTIONS[type] || []).map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            {/* Duration */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Duration (Minutes)</Label>
              <div className="relative">
                <Clock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="number"
                  min="0"
                  step="5"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="15"
                  className="h-9 pl-8 text-xs"
                />
              </div>
            </div>

            {/* Date & Time */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Date & Time</Label>
              <Input
                type="datetime-local"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Schedule Follow-up Accordion Checkbox */}
          <div className="rounded-card border border-primary/20 bg-primary/5 p-3.5 space-y-3">
            <div className="flex items-center space-x-2.5">
              <Checkbox
                id="schedule-follow-up-check"
                checked={scheduleFollowUp}
                onCheckedChange={(checked) => setScheduleFollowUp(Boolean(checked))}
              />
              <Label
                htmlFor="schedule-follow-up-check"
                className="text-xs font-semibold text-foreground cursor-pointer flex items-center gap-1.5"
              >
                <CalendarPlus className="h-3.5 w-3.5 text-primary" />
                <span>Schedule a follow-up task at the same time</span>
              </Label>
            </div>

            {scheduleFollowUp && (
              <div className="pt-2 border-t border-primary/20 space-y-3 text-xs">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Follow-up Task Title</Label>
                  <Input
                    value={followUpTitle}
                    onChange={(e) => setFollowUpTitle(e.target.value)}
                    placeholder="e.g. Call back to review proposal"
                    className="h-8 text-xs bg-background"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Due Date & Time</Label>
                    <Input
                      type="datetime-local"
                      value={followUpDueAt}
                      onChange={(e) => setFollowUpDueAt(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Priority</Label>
                    <Select value={followUpPriority} onValueChange={setFollowUpPriority}>
                      <SelectTrigger className="h-8 text-xs bg-background">
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

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Recurrence</Label>
                    <Select value={followUpRecurrence} onValueChange={setFollowUpRecurrence}>
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">None (One-time)</SelectItem>
                        <SelectItem value="DAILY">Daily</SelectItem>
                        <SelectItem value="WEEKLY">Weekly</SelectItem>
                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={closeLogActivity}
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
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Save Activity
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
