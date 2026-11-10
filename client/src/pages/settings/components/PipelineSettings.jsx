import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#EF4444', // Red
  '#64748B', // Slate
];

// Sortable Row item
function SortableStageItem({ stage, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between gap-3 p-3.5 rounded-card border bg-card hover:bg-muted/30 transition-colors shadow-sm"
    >
      <div className="flex items-center gap-3">
        {/* Drag handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing p-1"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Color Dot */}
        <span
          className="h-3 w-3 rounded-full shrink-0"
          style={{ backgroundColor: stage.color || '#3B82F6' }}
        />

        <div>
          <p className="text-xs font-semibold text-foreground flex items-center gap-2">
            <span>{stage.name}</span>
            <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0">
              {stage.type}
            </Badge>
          </p>
          <p className="text-[11px] text-muted-foreground">
            Probability: <span className="font-mono font-medium text-foreground">{stage.probability}%</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(stage)}
          className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
        >
          <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(stage)}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function PipelineSettings() {
  const queryClient = useQueryClient();

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [reassignTargetId, setReassignTargetId] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [probability, setProbability] = useState('20');
  const [type, setType] = useState('OPEN');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Fetch stages
  const { data: stagesData, isLoading } = useQuery({
    queryKey: queryKeys.pipelineStages.all,
    queryFn: async () => {
      const res = await api.get('/pipeline-stages');
      return res.data?.data || [];
    },
  });

  const stages = useMemo(() => stagesData || [], [stagesData]);
  const stageIds = useMemo(() => stages.map((s) => s.id), [stages]);

  // 1. Reorder Mutation
  const reorderMutation = useMutation({
    mutationFn: async (orderedIds) => {
      await api.patch('/pipeline-stages/reorder', { stageIds: orderedIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelineStages.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
    onError: () => {
      toast.error('Failed to save stage order');
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelineStages.all });
    },
  });

  // 2. Create Stage Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/pipeline-stages', {
        name: name.trim(),
        color,
        probability: parseInt(probability, 10),
        type,
      });
      return res.data?.data;
    },
    onSuccess: () => {
      toast.success('Pipeline stage created!');
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelineStages.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      setCreateOpen(false);
      setName('');
      setColor('#3B82F6');
      setProbability('20');
      setType('OPEN');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to create stage');
    },
  });

  // 3. Edit Stage Mutation
  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editTarget) return;
      const res = await api.patch(`/pipeline-stages/${editTarget.id}`, {
        name: name.trim(),
        color,
        probability: parseInt(probability, 10),
        type,
      });
      return res.data?.data;
    },
    onSuccess: () => {
      toast.success('Stage updated successfully!');
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelineStages.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      setEditTarget(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update stage');
    },
  });

  // 4. Delete Stage Mutation (with optional reassignment)
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deleteTarget) return;
      const url = reassignTargetId
        ? `/pipeline-stages/${deleteTarget.id}?targetStageId=${reassignTargetId}`
        : `/pipeline-stages/${deleteTarget.id}`;
      await api.delete(url);
    },
    onSuccess: () => {
      toast.success('Stage removed successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelineStages.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      setDeleteTarget(null);
      setReassignTargetId('');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to delete stage. Make sure to reassign active leads.');
    },
  });

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = stageIds.indexOf(active.id);
      const newIndex = stageIds.indexOf(over.id);
      const newOrderedStages = arrayMove(stages, oldIndex, newIndex);
      const newOrderedIds = newOrderedStages.map((s) => s.id);
      reorderMutation.mutate(newOrderedIds);
    }
  };

  const openEdit = (st) => {
    setEditTarget(st);
    setName(st.name);
    setColor(st.color || '#3B82F6');
    setProbability(String(st.probability || 0));
    setType(st.type || 'OPEN');
  };

  const openDelete = (st) => {
    setDeleteTarget(st);
    const fallback = stages.find((s) => s.id !== st.id);
    setReassignTargetId(fallback?.id || '');
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-base font-semibold">Deal Pipeline Stages</CardTitle>
          <CardDescription className="text-xs">
            Drag to reorder stages, customize win probability percentages, and configure colors.
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="h-9 gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          <span>Add Stage</span>
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-card border bg-muted/20 animate-pulse" />
            ))}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={stageIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {stages.map((stage) => (
                  <SortableStageItem
                    key={stage.id}
                    stage={stage}
                    onEdit={openEdit}
                    onDelete={openDelete}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>

      {/* Create Stage Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Create Pipeline Stage</DialogTitle>
            <DialogDescription className="text-xs">
              Add a new stage to your sales pipeline deal board.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Stage Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Contract Sent"
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Win Probability (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={probability}
                  onChange={(e) => setProbability(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Stage Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Open Pipeline</SelectItem>
                    <SelectItem value="WON">Closed Won</SelectItem>
                    <SelectItem value="LOST">Closed Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Color Palette */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Stage Badge Color</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-7 w-7 rounded-full border-2 transition-transform ${
                      color === c ? 'scale-110 border-foreground shadow-sm' : 'border-transparent'
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
                onClick={() => setCreateOpen(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Stage'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Stage Dialog */}
      <Dialog open={Boolean(editTarget)} onOpenChange={(val) => !val && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Edit Pipeline Stage</DialogTitle>
            <DialogDescription className="text-xs">
              Update name, probability, and color for {editTarget?.name}.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              editMutation.mutate();
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Stage Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Win Probability (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={probability}
                  onChange={(e) => setProbability(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Stage Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Open Pipeline</SelectItem>
                    <SelectItem value="WON">Closed Won</SelectItem>
                    <SelectItem value="LOST">Closed Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Color Palette */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Stage Badge Color</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-7 w-7 rounded-full border-2 transition-transform ${
                      color === c ? 'scale-110 border-foreground shadow-sm' : 'border-transparent'
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
                onClick={() => setEditTarget(null)}
                disabled={editMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={editMutation.isPending}>
                {editMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Stage Dialog with Reassignment */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(val) => !val && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>Delete Pipeline Stage</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <Label className="text-xs font-semibold">Reassign Existing Leads To</Label>
            <Select value={reassignTargetId} onValueChange={setReassignTargetId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select target stage..." />
              </SelectTrigger>
              <SelectContent>
                {stages
                  .filter((s) => s.id !== deleteTarget?.id)
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.name} ({s.type})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Any active opportunities in this stage will be safely migrated to the selected target stage.
            </p>
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete & Reassign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
