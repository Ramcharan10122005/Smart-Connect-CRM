import { useState } from 'react';
import {
  MoreHorizontal,
  Eye,
  Trash2,
  Calendar,
  Sparkles,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  User,
} from 'lucide-react';
import { formatCurrency, formatDate, initials } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export function LeadsTableView({
  leads = [],
  meta = {},
  isLoading = false,
  page = 1,
  limit = 25,
  sort = 'createdAt',
  order = 'desc',
  onPageChange,
  onLimitChange,
  onSortChange,
  onCardClick,
  onDeleteLead,
}) {
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleHeaderSort = (field) => {
    if (sort === field) {
      onSortChange(field, order === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(field, 'asc');
    }
  };

  const renderSortIndicator = (field) => {
    if (sort !== field) {
      return (
        <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
      );
    }
    return order === 'asc' ? (
      <ArrowUp className="ml-1 h-3 w-3 text-primary" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 text-primary" />
    );
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'URGENT':
        return <Badge variant="destructive" className="text-[10px] py-0 px-1.5 font-medium">Urgent</Badge>;
      case 'HIGH':
        return <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-amber-600 border-amber-300 bg-amber-50 font-medium">High</Badge>;
      case 'LOW':
        return <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-muted-foreground font-normal">Low</Badge>;
      case 'MEDIUM':
      default:
        return <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">Med</Badge>;
    }
  };

  const totalPages = meta.totalPages || 1;

  return (
    <div className="space-y-4">
      <div className="rounded-card border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[650px] relative">
          <Table>
            <TableHeader className="sticky top-0 bg-card/95 backdrop-blur-xs z-10 border-b">
              <TableRow className="hover:bg-transparent">
                <TableHead
                  onClick={() => handleHeaderSort('title')}
                  className="cursor-pointer group select-none min-w-[220px]"
                >
                  <div className="flex items-center">
                    <span>Opportunity Title</span>
                    {renderSortIndicator('title')}
                  </div>
                </TableHead>

                <TableHead className="min-w-[170px]">Contact / Company</TableHead>

                <TableHead
                  onClick={() => handleHeaderSort('value')}
                  className="cursor-pointer group select-none min-w-[120px]"
                >
                  <div className="flex items-center">
                    <span>Deal Value</span>
                    {renderSortIndicator('value')}
                  </div>
                </TableHead>

                <TableHead className="min-w-[140px]">Pipeline Stage</TableHead>

                <TableHead className="min-w-[90px]">Priority</TableHead>

                <TableHead
                  onClick={() => handleHeaderSort('score')}
                  className="cursor-pointer group select-none min-w-[90px]"
                >
                  <div className="flex items-center">
                    <span>Score</span>
                    {renderSortIndicator('score')}
                  </div>
                </TableHead>

                <TableHead className="min-w-[130px]">Owner</TableHead>

                <TableHead
                  onClick={() => handleHeaderSort('expectedCloseDate')}
                  className="cursor-pointer group select-none min-w-[130px]"
                >
                  <div className="flex items-center">
                    <span>Target Close</span>
                    {renderSortIndicator('expectedCloseDate')}
                  </div>
                </TableHead>

                <TableHead className="w-12 text-right px-4">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24 rounded-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-12 rounded-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-7 w-7 rounded ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : leads.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <div className="max-w-sm mx-auto space-y-2">
                      <p className="font-semibold text-sm text-foreground">No leads found</p>
                      <p className="text-xs">
                        Try modifying filters or creating a new opportunity.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead) => {
                  const contactName = lead.contact
                    ? `${lead.contact.firstName} ${lead.contact.lastName}`
                    : lead.firstName && lead.lastName
                    ? `${lead.firstName} ${lead.lastName}`
                    : null;
                  const companyName = lead.company?.name || lead.companyName;

                  return (
                    <TableRow
                      key={lead.id}
                      onClick={() => onCardClick(lead)}
                      className="cursor-pointer hover:bg-muted/40 transition-colors group"
                    >
                      {/* Title */}
                      <TableCell>
                        <span className="font-medium text-xs text-foreground group-hover:text-primary transition-colors block truncate max-w-[240px]">
                          {lead.title}
                        </span>
                      </TableCell>

                      {/* Contact / Company */}
                      <TableCell>
                        <div className="space-y-0.5 text-xs truncate max-w-[180px]">
                          {contactName && (
                            <div className="flex items-center gap-1.5 truncate text-foreground font-medium">
                              <User className="h-3 w-3 shrink-0 opacity-60" />
                              <span className="truncate">{contactName}</span>
                            </div>
                          )}
                          {companyName && (
                            <div className="flex items-center gap-1.5 truncate text-muted-foreground text-[11px]">
                              <Building2 className="h-3 w-3 shrink-0 opacity-60" />
                              <span className="truncate">{companyName}</span>
                            </div>
                          )}
                          {!contactName && !companyName && (
                            <span className="text-muted-foreground/60 italic">-</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Deal Value */}
                      <TableCell>
                        <span className="font-bold text-xs text-foreground">
                          {formatCurrency(lead.value || 0, lead.currency)}
                        </span>
                      </TableCell>

                      {/* Stage Badge */}
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: lead.stage?.color || '#4F46E5' }}
                          />
                          <span className="text-xs font-medium truncate">
                            {lead.stage?.name || 'Open'}
                          </span>
                        </div>
                      </TableCell>

                      {/* Priority */}
                      <TableCell>{getPriorityBadge(lead.priority)}</TableCell>

                      {/* Score */}
                      <TableCell>
                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-bold">
                          <Sparkles className="h-2.5 w-2.5 text-primary" />
                          <span>{lead.score ?? 50}</span>
                        </div>
                      </TableCell>

                      {/* Owner */}
                      <TableCell>
                        {lead.owner ? (
                          <div className="flex items-center gap-1.5 truncate">
                            <Avatar className="h-5 w-5 shrink-0">
                              <AvatarImage src={lead.owner.avatarUrl} alt={lead.owner.name} />
                              <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                {initials(lead.owner.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-foreground truncate max-w-[90px]">
                              {lead.owner.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/60 italic">Unassigned</span>
                        )}
                      </TableCell>

                      {/* Expected Close Date */}
                      <TableCell>
                        {lead.expectedCloseDate ? (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3 opacity-60 shrink-0" />
                            <span>{formatDate(lead.expectedCloseDate, { formatStr: 'MMM d, yyyy' })}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/60 italic">-</span>
                        )}
                      </TableCell>

                      {/* Row Actions */}
                      <TableCell className="text-right px-4" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-crm opacity-70 hover:opacity-100 cursor-pointer"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              onClick={() => onCardClick(lead)}
                              className="cursor-pointer text-xs gap-2"
                            >
                              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>View Opportunity</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(lead)}
                              className="cursor-pointer text-xs gap-2 text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 border-t bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              Showing {meta.total ? (page - 1) * limit + 1 : 0} to{' '}
              {Math.min(page * limit, meta.total || 0)} of {meta.total || 0} deals
            </span>

            <div className="flex items-center gap-1.5 ml-2">
              <span>Rows per page:</span>
              <Select
                value={String(limit)}
                onValueChange={(val) => onLimitChange(Number(val))}
              >
                <SelectTrigger className="h-7 w-16 text-xs rounded-crm bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs rounded-crm"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
              >
                Previous
              </Button>
              <div className="px-2 font-medium text-xs">
                Page {page} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs rounded-crm"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(isOpen) => !isOpen && setDeleteTarget(null)}
        title={`Delete lead "${deleteTarget?.title}"?`}
        description="This will soft-delete this deal from the pipeline. Historical activities remain linked to any connected customer records."
        confirmText="Delete Lead"
        variant="destructive"
        onConfirm={async () => {
          if (deleteTarget) {
            await onDeleteLead(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}

export default LeadsTableView;
