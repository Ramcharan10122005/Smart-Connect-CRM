import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MoreHorizontal,
  Eye,
  Edit2,
  Trash2,
  Printer,
  Building2,
  Phone,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Clock,
} from 'lucide-react';
import { formatDate, initials } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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

export function ContactsTable({
  contacts = [],
  meta = {},
  isLoading = false,
  page = 1,
  limit = 25,
  sort = 'lastName',
  order = 'asc',
  onPageChange,
  onLimitChange,
  onSortChange,
  selectedIds = [],
  onToggleSelectRow,
  onToggleSelectAll,
  onEditContact,
  onDeleteContact,
  visibleColumns = {},
}) {
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState(null);

  const isAllSelected =
    contacts.length > 0 && contacts.every((c) => selectedIds.includes(c.id));
  const isPartiallySelected =
    contacts.some((c) => selectedIds.includes(c.id)) && !isAllSelected;

  const handleHeaderSort = (field) => {
    if (sort === field) {
      onSortChange(field, order === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(field, 'asc');
    }
  };

  const renderSortIndicator = (field) => {
    if (sort !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return order === 'asc' ? (
      <ArrowUp className="ml-1 h-3 w-3 text-primary" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 text-primary" />
    );
  };

  const getLifecycleBadge = (stage) => {
    switch (stage) {
      case 'CUSTOMER':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[11px] font-medium">
            Customer
          </Badge>
        );
      case 'INACTIVE':
        return (
          <Badge variant="outline" className="bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400 border-slate-200 dark:border-slate-800 text-[11px] font-medium">
            Inactive
          </Badge>
        );
      case 'PROSPECT':
      default:
        return (
          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[11px] font-medium">
            Prospect
          </Badge>
        );
    }
  };

  const totalPages = meta.totalPages || 1;

  return (
    <div className="space-y-4">
      {/* Table Container with Sticky Header */}
      <div className="rounded-card border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[650px] relative">
          <Table>
            <TableHeader className="sticky top-0 bg-card/95 backdrop-blur-xs z-10 border-b">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10 px-3 text-center">
                  <Checkbox
                    checked={isAllSelected ? true : isPartiallySelected ? 'indeterminate' : false}
                    onCheckedChange={onToggleSelectAll}
                    aria-label="Select all contacts"
                  />
                </TableHead>

                <TableHead
                  onClick={() => handleHeaderSort('lastName')}
                  className="cursor-pointer group select-none min-w-[220px]"
                >
                  <div className="flex items-center">
                    <span>Contact Name</span>
                    {renderSortIndicator('lastName')}
                  </div>
                </TableHead>

                {visibleColumns.company !== false && (
                  <TableHead className="min-w-[170px]">Company</TableHead>
                )}

                {visibleColumns.phone !== false && (
                  <TableHead className="min-w-[130px]">Phone</TableHead>
                )}

                {visibleColumns.lifecycleStage !== false && (
                  <TableHead
                    onClick={() => handleHeaderSort('lifecycleStage')}
                    className="cursor-pointer group select-none min-w-[110px]"
                  >
                    <div className="flex items-center">
                      <span>Lifecycle</span>
                      {renderSortIndicator('lifecycleStage')}
                    </div>
                  </TableHead>
                )}

                {visibleColumns.tags !== false && (
                  <TableHead className="min-w-[140px]">Tags</TableHead>
                )}

                {visibleColumns.owner !== false && (
                  <TableHead className="min-w-[130px]">Owner</TableHead>
                )}

                {visibleColumns.lastContacted !== false && (
                  <TableHead
                    onClick={() => handleHeaderSort('lastContactedAt')}
                    className="cursor-pointer group select-none min-w-[130px]"
                  >
                    <div className="flex items-center">
                      <span>Last Contacted</span>
                      {renderSortIndicator('lastContactedAt')}
                    </div>
                  </TableHead>
                )}

                <TableHead className="w-12 text-right px-4">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="px-3 text-center">
                      <Skeleton className="h-4 w-4 mx-auto rounded" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                      </div>
                    </TableCell>
                    {visibleColumns.company !== false && (
                      <TableCell>
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                    )}
                    {visibleColumns.phone !== false && (
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                    )}
                    {visibleColumns.lifecycleStage !== false && (
                      <TableCell>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </TableCell>
                    )}
                    {visibleColumns.tags !== false && (
                      <TableCell>
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </TableCell>
                    )}
                    {visibleColumns.owner !== false && (
                      <TableCell>
                        <Skeleton className="h-6 w-20" />
                      </TableCell>
                    )}
                    {visibleColumns.lastContacted !== false && (
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    )}
                    <TableCell>
                      <Skeleton className="h-8 w-8 rounded ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : contacts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <div className="max-w-sm mx-auto space-y-2">
                      <p className="font-semibold text-sm text-foreground">No contacts found</p>
                      <p className="text-xs">
                        Try adjusting your search query, clearing filters, or adding a new contact.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                contacts.map((contact) => {
                  const isSelected = selectedIds.includes(contact.id);
                  const fullName = `${contact.firstName} ${contact.lastName}`;

                  return (
                    <TableRow
                      key={contact.id}
                      data-state={isSelected ? 'selected' : undefined}
                      onClick={() => navigate(`/customers/contact/${contact.id}`)}
                      className="cursor-pointer hover:bg-muted/40 transition-colors group"
                    >
                      {/* Checkbox */}
                      <TableCell
                        className="px-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => onToggleSelectRow(contact.id)}
                          aria-label={`Select ${fullName}`}
                        />
                      </TableCell>

                      {/* Contact Info (Avatar + Name + Email) */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 shrink-0 border border-border">
                            <AvatarFallback className="text-[11px] font-semibold bg-primary/10 text-primary">
                              {initials(fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="truncate">
                            <span className="font-medium text-xs text-foreground group-hover:text-primary transition-colors block truncate">
                              {fullName}
                            </span>
                            {contact.email ? (
                              <span className="text-[11px] text-muted-foreground block truncate">
                                {contact.email}
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground/60 italic block">
                                No email
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Company */}
                      {visibleColumns.company !== false && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {contact.company ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/customers/company/${contact.company.id}`)}
                              className="text-xs font-medium hover:text-primary transition-colors flex items-center gap-1.5 truncate max-w-[160px] text-left cursor-pointer"
                            >
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate">{contact.company.name}</span>
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground/60">-</span>
                          )}
                        </TableCell>
                      )}

                      {/* Phone */}
                      {visibleColumns.phone !== false && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {contact.phone ? (
                            <a
                              href={`tel:${contact.phone}`}
                              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
                            >
                              <Phone className="h-3 w-3 shrink-0 opacity-60" />
                              <span>{contact.phone}</span>
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground/60">-</span>
                          )}
                        </TableCell>
                      )}

                      {/* Lifecycle Stage */}
                      {visibleColumns.lifecycleStage !== false && (
                        <TableCell>{getLifecycleBadge(contact.lifecycleStage)}</TableCell>
                      )}

                      {/* Tags */}
                      {visibleColumns.tags !== false && (
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {contact.tags && contact.tags.length > 0 ? (
                              contact.tags.slice(0, 2).map((item) => {
                                const tag = item.tag || item;
                                return (
                                  <Badge
                                    key={tag.id}
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0 rounded-full font-normal"
                                    style={{
                                      borderColor: tag.color ? `${tag.color}40` : undefined,
                                      backgroundColor: tag.color ? `${tag.color}15` : undefined,
                                      color: tag.color || undefined,
                                    }}
                                  >
                                    {tag.name}
                                  </Badge>
                                );
                              })
                            ) : (
                              <span className="text-xs text-muted-foreground/60">-</span>
                            )}
                            {contact.tags && contact.tags.length > 2 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{contact.tags.length - 2}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      )}

                      {/* Owner */}
                      {visibleColumns.owner !== false && (
                        <TableCell>
                          {contact.owner ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={contact.owner.avatarUrl} alt={contact.owner.name} />
                                <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                  {initials(contact.owner.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-foreground font-medium truncate max-w-[90px]">
                                {contact.owner.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/60 italic">Unassigned</span>
                          )}
                        </TableCell>
                      )}

                      {/* Last Contacted */}
                      {visibleColumns.lastContacted !== false && (
                        <TableCell>
                          {contact.lastContactedAt ? (
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5" title={formatDate(contact.lastContactedAt)}>
                              <Clock className="h-3 w-3 shrink-0 opacity-60" />
                              <span>{formatDate(contact.lastContactedAt, { relative: true })}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/60 italic">Never</span>
                          )}
                        </TableCell>
                      )}

                      {/* Row Actions Menu */}
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
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onClick={() => navigate(`/customers/contact/${contact.id}`)}
                              className="cursor-pointer text-xs gap-2"
                            >
                              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>View 360 Profile</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onEditContact(contact)}
                              className="cursor-pointer text-xs gap-2"
                            >
                              <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>Edit Contact</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              asChild
                              className="cursor-pointer text-xs gap-2"
                            >
                              <a
                                href={`/print/contact/${contact.id}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>Printable Report</span>
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(contact)}
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

        {/* Footer Pagination Bar */}
        <div className="p-3 border-t bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              Showing {meta.total ? (page - 1) * limit + 1 : 0} to{' '}
              {Math.min(page * limit, meta.total || 0)} of {meta.total || 0} contacts
            </span>

            {/* Page Size Selector */}
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

          {/* Pagination Controls */}
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(isOpen) => !isOpen && setDeleteTarget(null)}
        title={`Delete contact "${deleteTarget?.firstName} ${deleteTarget?.lastName}"?`}
        description="This will soft-delete this contact. All associated deals and historical activities remain safe in the system."
        confirmText="Delete Contact"
        variant="destructive"
        onConfirm={async () => {
          if (deleteTarget) {
            await onDeleteContact(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}

export default ContactsTable;
