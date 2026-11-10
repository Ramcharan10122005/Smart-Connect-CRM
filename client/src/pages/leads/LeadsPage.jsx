import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/layout/PageHeader';
import { KanbanBoard } from './components/KanbanBoard';
import { LeadsTableView } from './components/LeadsTableView';
import { LeadsToolbar } from './components/LeadsToolbar';
import { CreateLeadModal } from './components/CreateLeadModal';
import { LeadDetailSheet } from './components/LeadDetailSheet';

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);

  // View mode: 'board' | 'table'
  const [viewMode, setViewMode] = useState('board');

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [ownerFilter, setOwnerFilter] = useState('everyone');

  // Table pagination state
  const [tablePage, setTablePage] = useState(1);
  const [tableLimit, setTableLimit] = useState(25);
  const [tableSort, setTableSort] = useState('createdAt');
  const [tableOrder, setTableOrder] = useState('desc');

  // Modal / Sheet State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createDefaultStageId, setCreateDefaultStageId] = useState(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);

  // Computed query parameters for Board
  const boardQueryParams = {
    search: search || undefined,
    ownerId: ownerFilter === 'mine' && currentUser?.id ? currentUser.id : filters.ownerId || undefined,
    stageId: filters.stageId || undefined,
    sourceId: filters.sourceId || undefined,
    priority: filters.priority || undefined,
    status: filters.status || undefined,
    minValue: filters.minValue || undefined,
    maxValue: filters.maxValue || undefined,
  };

  // 1. Fetch Board Data
  const {
    data: boardData,
    isLoading: isBoardLoading,
  } = useQuery({
    queryKey: queryKeys.leads.board(boardQueryParams),
    queryFn: async () => {
      const cleanParams = Object.fromEntries(
        Object.entries(boardQueryParams).filter(
          ([_, v]) => v !== undefined && v !== null && v !== ''
        )
      );
      const res = await api.get('/leads/board', { params: cleanParams });
      return res.data?.data || {};
    },
    enabled: viewMode === 'board',
  });

  // Computed query parameters for Table List
  const tableQueryParams = {
    page: tablePage,
    limit: tableLimit,
    sort: tableSort,
    order: tableOrder,
    ...boardQueryParams,
  };

  // 2. Fetch Table List Data
  const {
    data: tableResponse,
    isLoading: isTableLoading,
  } = useQuery({
    queryKey: queryKeys.leads.list(tableQueryParams),
    queryFn: async () => {
      const cleanParams = Object.fromEntries(
        Object.entries(tableQueryParams).filter(
          ([_, v]) => v !== undefined && v !== null && v !== ''
        )
      );
      const res = await api.get('/leads', { params: cleanParams });
      return res.data;
    },
    enabled: viewMode === 'table',
  });

  const tableLeads = tableResponse?.data || [];
  const tableMeta = tableResponse?.meta || {};

  // Delete lead mutation
  const deleteLeadMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/leads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Opportunity deleted');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to delete lead');
    },
  });

  const handleCardClick = (lead) => {
    setSelectedLeadId(lead.id);
    setDetailSheetOpen(true);
  };

  const handleAddLeadToStage = (stageId) => {
    setCreateDefaultStageId(stageId);
    setCreateModalOpen(true);
  };

  const summary = boardData?.summary || {
    totalLeads: tableMeta.total || 0,
    totalPipelineValue: 0,
    totalWeightedPipelineValue: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Leads Pipeline"
        description="Kanban pipeline board with drag-and-drop progression, deal scoring, and customer conversion."
      />

      {/* Toolbar & KPI Summary Strip */}
      <LeadsToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        search={search}
        onSearchChange={setSearch}
        filters={filters}
        onFilterChange={(k, v) => setFilters((prev) => ({ ...prev, [k]: v }))}
        onResetFilters={() => {
          setSearch('');
          setFilters({});
          setOwnerFilter('everyone');
        }}
        ownerFilter={ownerFilter}
        onOwnerFilterChange={setOwnerFilter}
        summary={summary}
        onOpenCreateModal={() => {
          setCreateDefaultStageId(null);
          setCreateModalOpen(true);
        }}
      />

      {/* View Switcher: Board vs Table */}
      {viewMode === 'board' ? (
        isBoardLoading ? (
          <div className="py-20 text-center space-y-3 text-xs text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p>Loading pipeline board...</p>
          </div>
        ) : (
          <KanbanBoard
            boardData={boardData || {}}
            queryParams={boardQueryParams}
            onAddLeadToStage={handleAddLeadToStage}
            onCardClick={handleCardClick}
          />
        )
      ) : (
        <LeadsTableView
          leads={tableLeads}
          meta={tableMeta}
          isLoading={isTableLoading}
          page={tablePage}
          limit={tableLimit}
          sort={tableSort}
          order={tableOrder}
          onPageChange={setTablePage}
          onLimitChange={(l) => {
            setTableLimit(l);
            setTablePage(1);
          }}
          onSortChange={(field, ord) => {
            setTableSort(field);
            setTableOrder(ord);
          }}
          onCardClick={handleCardClick}
          onDeleteLead={(id) => deleteLeadMutation.mutate(id)}
        />
      )}

      {/* Create Lead Modal */}
      <CreateLeadModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        defaultStageId={createDefaultStageId}
      />

      {/* Lead Detail Wide Sheet */}
      <LeadDetailSheet
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        leadId={selectedLeadId}
        onDeleted={() => {
          setSelectedLeadId(null);
          setDetailSheetOpen(false);
        }}
      />
    </div>
  );
}
