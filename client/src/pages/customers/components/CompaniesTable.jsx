import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MoreHorizontal,
  Eye,
  Edit2,
  Trash2,
  Building2,
  Phone,
  Globe,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Users,
  Briefcase,
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

export function CompaniesTable({
  companies = [],
  meta = {},
  isLoading = false,
  page = 1,
  limit = 25,
  sort = 'name',
  order = 'asc',
  onPageChange,
  onLimitChange,
  onSortChange,
  selectedIds = [],
  onToggleSelectRow,
  onToggleSelectAll,
  onEditCompany,
  onDeleteCompany,
  visibleColumns = {},
}) {
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState(null);

  const isAllSelected =
    companies.length > 0 && companies.every((c) => selectedIds.includes(c.id));
  const isPartiallySelected =
    companies.some((c) => selectedIds.includes(c.id)) && !isAllSelected;

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
                    aria-label="Select all companies"
                  />
                </TableHead>

                <TableHead
                  onClick={() => handleHeaderSort('name')}
                  className="cursor-pointer group select-none min-w-[220px]"
                >
                  <div className="flex items-center">
                    <span>Company Name</span>
                    {renderSortIndicator('name')}
                  </div>
                </TableHead>

                {visibleColumns.industry !== false && (
                  <TableHead
                    onClick={() => handleHeaderSort('industry')}
                    className="cursor-pointer group select-none min-w-[150px]"
                  >
                    <div className="flex items-center">
                      <span>Industry</span>
                      {renderSortIndicator('industry')}
                    </div>
                  </TableHead>
                )}

                {visibleColumns.phone !== false && (
                  <TableHead className="min-w-[130px]">Phone</TableHead>
                )}

                {visibleColumns.counts !== false && (
                  <TableHead className="min-w-[150px]">Contacts / Deals</TableHead>
                )}

                {visibleColumns.tags !== false && (
                  <TableHead className="min-w-[140px]">Tags</TableHead>
                )}

                {visibleColumns.owner !== false && (
                  <TableHead className="min-w-[130px]">Owner</TableHead>
                )}

                {visibleColumns.createdAt !== false && (
                  <TableHead
                    onClick={() => handleHeaderSort('createdAt')}
                    className="cursor-pointer group select-none min-w-[120px]"
                  >
                    <div className="flex items-center">
                      <span>Created</span>
                      {renderSortIndicator('createdAt')}
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
                    {visibleColumns.industry !== false && (
                      <TableCell>
                        <Skeleton className="h-5 w-24 rounded-full" />
                      </TableCell>
                    )}
                    {visibleColumns.phone !== false && (
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                    )}
                    {visibleColumns.counts !== false && (
                      <TableCell>
                        <Skeleton className="h-5 w-24 rounded-full" />
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
                    {visibleColumns.createdAt !== false && (
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    )}
                    <TableCell>
                      <Skeleton className="h-8 w-8 rounded ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : companies.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <div className="max-w-sm mx-auto space-y-2">
                      <p className="font-semibold text-sm text-foreground">No companies found</p>
                      <p className="text-xs">
                        Try adjusting your search criteria, clearing filters, or adding a new company.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                companies.map((company) => {
                  const isSelected = selectedIds.includes(company.id);

                  return (
                    <TableRow
                      key={company.id}
                      data-state={isSelected ? 'selected' : undefined}
                      onClick={() => navigate(`/customers/company/${company.id}`)}
                      className="cursor-pointer hover:bg-muted/40 transition-colors group"
                    >
                      {/* Checkbox */}
                      <TableCell
                        className="px-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => onToggleSelectRow(company.id)}
                          aria-label={`Select ${company.name}`}
                        />
                      </TableCell>

                      {/* Company Info */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-crm bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div className="truncate">
                            <span className="font-medium text-xs text-foreground group-hover:text-primary transition-colors block truncate">
                              {company.name}
                            </span>
                            {company.domain || company.website ? (
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                                <Globe className="h-2.5 w-2.5 opacity-60" />
                                <span>{company.domain || company.website?.replace(/^https?:\/\//, '')}</span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground/60 italic block">
                                No website
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Industry */}
                      {visibleColumns.industry !== false && (
                        <TableCell>
                          {company.industry ? (
                            <Badge
                              variant="outline"
                              className="text-[11px] font-normal bg-muted/30"
                            >
                              {company.industry}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground/60">-</span>
                          )}
                        </TableCell>
                      )}

                      {/* Phone */}
                      {visibleColumns.phone !== false && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {company.phone ? (
                            <a
                              href={`tel:${company.phone}`}
                              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
                            >
                              <Phone className="h-3 w-3 shrink-0 opacity-60" />
                              <span>{company.phone}</span>
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground/60">-</span>
                          )}
                        </TableCell>
                      )}

                      {/* Associated Contacts & Deals Count */}
                      {visibleColumns.counts !== false && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground"
                              title={`${company._count?.contacts || 0} associated contacts`}
                            >
                              <Users className="h-3 w-3 opacity-70" />
                              <span>{company._count?.contacts || 0}</span>
                            </span>
                            <span className="text-muted-foreground/40">•</span>
                            <span
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground"
                              title={`${company._count?.leads || 0} active deals`}
                            >
                              <Briefcase className="h-3 w-3 opacity-70" />
                              <span>{company._count?.leads || 0}</span>
                            </span>
                          </div>
                        </TableCell>
                      )}

                      {/* Tags */}
                      {visibleColumns.tags !== false && (
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {company.tags && company.tags.length > 0 ? (
                              company.tags.slice(0, 2).map((item) => {
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
                            {company.tags && company.tags.length > 2 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{company.tags.length - 2}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      )}

                      {/* Owner */}
                      {visibleColumns.owner !== false && (
                        <TableCell>
                          {company.owner ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={company.owner.avatarUrl} alt={company.owner.name} />
                                <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                  {initials(company.owner.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-foreground font-medium truncate max-w-[90px]">
                                {company.owner.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/60 italic">Unassigned</span>
                          )}
                        </TableCell>
                      )}

                      {/* Created Date */}
                      {visibleColumns.createdAt !== false && (
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(company.createdAt, { formatStr: 'MMM d, yyyy' })}
                          </span>
                        </TableCell>
                      )}

                      {/* Actions */}
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
                              onClick={() => navigate(`/customers/company/${company.id}`)}
                              className="cursor-pointer text-xs gap-2"
                            >
                              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>View 360 Profile</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onEditCompany(company)}
                              className="cursor-pointer text-xs gap-2"
                            >
                              <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>Edit Company</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(company)}
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
              {Math.min(page * limit, meta.total || 0)} of {meta.total || 0} companies
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
        title={`Delete company "${deleteTarget?.name}"?`}
        description="This will soft-delete this company account. Associated contacts and deals will have their company link preserved or archived."
        confirmText="Delete Company"
        variant="destructive"
        onConfirm={async () => {
          if (deleteTarget) {
            await onDeleteCompany(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}

export default CompaniesTable;
