import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  SlidersHorizontal,
  X,
  Columns,
  Upload,
  Download,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function CustomerToolbar({
  activeTab = 'contacts', // 'contacts' | 'companies'
  search = '',
  onSearchChange,
  filters = {},
  onFilterChange,
  onResetFilters,
  columns = [],
  visibleColumns = {},
  onToggleColumn,
  onOpenCreateSheet,
  onOpenImportWizard,
}) {
  const [searchInput, setSearchInput] = useState(search);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Sync internal search input if parent search changes externally
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Debounced search propagation
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== search) {
        onSearchChange(searchInput);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput, search, onSearchChange]);

  // Load team users for filters
  const { data: usersData } = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: async () => {
      const res = await api.get('/users?limit=100');
      return res.data?.data || [];
    },
  });
  const users = usersData || [];

  // Load tags for filters
  const { data: tagsData } = useQuery({
    queryKey: queryKeys.tags.all,
    queryFn: async () => {
      const res = await api.get('/tags');
      return res.data?.data || [];
    },
  });
  const tags = tagsData || [];

  // Load lead sources for contacts filter
  const { data: sourcesData } = useQuery({
    queryKey: queryKeys.leadSources.all,
    queryFn: async () => {
      const res = await api.get('/lead-sources');
      return res.data?.data || [];
    },
  });
  const leadSources = sourcesData || [];

  // Count active filters (excluding search)
  const activeFilterCount = Object.entries(filters).filter(
    ([_k, v]) => v !== undefined && v !== null && v !== ''
  ).length;

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          params.append(k, v);
        }
      });

      const endpoint =
        activeTab === 'contacts'
          ? `/contacts/export.csv?${params.toString()}`
          : `/companies/export.csv?${params.toString()}`

      const res = await api.get(endpoint, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `${activeTab}-export-${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Exported ${activeTab} CSV successfully`);
    } catch (err) {
      toast.error('Failed to export CSV: ' + (err.message || 'Server error'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Top Toolbar Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Left Side: Search + Filter Popover */}
        <div className="flex items-center gap-2 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={`Search ${activeTab === 'contacts' ? 'contacts by name, email, company...' : 'companies by name, domain, city...'}`}
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
                  Filter {activeTab === 'contacts' ? 'Contacts' : 'Companies'}
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

              {/* Owner Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Assigned Owner</label>
                <Select
                  value={filters.ownerId || '__all__'}
                  onValueChange={(val) =>
                    onFilterChange('ownerId', val === '__all__' ? undefined : val)
                  }
                >
                  <SelectTrigger className="h-8 text-xs rounded-crm">
                    <SelectValue placeholder="All owners" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All owners</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tag Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Tag</label>
                <Select
                  value={filters.tagId || '__all__'}
                  onValueChange={(val) =>
                    onFilterChange('tagId', val === '__all__' ? undefined : val)
                  }
                >
                  <SelectTrigger className="h-8 text-xs rounded-crm">
                    <SelectValue placeholder="All tags" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All tags</SelectItem>
                    {tags.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: t.color || '#4F46E5' }}
                          />
                          <span>{t.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Contacts-specific Filters */}
              {activeTab === 'contacts' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Lifecycle Stage</label>
                    <Select
                      value={filters.lifecycleStage || '__all__'}
                      onValueChange={(val) =>
                        onFilterChange('lifecycleStage', val === '__all__' ? undefined : val)
                      }
                    >
                      <SelectTrigger className="h-8 text-xs rounded-crm">
                        <SelectValue placeholder="All stages" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All stages</SelectItem>
                        <SelectItem value="PROSPECT">Prospect</SelectItem>
                        <SelectItem value="CUSTOMER">Customer</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

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
                </>
              )}

              {/* Companies-specific Filters */}
              {activeTab === 'companies' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Industry</label>
                  <Input
                    placeholder="e.g. Technology, Retail..."
                    value={filters.industry || ''}
                    onChange={(e) => onFilterChange('industry', e.target.value || undefined)}
                    className="h-8 text-xs rounded-crm"
                  />
                </div>
              )}

              {/* Date Filter Range */}
              <div className="space-y-1.5 pt-2 border-t">
                <label className="text-xs font-medium text-foreground">Created Date Range</label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={filters.createdFrom || ''}
                    onChange={(e) => onFilterChange('createdFrom', e.target.value || undefined)}
                    className="h-8 text-[11px] rounded-crm"
                    title="From date"
                  />
                  <Input
                    type="date"
                    value={filters.createdTo || ''}
                    onChange={(e) => onFilterChange('createdTo', e.target.value || undefined)}
                    className="h-8 text-[11px] rounded-crm"
                    title="To date"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Column Visibility Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-crm text-xs font-normal">
                <Columns className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Columns</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-xs">Toggle Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={visibleColumns[col.id] !== false}
                  onCheckedChange={() => onToggleColumn(col.id)}
                  className="text-xs capitalize"
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Import CSV */}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenImportWizard}
            className="h-9 gap-1.5 rounded-crm text-xs font-normal"
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Import CSV</span>
          </Button>

          {/* Export CSV */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="h-9 gap-1.5 rounded-crm text-xs font-normal"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </Button>

          {/* Primary Create Button */}
          <Button
            size="sm"
            onClick={onOpenCreateSheet}
            className="h-9 gap-1.5 rounded-crm text-xs font-semibold shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{activeTab === 'contacts' ? 'New Contact' : 'New Company'}</span>
          </Button>
        </div>
      </div>

      {/* Active Filter Chips */}
      {(search || activeFilterCount > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-medium text-muted-foreground mr-1">Active filters:</span>

          {search && (
            <Badge
              variant="secondary"
              className="pl-2 pr-1 py-0.5 text-[11px] flex items-center gap-1 rounded-full font-normal"
            >
              <span>Search: &quot;{search}&quot;</span>
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  onSearchChange('');
                }}
                className="hover:bg-foreground/10 rounded-full p-0.5 cursor-pointer ml-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}

          {filters.ownerId && (
            <Badge
              variant="secondary"
              className="pl-2 pr-1 py-0.5 text-[11px] flex items-center gap-1 rounded-full font-normal"
            >
              <span>Owner: {users.find((u) => u.id === filters.ownerId)?.name || 'Selected'}</span>
              <button
                type="button"
                onClick={() => onFilterChange('ownerId', undefined)}
                className="hover:bg-foreground/10 rounded-full p-0.5 cursor-pointer ml-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}

          {filters.tagId && (
            <Badge
              variant="secondary"
              className="pl-2 pr-1 py-0.5 text-[11px] flex items-center gap-1 rounded-full font-normal"
            >
              <span>Tag: {tags.find((t) => t.id === filters.tagId)?.name || 'Selected'}</span>
              <button
                type="button"
                onClick={() => onFilterChange('tagId', undefined)}
                className="hover:bg-foreground/10 rounded-full p-0.5 cursor-pointer ml-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}

          {filters.lifecycleStage && (
            <Badge
              variant="secondary"
              className="pl-2 pr-1 py-0.5 text-[11px] flex items-center gap-1 rounded-full font-normal"
            >
              <span>Stage: {filters.lifecycleStage}</span>
              <button
                type="button"
                onClick={() => onFilterChange('lifecycleStage', undefined)}
                className="hover:bg-foreground/10 rounded-full p-0.5 cursor-pointer ml-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}

          {filters.sourceId && (
            <Badge
              variant="secondary"
              className="pl-2 pr-1 py-0.5 text-[11px] flex items-center gap-1 rounded-full font-normal"
            >
              <span>Source: {leadSources.find((s) => s.id === filters.sourceId)?.name || 'Selected'}</span>
              <button
                type="button"
                onClick={() => onFilterChange('sourceId', undefined)}
                className="hover:bg-foreground/10 rounded-full p-0.5 cursor-pointer ml-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}

          {filters.industry && (
            <Badge
              variant="secondary"
              className="pl-2 pr-1 py-0.5 text-[11px] flex items-center gap-1 rounded-full font-normal"
            >
              <span>Industry: {filters.industry}</span>
              <button
                type="button"
                onClick={() => onFilterChange('industry', undefined)}
                className="hover:bg-foreground/10 rounded-full p-0.5 cursor-pointer ml-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}

          {(filters.createdFrom || filters.createdTo) && (
            <Badge
              variant="secondary"
              className="pl-2 pr-1 py-0.5 text-[11px] flex items-center gap-1 rounded-full font-normal"
            >
              <span>
                Created: {filters.createdFrom || '...'} to {filters.createdTo || '...'}
              </span>
              <button
                type="button"
                onClick={() => {
                  onFilterChange('createdFrom', undefined);
                  onFilterChange('createdTo', undefined);
                }}
                className="hover:bg-foreground/10 rounded-full p-0.5 cursor-pointer ml-0.5"
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

export default CustomerToolbar;
