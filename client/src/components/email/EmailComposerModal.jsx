import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mail,
  Send,
  AlertTriangle,
  Eye,
  PenLine,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';
import { renderTemplateVariables, TEMPLATE_VARIABLES } from '@/lib/templateUtils';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function EmailComposerModal({
  open,
  onOpenChange,
  contact = null,
  lead = null,
  defaultTo = '',
  onSuccess,
}) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();

  // Resolve recipient details
  const resolvedEmail =
    defaultTo || contact?.email || lead?.email || lead?.contact?.email || '';
  const firstName =
    contact?.firstName || lead?.firstName || lead?.contact?.firstName || '';
  const lastName =
    contact?.lastName || lead?.lastName || lead?.contact?.lastName || '';
  const companyName =
    contact?.company?.name || lead?.companyName || lead?.company?.name || '';
  const ownerName =
    currentUser?.name || contact?.owner?.name || lead?.owner?.name || '';
  const contactId = contact?.id || lead?.contactId || lead?.convertedContactId || null;
  const leadId = lead?.id || null;

  const isOptedOut = Boolean(
    contact?.emailOptOut || lead?.contact?.emailOptOut || lead?.convertedContact?.emailOptOut
  );

  const [to, setTo] = useState(resolvedEmail);
  const [selectedTemplateId, setSelectedTemplateId] = useState('CUSTOM');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [activeTab, setActiveTab] = useState('write'); // 'write' | 'preview'

  // Contextual variable mapping
  const contextVars = {
    firstName,
    companyName,
    ownerName,
  };

  // Sync when recipient changes
  useEffect(() => {
    if (open) {
      setTo(resolvedEmail);
      setSelectedTemplateId('CUSTOM');
      setSubject('');
      setBody('');
      setActiveTab('write');
    }
  }, [open, resolvedEmail]);

  // Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: queryKeys.emailTemplates.list(),
    queryFn: async () => {
      const res = await api.get('/email-templates');
      return res.data?.data || [];
    },
    enabled: open,
  });

  // Handle template selection
  const handleSelectTemplate = (templateId) => {
    setSelectedTemplateId(templateId);
    if (templateId === 'CUSTOM') {
      return;
    }
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      // Auto-render with recipient context
      const renderedSubject = renderTemplateVariables(template.subject, contextVars);
      const renderedBody = renderTemplateVariables(template.body, contextVars);
      setSubject(renderedSubject);
      setBody(renderedBody);
    }
  };

  // Send Email Mutation
  const sendMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/emails/send', payload);
      return res.data?.data;
    },
    onSuccess: (data) => {
      toast.success('Email sent successfully!');
      // Invalidate relevant queries
      if (contactId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.contacts.overview(contactId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.contacts.detail(contactId) });
        queryClient.invalidateQueries({
          queryKey: queryKeys.activities.timeline({ contactId }),
        });
      }
      if (leadId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(leadId) });
        queryClient.invalidateQueries({
          queryKey: queryKeys.activities.timeline({ leadId }),
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      if (onSuccess) onSuccess(data);
      onOpenChange(false);
    },
    onError: (err) => {
      const errorMsg =
        err?.response?.data?.error?.message || err.message || 'Failed to send email';
      toast.error(errorMsg);
    },
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!to.trim()) {
      return toast.error('Recipient email address is required');
    }
    if (!subject.trim()) {
      return toast.error('Subject line is required');
    }
    if (!body.trim()) {
      return toast.error('Message body is required');
    }

    // Render variables (e.g. {{firstName}}, {{companyName}}, {{ownerName}}) with current context
    const finalSubject = renderTemplateVariables(subject.trim(), contextVars);
    const finalBody = renderTemplateVariables(body.trim(), contextVars);

    sendMutation.mutate({
      to: to.trim(),
      subject: finalSubject,
      body: finalBody,
      contactId: contactId || undefined,
      leadId: leadId || undefined,
      templateId: selectedTemplateId !== 'CUSTOM' ? selectedTemplateId : undefined,
    });
  };

  const insertVariable = (targetField, varKey) => {
    if (targetField === 'subject') {
      setSubject((prev) => prev + (prev.endsWith(' ') || prev.length === 0 ? '' : ' ') + varKey);
    } else {
      setBody((prev) => prev + (prev.endsWith(' ') || prev.length === 0 ? '' : ' ') + varKey);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            <span>Send Email</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Send an email directly from SmartConnect CRM. Reply-To is set to your email.
          </DialogDescription>
        </DialogHeader>

        {/* Opt-out Warning Banner */}
        {isOptedOut && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 flex items-start gap-2.5 text-xs text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
            <div>
              <p className="font-semibold">Recipient has opted out of emails</p>
              <p className="text-[11px] opacity-90 mt-0.5">
                This contact unsubscribed from email communications. Outbound emails to this address are blocked.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSend} className="space-y-4 pt-1">
          {/* Recipient Field */}
          <div className="space-y-1">
            <Label htmlFor="email-to" className="text-xs font-medium">
              To
            </Label>
            <Input
              id="email-to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="h-9 text-xs"
              required
            />
            {(firstName || lastName || companyName) && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-0.5">
                <span>Sending to:</span>
                <span className="font-medium text-foreground">
                  {[firstName, lastName].filter(Boolean).join(' ')}
                </span>
                {companyName && (
                  <span className="text-muted-foreground">({companyName})</span>
                )}
              </p>
            )}
          </div>

          {/* Template Selector */}
          <div className="space-y-1">
            <Label htmlFor="template-picker" className="text-xs font-medium">
              Email Template
            </Label>
            <Select value={selectedTemplateId} onValueChange={handleSelectTemplate}>
              <SelectTrigger id="template-picker" className="h-9 text-xs bg-background">
                <SelectValue placeholder="Choose a template..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CUSTOM" className="text-xs">
                  <span className="font-medium">Blank (Custom Message)</span>
                </SelectItem>
                {templates.map((tpl) => (
                  <SelectItem key={tpl.id} value={tpl.id} className="text-xs">
                    <span className="font-medium">{tpl.name}</span>
                    <span className="ml-2 text-muted-foreground truncate">
                      — {tpl.subject}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tab Switcher: Write vs Preview */}
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant={activeTab === 'write' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('write')}
                className="h-7 text-xs gap-1.5"
              >
                <PenLine className="h-3 w-3" />
                <span>Write</span>
              </Button>
              <Button
                type="button"
                variant={activeTab === 'preview' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('preview')}
                className="h-7 text-xs gap-1.5"
              >
                <Eye className="h-3 w-3" />
                <span>Preview</span>
              </Button>
            </div>

            {/* Quick Variable Insert Toolbar */}
            {activeTab === 'write' && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground mr-1">Insert:</span>
                {TEMPLATE_VARIABLES.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insertVariable('body', v.key)}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded border bg-muted/40 hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    {v.key}
                  </button>
                ))}
              </div>
            )}
          </div>

          {activeTab === 'write' ? (
            <div className="space-y-3">
              {/* Subject */}
              <div className="space-y-1">
                <Label htmlFor="email-subject" className="text-xs font-medium">
                  Subject Line <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject line..."
                  className="h-9 text-xs"
                  required
                />
              </div>

              {/* Body */}
              <div className="space-y-1">
                <Label htmlFor="email-body" className="text-xs font-medium">
                  Message Body <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="email-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your email here..."
                  rows={8}
                  className="text-xs font-sans resize-y"
                  required
                />
              </div>
            </div>
          ) : (
            /* Live Styled Email Preview */
            <div className="rounded-lg border bg-slate-100 dark:bg-slate-900 p-3 sm:p-4 text-xs space-y-2">
              {/* Email Envelope Metadata */}
              <div className="rounded-t-lg bg-card border border-b-0 p-3 text-[11px] space-y-1">
                <div className="flex items-center text-muted-foreground">
                  <span className="w-16 font-semibold">To:</span>
                  <span className="text-foreground font-mono">{to || '(No recipient)'}</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <span className="w-16 font-semibold">Reply-To:</span>
                  <span className="text-foreground font-mono">{currentUser?.email}</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <span className="w-16 font-semibold">Subject:</span>
                  <span className="font-semibold text-foreground">
                    {renderTemplateVariables(subject, contextVars) || '(No subject)'}
                  </span>
                </div>
              </div>

              {/* Styled Email Card */}
              <div className="rounded-b-lg border bg-card shadow-sm overflow-hidden">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-4 text-white flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-sm">
                    &#9776;
                  </div>
                  <div>
                    <div className="font-bold text-sm tracking-tight leading-none text-white">SmartConnect</div>
                    <div className="text-[9px] font-mono text-indigo-200 tracking-wider mt-0.5">RELATIONSHIP CRM</div>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 text-sm space-y-3 bg-white dark:bg-card">
                  <div className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed min-h-[100px] text-xs">
                    {renderTemplateVariables(body, contextVars) || (
                      <span className="text-muted-foreground italic">No message content.</span>
                    )}
                  </div>

                  {/* Signature */}
                  <div className="pt-4 border-t flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                      {(currentUser?.name || 'SC').split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-foreground leading-tight">
                        {currentUser?.name || 'SmartConnect Representative'}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {currentUser?.email}
                      </div>
                      <div className="text-[10px] font-medium text-primary">
                        SmartConnect Sales Team
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 dark:bg-muted/30 border-t p-3 text-center text-[10px] text-muted-foreground">
                  <p>
                    Sent via <strong className="text-foreground">SmartConnect CRM</strong> &bull; <span className="underline cursor-pointer text-primary">Unsubscribe</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={sendMutation.isPending || isOptedOut}
              className="text-xs gap-1.5"
            >
              {sendMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Send Email</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default EmailComposerModal;
