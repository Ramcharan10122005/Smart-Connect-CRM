import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { KanbanColumn } from './KanbanColumn';
import { LeadCard } from './LeadCard';
import { LostReasonDialog } from './LostReasonDialog';

export function KanbanBoard({
  boardData = {},
  queryParams = {},
  onAddLeadToStage,
  onCardClick,
}) {
  const queryClient = useQueryClient();

  const stages = boardData.stages || [];

  // Drag State
  const [activeLead, setActiveLead] = useState(null);
  const [lostDialogState, setLostDialogState] = useState({
    open: false,
    leadId: null,
    leadTitle: '',
    targetStageId: null,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement required before drag begins
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Stage Move Mutation with Optimistic Updates & Rollback
  const moveStageMutation = useMutation({
    mutationFn: async ({ leadId, stageId, lostReason }) => {
      const res = await api.patch(`/leads/${leadId}/stage`, {
        stageId,
        lostReason: lostReason || undefined,
      });
      return res.data?.data;
    },
    onMutate: async ({ leadId, stageId }) => {
      const boardKey = queryKeys.leads.board(queryParams);
      await queryClient.cancelQueries({ queryKey: boardKey });
      const previousBoard = queryClient.getQueryData(boardKey);

      if (previousBoard && previousBoard.stages) {
        // Optimistically update stages
        let movedLead = null;
        const newStages = previousBoard.stages.map((st) => {
          const found = st.leads.find((l) => l.id === leadId);
          if (found) {
            movedLead = { ...found, stageId };
            return {
              ...st,
              leads: st.leads.filter((l) => l.id !== leadId),
              count: Math.max(0, st.count - 1),
              totalValue: Math.max(0, st.totalValue - Number(found.value || 0)),
            };
          }
          return st;
        });

        if (movedLead) {
          const finalStages = newStages.map((st) => {
            if (st.stage.id === stageId) {
              return {
                ...st,
                leads: [movedLead, ...st.leads],
                count: st.count + 1,
                totalValue: st.totalValue + Number(movedLead.value || 0),
              };
            }
            return st;
          });
          queryClient.setQueryData(boardKey, { ...previousBoard, stages: finalStages });
        }
      }

      return { previousBoard, boardKey };
    },
    onError: (err, _vars, context) => {
      if (context?.boardKey && context?.previousBoard) {
        queryClient.setQueryData(context.boardKey, context.previousBoard);
      }
      toast.error(err.message || 'Failed to move deal stage');
    },
    onSuccess: (data, variables) => {
      // Check if moved to WON stage
      const targetStage = stages.find((s) => s.stage.id === variables.stageId)?.stage;
      if (targetStage?.type === 'WON') {
        // Trigger subtle confetti celebration!
        confetti({
          particleCount: 75,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#4F46E5', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6'],
        });
        toast.success(`🎉 Congratulations! Opportunity won!`);
      } else if (targetStage?.type === 'LOST') {
        toast.info('Lead moved to Lost');
      } else {
        toast.success(`Moved lead to ${targetStage?.name || 'next stage'}`);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const handleDragStart = (event) => {
    const { active } = event;
    const lead = stages
      .flatMap((s) => s.leads)
      .find((l) => l.id === active.id);
    setActiveLead(lead || null);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveLead(null);

    if (!over) return;

    const leadId = active.id;
    const overId = over.id;

    // Check if over target is a stage column or another lead
    let targetStageId = null;
    const directStage = stages.find((s) => s.stage.id === overId);
    if (directStage) {
      targetStageId = directStage.stage.id;
    } else {
      // Find the stage containing the over lead
      const stageContainingLead = stages.find((s) =>
        s.leads.some((l) => l.id === overId)
      );
      if (stageContainingLead) {
        targetStageId = stageContainingLead.stage.id;
      }
    }

    if (!targetStageId) return;

    // Find current stage of the active lead
    const currentLead = stages.flatMap((s) => s.leads).find((l) => l.id === leadId);
    if (!currentLead || currentLead.stageId === targetStageId) return;

    // Check target stage type
    const targetStageObj = stages.find((s) => s.stage.id === targetStageId)?.stage;

    // If target stage is LOST: intercept with lost reason dialog
    if (targetStageObj?.type === 'LOST') {
      setLostDialogState({
        open: true,
        leadId,
        leadTitle: currentLead.title,
        targetStageId,
      });
      return;
    }

    // Normal move
    moveStageMutation.mutate({
      leadId,
      stageId: targetStageId,
    });
  };

  const handleConfirmLostReason = (reason) => {
    if (!lostDialogState.leadId || !lostDialogState.targetStageId) return;

    moveStageMutation.mutate({
      leadId: lostDialogState.leadId,
      stageId: lostDialogState.targetStageId,
      lostReason: reason,
    });

    setLostDialogState({ open: false, leadId: null, leadTitle: '', targetStageId: null });
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 items-start min-h-[500px]">
          {stages.map((stageItem) => (
            <KanbanColumn
              key={stageItem.stage.id}
              stage={stageItem.stage}
              leads={stageItem.leads}
              totalValue={stageItem.totalValue}
              weightedValue={stageItem.weightedValue}
              onAddLeadToStage={onAddLeadToStage}
              onCardClick={onCardClick}
            />
          ))}
        </div>

        {/* Drag Overlay with floating active card */}
        <DragOverlay>
          {activeLead ? <LeadCard lead={activeLead} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      {/* Lost Reason Dialog */}
      <LostReasonDialog
        open={lostDialogState.open}
        onOpenChange={(open) =>
          setLostDialogState((prev) => ({ ...prev, open }))
        }
        leadTitle={lostDialogState.leadTitle}
        loading={moveStageMutation.isPending}
        onConfirm={handleConfirmLostReason}
        onCancel={() => {
          setLostDialogState({ open: false, leadId: null, leadTitle: '', targetStageId: null });
        }}
      />
    </>
  );
}

export default KanbanBoard;
