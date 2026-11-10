import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag, Plus, Edit2, Trash2, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const TAG_COLORS = [
  '#4F46E5', // Indigo
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#64748B', // Slate
];

export function TagsAndSourcesSettings() {
  const queryClient = useQueryClient();

  // Tag modal states
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#4F46E5');

  // Source modal states
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [sourceName, setSourceName] = useState('');

  // 1. Fetch Tags
  const { data: tagsData, isLoading: tagsLoading } = useQuery({
    queryKey: queryKeys.tags.all,
    queryFn: async () => {
      const res = await api.get('/tags');
      return res.data?.data || [];
    },
  });

  // 2. Fetch Lead Sources
  const { data: sourcesData, isLoading: sourcesLoading } = useQuery({
    queryKey: queryKeys.leadSources.all,
    queryFn: async () => {
      const res = await api.get('/lead-sources');
      return res.data?.data || [];
    },
  });

  const tags = tagsData || [];
  const sources = sourcesData || [];

  // -------------------------------------------------------------
  // Tag Mutations
  // -------------------------------------------------------------
  const saveTagMutation = useMutation({
    mutationFn: async () => {
      if (editingTag) {
        const res = await api.patch(`/tags/${editingTag.id}`, {
          name: tagName.trim(),
          color: tagColor,
        });
        return res.data?.data;
      } else {
        const res = await api.post('/tags', {
          name: tagName.trim(),
          color: tagColor,
        });
        return res.data?.data;
      }
    },
    onSuccess: () => {
      toast.success(editingTag ? 'Tag updated!' : 'Tag created!');
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
      setTagModalOpen(false);
      setEditingTag(null);
      setTagName('');
      setTagColor('#4F46E5');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to save tag');
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/tags/${id}`);
    },
    onSuccess: () => {
      toast.success('Tag deleted');
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to delete tag');
    },
  });

  // -------------------------------------------------------------
  // Source Mutations
  // -------------------------------------------------------------
  const saveSourceMutation = useMutation({
    mutationFn: async () => {
      if (editingSource) {
        const res = await api.patch(`/lead-sources/${editingSource.id}`, {
          name: sourceName.trim(),
        });
        return res.data?.data;
      } else {
        const res = await api.post('/lead-sources', {
          name: sourceName.trim(),
        });
        return res.data?.data;
      }
    },
    onSuccess: () => {
      toast.success(editingSource ? 'Lead source updated!' : 'Lead source created!');
      queryClient.invalidateQueries({ queryKey: queryKeys.leadSources.all });
      setSourceModalOpen(false);
      setEditingSource(null);
      setSourceName('');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to save lead source');
    },
  });

  const deleteSourceMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/lead-sources/${id}`);
    },
    onSuccess: () => {
      toast.success('Lead source deleted');
      queryClient.invalidateQueries({ queryKey: queryKeys.leadSources.all });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to delete lead source');
    },
  });

  const openTagModal = (t = null) => {
    setEditingTag(t);
    setTagName(t?.name || '');
    setTagColor(t?.color || '#4F46E5');
    setTagModalOpen(true);
  };

  const openSourceModal = (s = null) => {
    setEditingSource(s);
    setSourceName(s?.name || '');
    setSourceModalOpen(true);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Tags Column */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              <span>Customer Tags</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Segment contacts and companies with color-coded labels.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => openTagModal()} className="h-8 text-xs gap-1">
            <Plus className="h-3.5 w-3.5" />
            <span>Add Tag</span>
          </Button>
        </CardHeader>
        <CardContent>
          {tagsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded-crm border bg-muted/20 animate-pulse" />
              ))}
            </div>
          ) : tags.length === 0 ? (
            <p className="text-center py-6 text-xs text-muted-foreground">No tags configured yet.</p>
          ) : (
            <div className="divide-y divide-border rounded-crm border overflow-hidden">
              {tags.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-2.5 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: t.color || '#4F46E5' }}
                    />
                    <span className="text-xs font-semibold text-foreground">{t.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openTagModal(t)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTagMutation.mutate(t.id)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lead Sources Column */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-500" />
              <span>Lead Sources</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Attribution channels for tracking lead generation campaigns.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => openSourceModal()} className="h-8 text-xs gap-1">
            <Plus className="h-3.5 w-3.5" />
            <span>Add Source</span>
          </Button>
        </CardHeader>
        <CardContent>
          {sourcesLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded-crm border bg-muted/20 animate-pulse" />
              ))}
            </div>
          ) : sources.length === 0 ? (
            <p className="text-center py-6 text-xs text-muted-foreground">No sources configured yet.</p>
          ) : (
            <div className="divide-y divide-border rounded-crm border overflow-hidden">
              {sources.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-2.5 hover:bg-muted/30 transition-colors"
                >
                  <span className="text-xs font-semibold text-foreground">{s.name}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openSourceModal(s)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteSourceMutation.mutate(s.id)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tag Modal */}
      <Dialog open={tagModalOpen} onOpenChange={setTagModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {editingTag ? 'Edit Tag' : 'Create Customer Tag'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure name and badge color for this tag.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveTagMutation.mutate();
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tag Name *</Label>
              <Input
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                placeholder="e.g. VIP Client, Renewal Pending"
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tag Color</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setTagColor(c)}
                    className={`h-7 w-7 rounded-full border-2 transition-transform ${
                      tagColor === c ? 'scale-110 border-foreground shadow-sm' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTagModalOpen(false)}
                disabled={saveTagMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saveTagMutation.isPending}>
                {saveTagMutation.isPending ? 'Saving...' : 'Save Tag'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Source Modal */}
      <Dialog open={sourceModalOpen} onOpenChange={setSourceModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {editingSource ? 'Edit Lead Source' : 'Create Lead Source'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add a new channel name for inbound and outbound attribution.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveSourceMutation.mutate();
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Source Name *</Label>
              <Input
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="e.g. Google Ads, Referral, Conference 2026"
                className="h-9 text-xs"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSourceModalOpen(false)}
                disabled={saveSourceMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saveSourceMutation.isPending}>
                {saveSourceMutation.isPending ? 'Saving...' : 'Save Source'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
