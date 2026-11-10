import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  SlidersHorizontal,
  X,
  LayoutGrid,
  List,
  Plus,
  Download,
  DollarSign,
  TrendingUp,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { cn, formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function LeadsToolbar({
  viewMode = 'board', // 'board' | 'table'
  onViewModeChange,
  search = '',
  onSearchChange,
  filters = {},
  onFilterChange,
  onResetFilters,
  ownerFilter = 'everyone', // 'mine' | 'everyone'
  onOwnerFilterChange,
  summary = {},
  onOpenCreateModal,
}) {
  const currentUser = useAuthStore((state) => state.user);
  const [searchInput, setSearchInput] = useState(search);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== search) {
        onSearchChange(searchInput);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput, search, onSearchChange]);

  // Load pipeline stages
  const { data: stagesData } = useQuery({
    queryKey: queryKeys.pipelineStages.all,
    queryFn: async () => {
      const res = await api.get('/pipeline-stages');
      return res.data?.data || [];
    },
  });
  const stages = stagesData || [];

  // Load lead sources
  const { data: sourcesData } = useQuery({
    queryKey: queryKeys.leadSources.all,
    queryFn: async () => {
      const res = await api.get('/lead-sources');
      return res.data?.data || [];
    },
  });
  const leadSources = sourcesData || [];

  const activeFilterCount = Object.entries(filters).filter(
    ([_k, v]) => v !== undefined && v !== null && v !== ''
  ).length;

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (ownerFilter === 'mine' && currentUser?.id) {
        params.append('ownerId', currentUser.id);
      }
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          params.append(k, v);
        }
      });

      const res = await api.get(`/leads/export.csv?${params.toString()}`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `leads-export-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Leads CSV exported successfully');
    } catch (err) {
      toast.error('Failed to export leads: ' + (err.message || 'Server error'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* 1. Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-card border bg-card p-3 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Total Pipeline Value
            </span>
            <div className="text-lg font-bold text-foreground">
              {formatCurrency(summary.totalPipelineValue || 0)}
            </div>
          </div>
          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-card border bg-card p-3 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Weighted Pipeline
            </span>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(summary.totalWeightedPipelineValue || 0)}
            </div>
          </div>
          <div className="h-9 w-9 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-card border bg-card p-3 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Total Opportunities
            </span>
            <div className="text-lg font-bold text-foreground">
              {summary.totalLeads ?? 0} <span className="text-xs font-normal text-muted-foreground">deals</span>
            </div>
          </div>
          <div className="h-9 w-9 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* 2. Main Controls Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        {/* Left Side: Search + Filter Popover */}
        <div className="flex items-center gap-2 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search leads by title, contact, company..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs rounded-crm bg-card"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  onSearchChange('');
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Popover */}
          <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={activeFilterCount > 0 ? 'secondary' : 'outline'}
                size="sm"
                className="h-9 gap-1.5 rounded-crm shrink-0 text-xs font-normal"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <Badge variant="default" className="h-4 min-w-4 px-1 text-[10px] rounded-full">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4 space-y-4 shadow-lg" align="start">
              <div className="flex items-center justify-between pb-2 border-b">
                <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                  Filter Opportunities
                </span>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={onResetFilters}
                    className="text-xs text-primary hover:underline font-medium cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Stage Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Pipeline Stage</label>
                <Select
                  value={filters.stageId || '__all__'}
                  onValueChange={(val) =>
                    onFilterChange('stageId', val === '__all__' ? undefined : val)
                  }
                >
                  <SelectTrigger className="h-8 text-xs rounded-crm">
                    <SelectValue placeholder="All stages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All stages</SelectItem>
                    {stages.map((st) => (
                      <SelectItem key={st.id} value={st.id}>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: st.color || '#4F46E5' }}
                          />
                          <span>{st.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Priority</label>
                <Select
                  value={filters.priority || '__all__'}
                  onValueChange={(val) =>
                    onFilterChange('priority', val === '__all__' ? undefined : val)
                  }
                >
                  <SelectTrigger className="h-8 text-xs rounded-crm">
                    <SelectValue placeholder="All priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All priorities</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Source Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Lead Source</label>
                <Select
                  value={filters.sourceId || '__all__'}
                  onValueChange={(val) =>
                    onFilterChange('sourceId', val === '__all__' ? undefined : val)
                  }
                >
                  <SelectTrigger className="h-8 text-xs rounded-crm">
                    <SelectValue placeholder="All sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All sources</SelectItem>
                    {leadSources.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Min & Max Deal Value */}
              <div className="space-y-1.5 pt-2 border-t">
                <label className="text-xs font-medium text-foreground">Deal Value Range ($)</label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="Min $"
                    value={filters.minValue || ''}
                    onChange={(e) => onFilterChange('minValue', e.target.value || undefined)}
                    className="h-8 text-xs rounded-crm"
                  />
                  <Input
                    type="number"
                    placeholder="Max $"
                    value={filters.maxValue || ''}
                    onChange={(e) => onFilterChange('maxValue', e.target.value || undefined)}
                    className="h-8 text-xs rounded-crm"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Right Side: Owner Toggle + View Toggle + Export + New Lead */}
        <div className="flex items-center gap-2 shrink-0">
          {/* "Mine" vs "Everyone" Owner Toggle */}
          <div className="flex items-center rounded-crm border border-border/70 bg-muted/30 p-0.5">
            <button
              type="button"
              onClick={() => onOwnerFilterChange('everyone')}
              className={cn(
                'px-2.5 py-1 text-xs rounded-crm font-medium transition-all cursor-pointer',
                ownerFilter === 'everyone'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Everyone
            </button>
            <button
              type="button"
              onClick={() => onOwnerFilterChange('mine')}
              className={cn(
                'px-2.5 py-1 text-xs rounded-crm font-medium transition-all cursor-pointer',
                ownerFilter === 'mine'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Mine
            </button>
          </div>

          {/* View Toggle: Board vs List */}
          <div className="flex items-center rounded-crm border border-border/70 bg-muted/30 p-0.5">
            <button
              type="button"
              onClick={() => onViewModeChange('board')}
              className={cn(
                'p-1.5 rounded-crm text-xs transition-all cursor-pointer',
                viewMode === 'board'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title="Kanban Board view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('table')}
              className={cn(
                'p-1.5 rounded-crm text-xs transition-all cursor-pointer',
                viewMode === 'table'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title="Table List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Export CSV */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="h-9 gap-1.5 rounded-crm text-xs font-normal"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden md:inline">{isExporting ? 'Exporting...' : 'Export'}</span>
          </Button>

          {/* Primary New Lead Button */}
          <Button
            size="sm"
            onClick={onOpenCreateModal}
            className="h-9 gap-1.5 rounded-crm text-xs font-semibold shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Lead</span>
          </Button>
        </div>
      </div>

      {/* Active Filter Chips */}
      {(search || activeFilterCount > 0 || ownerFilter === 'mine') && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-medium text-muted-foreground mr-1">Active filters:</span>

          {ownerFilter === 'mine' && (
            <Badge variant="secondary" className="pl-2 pr-1 py-0.5 text-[11px] rounded-full">
              <span>Owner: My Deals</span>
              <button
                type="button"
                onClick={() => onOwnerFilterChange('everyone')}
                className="hover:bg-foreground/10 rounded-full p-0.5 cursor-pointer ml-1"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}

          {search && (
            <Badge variant="secondary" className="pl-2 pr-1 py-0.5 text-[11px] rounded-full">
              <span>Search: &quot;{search}&quot;</span>
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  onSearchChange('');
                }}
                className="hover:bg-foreground/10 rounded-full p-0.5 cursor-pointer ml-1"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}

          {filters.stageId && (
            <Badge variant="secondary" className="pl-2 pr-1 py-0.5 text-[11px] rounded-full">
              <span>Stage: {stages.find((s) => s.id === filters.stageId)?.name || 'Selected'}</span>
              <button
                type="button"
                onClick={() => onFilterChange('stageId', undefined)}
                className="hover:bg-foreground/10 rounded-full p-0.5 cursor-pointer ml-1"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}

          {filters.priority && (
            <Badge variant="secondary" className="pl-2 pr-1 py-0.5 text-[11px] rounded-full">
              <span>Priority: {filters.priority}</span>
              <button
                type="button"
                onClick={() => onFilterChange('priority', undefined)}
                className="hover:bg-foreground/10 rounded-full p-0.5 cursor-pointer ml-1"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground font-medium"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}

export default LeadsToolbar;
