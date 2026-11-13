import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Globe,
  Copy,
  Check,
  Code2,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

export function LeadCaptureSettings() {
  const queryClient = useQueryClient();
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Form config
  const [defaultSourceId, setDefaultSourceId] = useState('');
  const [defaultOwnerId, setDefaultOwnerId] = useState('');

  // 1. Fetch Capture Form
  const { data: formsData, isLoading: formsLoading } = useQuery({
    queryKey: ['captureForms'],
    queryFn: async () => {
      const res = await api.get('/capture-forms');
      return res.data?.data || [];
    },
  });

  // 2. Fetch Lead Sources
  const { data: sourcesData } = useQuery({
    queryKey: queryKeys.leadSources.all,
    queryFn: async () => {
      const res = await api.get('/lead-sources');
      return res.data?.data || [];
    },
  });

  // 3. Fetch Users
  const { data: usersData } = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: async () => {
      const res = await api.get('/users?limit=100');
      return res.data?.data || [];
    },
  });

  const form = formsData?.[0] || null;
  const sources = sourcesData || [];
  const users = usersData || [];

  useEffect(() => {
    if (form) {
      setDefaultSourceId(form.defaultSourceId || '');
      setDefaultOwnerId(form.defaultOwnerId || '');
    }
  }, [form]);

  // Derive URLs: server runs on port 5001
  const serverBase = window.location.origin.includes(':5173')
    ? window.location.origin.replace(':5173', ':5001')
    : window.location.origin;

  const publicUrl = form ? `${serverBase}/capture/${form.key}` : '';
  const embedSnippet = form
    ? `<iframe src="${publicUrl}?embed=true" width="100%" height="600" frameborder="0"></iframe>`
    : '';

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
      toast.success('Public form URL copied to clipboard!');
    } else {
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
      toast.success('Embed iframe code copied to clipboard!');
    }
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!form) return;
      const res = await api.patch(`/capture-forms/${form.id}`, {
        defaultSourceId: defaultSourceId || null,
        defaultOwnerId: defaultOwnerId || null,
      });
      return res.data?.data;
    },
    onSuccess: () => {
      toast.success('Lead capture routing updated!');
      queryClient.invalidateQueries({ queryKey: ['captureForms'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update lead capture settings');
    },
  });

  return (
    <div className="space-y-6">
      {/* Form Details Card */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <span>Public Inbound Lead Form</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Deploy an embeddable lead capture form on your website or landing pages to automatically intake leads with honeypot spam protection.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {formsLoading ? (
            <div className="h-32 bg-muted/20 rounded-crm animate-pulse" />
          ) : (
            <>
              {/* Public URL Link */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Hosted Public Form URL</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={publicUrl}
                    readOnly
                    className="h-9 text-xs font-mono bg-muted/40"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(publicUrl, 'url')}
                    className="h-9 gap-1.5 text-xs shrink-0"
                  >
                    {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs shrink-0"
                  >
                    <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </div>
              </div>

              {/* Embed Code Snippet */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Code2 className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Embeddable HTML Iframe Snippet</span>
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(embedSnippet, 'snippet')}
                    className="h-6 text-[11px] gap-1 text-primary"
                  >
                    {copiedSnippet ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedSnippet ? 'Copied Snippet' : 'Copy HTML'}</span>
                  </Button>
                </div>
                <Textarea
                  value={embedSnippet}
                  readOnly
                  rows={2}
                  className="font-mono text-xs bg-muted/30 resize-none"
                />
              </div>

              {/* Default Routing Preferences */}
              <div className="pt-2 border-t space-y-4">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Default Intake Routing
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Default Source */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Attributed Lead Source</Label>
                    <Select value={defaultSourceId} onValueChange={setDefaultSourceId}>
                      <SelectTrigger className="h-9 text-xs bg-background">
                        <SelectValue placeholder="Choose lead source..." />
                      </SelectTrigger>
                      <SelectContent>
                        {sources.map((s) => (
                          <SelectItem key={s.id} value={s.id} className="text-xs">
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">
                      Submissions from this form will be automatically tagged with this channel.
                    </p>
                  </div>

                  {/* Default Owner */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Assigned Account Owner</Label>
                    <Select value={defaultOwnerId} onValueChange={setDefaultOwnerId}>
                      <SelectTrigger className="h-9 text-xs bg-background">
                        <SelectValue placeholder="Choose sales rep..." />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id} className="text-xs">
                            {u.name} ({u.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">
                      New inbound leads will be instantly assigned to this representative.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => updateMutation.mutate()}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Save Form Routing
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Live Form Interactive Preview Card */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span>Live Responsive Embed Preview</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Interactive preview of the responsive capture form rendered directly from the server.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {publicUrl && (
            <div className="w-full bg-slate-50 dark:bg-slate-950 p-4 flex justify-center">
              <div className="w-full max-w-lg rounded-card border shadow-sm overflow-hidden bg-background">
                <iframe
                  src={`${publicUrl}?embed=true`}
                  title="Lead Capture Form Preview"
                  className="w-full h-[520px] border-0"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

