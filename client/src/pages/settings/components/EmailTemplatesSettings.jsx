import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mail,
  Plus,
  Edit2,
  Trash2,
  Eye,
  FileText,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';
import { formatDate } from '@/lib/utils';
import { renderTemplateVariables, TEMPLATE_VARIABLES } from '@/lib/templateUtils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export function EmailTemplatesSettings() {
  const queryClient = useQueryClient();
  const { role: currentRole, user: currentUser } = useAuthStore();
  const canManage = currentRole === 'ADMIN' || currentRole === 'MANAGER';

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [copiedVar, setCopiedVar] = useState(null);

  // Mock data for live preview
  const mockVars = {
    firstName: 'Jane',
    companyName: 'Acme Corporation',
    ownerName: currentUser?.name || 'Alex Rivera',
  };

  // 1. Fetch Templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: queryKeys.emailTemplates.list(),
    queryFn: async () => {
      const res = await api.get('/email-templates');
      return res.data?.data || [];
    },
  });

  // 2. Open Create/Edit
  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setName('');
    setSubject('');
    setBody('');
    setModalOpen(true);
  };

  const handleOpenEdit = (template) => {
    setEditingTemplate(template);
    setName(template.name);
    setSubject(template.subject);
    setBody(template.body);
    setModalOpen(true);
  };

  // 3. Save Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingTemplate) {
        return api.patch(`/email-templates/${editingTemplate.id}`, payload);
      }
      return api.post('/email-templates', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.emailTemplates.all });
      toast.success(
        editingTemplate ? 'Template updated successfully' : 'Template created successfully'
      );
      setModalOpen(false);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error?.message || err.message || 'Failed to save template');
    },
  });

  // 4. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return api.delete(`/email-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.emailTemplates.all });
      toast.success('Template deleted successfully');
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to delete template');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Template name is required');
    if (!subject.trim()) return toast.error('Subject is required');
    if (!body.trim()) return toast.error('Body is required');

    saveMutation.mutate({
      name: name.trim(),
      subject: subject.trim(),
      body: body.trim(),
    });
  };

  const insertVariable = (targetField, varKey) => {
    if (targetField === 'subject') {
      setSubject((prev) => prev + (prev.endsWith(' ') || prev.length === 0 ? '' : ' ') + varKey);
    } else {
      setBody((prev) => prev + (prev.endsWith(' ') || prev.length === 0 ? '' : ' ') + varKey);
    }
    setCopiedVar(varKey);
    setTimeout(() => setCopiedVar(null), 1500);
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <span>Email Templates</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Manage pre-written sales emails with dynamic personalization variables.
            </CardDescription>
          </div>
          {canManage && (
            <Button size="sm" onClick={handleOpenCreate} className="h-8 gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              <span>New Template</span>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Mail className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium text-foreground">No email templates created yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Create templates with variables like &#123;&#123;firstName&#125;&#125; and &#123;&#123;companyName&#125;&#125; to speed up your team&apos;s outreach.
              </p>
              {canManage && (
                <Button size="sm" onClick={handleOpenCreate} className="mt-4 h-8 text-xs">
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Template
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead>Template Name</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((tpl) => (
                    <TableRow key={tpl.id} className="text-xs">
                      <TableCell className="font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>{tpl.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate text-muted-foreground">
                        {tpl.subject}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {tpl.createdBy?.name || 'System'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(tpl.updatedAt || tpl.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setPreviewTemplate(tpl)}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            title="Preview Template"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {canManage && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenEdit(tpl)}
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                title="Edit Template"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteTarget(tpl)}
                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                title="Delete Template"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CREATE / EDIT DIALOG WITH LIVE PREVIEW */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {editingTemplate ? 'Edit Email Template' : 'Create Email Template'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Use dynamic variables that populate automatically based on the recipient&apos;s details.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Template Name */}
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name" className="text-xs font-medium">
                Template Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tpl-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Follow-up After Demo"
                className="h-9 text-xs"
                required
              />
            </div>

            {/* Quick Variable Insert Toolbar */}
            <div className="rounded-lg border bg-muted/30 p-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-primary" /> Click variable to insert into Body:
                </span>
                {copiedVar && (
                  <span className="text-emerald-600 font-medium animate-in fade-in">
                    Inserted {copiedVar}!
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATE_VARIABLES.map((v) => (
                  <Button
                    key={v.key}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => insertVariable('body', v.key)}
                    className="h-6 px-2 text-[11px] font-mono bg-background hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors"
                  >
                    {v.key}
                    <span className="ml-1 text-[10px] text-muted-foreground font-sans">
                      ({v.label})
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="tpl-subj" className="text-xs font-medium">
                  Subject Line <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => insertVariable('subject', '{{firstName}}')}
                    className="text-[10px] text-primary hover:underline"
                  >
                    + &#123;&#123;firstName&#125;&#125;
                  </button>
                  <span className="text-muted-foreground text-[10px]">•</span>
                  <button
                    type="button"
                    onClick={() => insertVariable('subject', '{{companyName}}')}
                    className="text-[10px] text-primary hover:underline"
                  >
                    + &#123;&#123;companyName&#125;&#125;
                  </button>
                </div>
              </div>
              <Input
                id="tpl-subj"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Quick question regarding {{companyName}}"
                className="h-9 text-xs"
                required
              />
            </div>

            {/* Body */}
            <div className="space-y-1.5">
              <Label htmlFor="tpl-body" className="text-xs font-medium">
                Email Body <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="tpl-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Hi {{firstName}},&#10;&#10;I wanted to follow up with you on {{companyName}}...&#10;&#10;Best,&#10;{{ownerName}}"
                rows={6}
                className="text-xs font-sans resize-y"
                required
              />
            </div>

            {/* LIVE PREVIEW BOX */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-primary">
                <span className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" /> Live Preview (Sample Recipient: Jane Doe, Acme Corporation)
                </span>
                <Badge variant="outline" className="text-[10px] font-normal bg-background">
                  Auto-updated
                </Badge>
              </div>

              <div className="rounded border bg-background p-3 text-xs space-y-2">
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Subject:
                  </span>
                  <p className="font-medium text-foreground mt-0.5">
                    {renderTemplateVariables(subject, mockVars) || (
                      <span className="text-muted-foreground italic">No subject entered yet</span>
                    )}
                  </p>
                </div>
                <hr className="border-border/60" />
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Message:
                  </span>
                  <div className="text-foreground whitespace-pre-wrap mt-0.5 text-xs leading-relaxed">
                    {renderTemplateVariables(body, mockVars) || (
                      <span className="text-muted-foreground italic">No message body entered yet</span>
                    )}
                  </div>
                </div>
                <div className="pt-2 text-[10px] text-muted-foreground border-t border-border/40">
                  <p>Includes automatic unsubscribe link in footer.</p>
                </div>
              </div>
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
                <span>{editingTemplate ? 'Update Template' : 'Create Template'}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* PREVIEW MODAL */}
      <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {previewTemplate?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Preview with sample recipient data
            </DialogDescription>
          </DialogHeader>

          {previewTemplate && (
            <div className="space-y-3 pt-2">
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-muted-foreground text-[10px] uppercase">
                    Raw Subject:
                  </span>
                  <p className="font-mono text-[11px] text-foreground mt-0.5">
                    {previewTemplate.subject}
                  </p>
                </div>
                <div className="pt-2 border-t">
                  <span className="font-semibold text-primary text-[10px] uppercase">
                    Rendered Subject:
                  </span>
                  <p className="font-medium text-foreground mt-0.5">
                    {renderTemplateVariables(previewTemplate.subject, mockVars)}
                  </p>
                </div>
              </div>

              {/* Styled Email Card Preview */}
              <div className="rounded-lg border bg-card shadow-sm overflow-hidden text-xs">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-3.5 text-white flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-md bg-white/20 flex items-center justify-center font-bold text-xs">
                    &#9776;
                  </div>
                  <div>
                    <div className="font-bold text-xs tracking-tight leading-none text-white">SmartConnect</div>
                    <div className="text-[8px] font-mono text-indigo-200 tracking-wider mt-0.5">RELATIONSHIP CRM</div>
                  </div>
                </div>

                {/* Email Body */}
                <div className="p-4 space-y-3 bg-white dark:bg-card">
                  <div className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed min-h-[80px]">
                    {renderTemplateVariables(previewTemplate.body, mockVars)}
                  </div>

                  {/* Signature */}
                  <div className="pt-3 border-t flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                      {(mockVars.ownerName || 'SC').split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-foreground leading-tight">
                        {mockVars.ownerName}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        SmartConnect Sales Team
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 dark:bg-muted/30 border-t p-2.5 text-center text-[10px] text-muted-foreground">
                  <p>
                    Sent via <strong className="text-foreground">SmartConnect CRM</strong> &bull; <span className="underline text-primary">Unsubscribe</span>
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPreviewTemplate(null)}
                  className="text-xs"
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM DIALOG */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Email Template"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete Template"
        confirmVariant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
}

export default EmailTemplatesSettings;
