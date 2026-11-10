import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckSquare,
  UserCheck,
  Tag as TagIcon,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export function BulkActionBar({
  entityType = 'contacts', // 'contacts' | 'companies'
  selectedIds = [],
  onClearSelection,
}) {
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Load team users for assign owner
  const { data: usersData } = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: async () => {
      const res = await api.get('/users?limit=100');
      return res.data?.data || [];
    },
  });
  const users = usersData || [];

  // Load tags for add tag
  const { data: tagsData } = useQuery({
    queryKey: queryKeys.tags.all,
    queryFn: async () => {
      const res = await api.get('/tags');
      return res.data?.data || [];
    },
  });
  const tags = tagsData || [];

  // Bulk action mutation
  const bulkMutation = useMutation({
    mutationFn: async ({ action, ownerId, tagId }) => {
      const endpoint = entityType === 'contacts' ? '/contacts/bulk' : '/companies/bulk';
      const idField = entityType === 'contacts' ? 'contactIds' : 'companyIds';

      const payload = {
        action,
        [idField]: selectedIds,
      };
      if (ownerId) payload.ownerId = ownerId;
      if (tagId) payload.tagId = tagId;

      const res = await api.post(endpoint, payload);
      return res.data?.data;
    },
    onSuccess: (data) => {
      if (entityType === 'contacts') {
        queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(
        data?.message || `Updated ${selectedIds.length} ${entityType}`
      );
      onClearSelection();
      setDeleteDialogOpen(false);
    },
    onError: (err) => {
      toast.error(err.message || 'Bulk operation failed');
    },
  });

  if (selectedIds.length === 0) return null;

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-5 duration-200">
        <div className="bg-popover text-popover-foreground border border-border shadow-2xl rounded-full px-4 py-2 flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 pl-1 pr-2 border-r border-border text-xs font-semibold">
            <CheckSquare className="h-4 w-4 text-primary" />
            <span>
              {selectedIds.length} {entityType} selected
            </span>
          </div>

          {/* Assign Owner Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1.5 rounded-full"
                disabled={bulkMutation.isPending}
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Assign Owner</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-52">
              <DropdownMenuLabel className="text-xs">Select New Owner</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {users.map((u) => (
                <DropdownMenuItem
                  key={u.id}
                  onClick={() => bulkMutation.mutate({ action: 'assign_owner', ownerId: u.id })}
                  className="cursor-pointer text-xs"
                >
                  <span className="font-medium truncate">{u.name}</span>
                  <span className="text-muted-foreground ml-auto text-[10px]">({u.role})</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Add Tag Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1.5 rounded-full"
                disabled={bulkMutation.isPending}
              >
                <TagIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Add Tag</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-48">
              <DropdownMenuLabel className="text-xs">Attach Tag</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {tags.map((t) => (
                <DropdownMenuItem
                  key={t.id}
                  onClick={() => bulkMutation.mutate({ action: 'add_tag', tagId: t.id })}
                  className="cursor-pointer text-xs flex items-center gap-2"
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: t.color || '#4F46E5' }}
                  />
                  <span className="truncate">{t.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Delete Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={bulkMutation.isPending}
            className="h-8 text-xs gap-1.5 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Delete</span>
          </Button>

          {/* Clear Selection */}
          <button
            type="button"
            onClick={onClearSelection}
            className="p-1 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground cursor-pointer ml-1"
            title="Deselect all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Confirm Deletion Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={`Delete ${selectedIds.length} ${entityType}?`}
        description={`This will soft-delete the selected ${selectedIds.length} record(s). They will no longer appear in directories or active searches.`}
        confirmText={bulkMutation.isPending ? 'Deleting...' : 'Delete Selected'}
        variant="destructive"
        loading={bulkMutation.isPending}
        onConfirm={async () => {
          await bulkMutation.mutateAsync({ action: 'delete' });
        }}
      />
    </>
  );
}

export default BulkActionBar;
