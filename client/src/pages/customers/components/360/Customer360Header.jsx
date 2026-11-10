import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Phone,
  Mail,
  StickyNote,
  CalendarPlus,
  Briefcase,
  Edit2,
  MoreVertical,
  Printer,
  Trash2,
  Building2,
  Globe,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { initials } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export function Customer360Header({
  type = 'contact', // 'contact' | 'company'
  data = {},
  onOpenLogCall,
  onOpenAddNote,
  onOpenScheduleFollowUp,
  onOpenCreateLead,
  onOpenEdit,
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const isContact = type === 'contact';
  const id = data.id;

  const fullName = isContact
    ? `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Unnamed Contact'
    : data.name || 'Unnamed Company';

  const subtitle = isContact
    ? data.jobTitle || 'Customer Profile'
    : data.industry || 'Company Account';

  // Fast direct mailto + auto log activity
  const handleSendEmail = async () => {
    const email = isContact ? data.email : null;
    if (email) {
      window.location.href = `mailto:${email}`;
    }
    try {
      await api.post('/activities', {
        type: 'EMAIL',
        subject: `Email sent to ${fullName}`,
        body: `Direct email sent via mailto client.`,
        contactId: isContact ? id : null,
        companyId: !isContact ? id : null,
        occurredAt: new Date(),
      });
      if (isContact) {
        queryClient.invalidateQueries({ queryKey: queryKeys.contacts.overview(id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.activities.timeline({ contactId: id }) });
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.companies.overview(id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.activities.timeline({ companyId: id }) });
      }
      toast.success('Logged email activity');
    } catch {
      // ignore
    }
  };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (isContact) {
        await api.delete(`/contacts/${id}`);
      } else {
        await api.delete(`/companies/${id}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: isContact ? queryKeys.contacts.all : queryKeys.companies.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(`${isContact ? 'Contact' : 'Company'} deleted successfully`);
      navigate('/customers');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to delete record');
    },
  });

  const getLifecycleBadge = (stage) => {
    switch (stage) {
      case 'CUSTOMER':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-xs font-semibold px-2 py-0.5">
            Customer
          </Badge>
        );
      case 'INACTIVE':
        return (
          <Badge variant="outline" className="bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400 border-slate-200 dark:border-slate-800 text-xs font-semibold px-2 py-0.5">
            Inactive
          </Badge>
        );
      case 'PROSPECT':
      default:
        return (
          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-xs font-semibold px-2 py-0.5">
            Prospect
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link to="/customers" className="hover:text-foreground transition-colors">
          Customers
        </Link>
        <ChevronRight className="h-3.5 w-3.5 opacity-60" />
        <Link
          to={`/customers?tab=${isContact ? 'contacts' : 'companies'}`}
          className="hover:text-foreground transition-colors"
        >
          {isContact ? 'Contacts' : 'Companies'}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 opacity-60" />
        <span className="font-medium text-foreground truncate max-w-xs">{fullName}</span>
      </nav>

      {/* Main Header Banner */}
      <div className="rounded-card border bg-card p-6 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {/* Left: Avatar + Identity */}
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 rounded-full border-2 border-border shadow-xs">
            <AvatarImage src={data.avatarUrl} alt={fullName} />
            <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
              {initials(fullName)}
            </AvatarFallback>
          </Avatar>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{fullName}</h1>
              {isContact && getLifecycleBadge(data.lifecycleStage)}
              {!isContact && (
                <Badge variant="outline" className="bg-muted text-foreground text-xs font-medium">
                  Company Account
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>{subtitle}</span>

              {/* Company link for contacts */}
              {isContact && data.company && (
                <>
                  <span>•</span>
                  <Link
                    to={`/customers/company/${data.company.id}`}
                    className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    <span>{data.company.name}</span>
                  </Link>
                </>
              )}

              {/* Domain / Website for companies */}
              {!isContact && (data.domain || data.website) && (
                <>
                  <span>•</span>
                  <a
                    href={data.website || `https://${data.domain}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    <span>{data.domain || data.website}</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </>
              )}
            </div>

            {/* Tags preview */}
            {data.tags && data.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {data.tags.map((tag) => {
                  const t = tag.tag || tag;
                  return (
                    <Badge
                      key={t.id}
                      variant="outline"
                      className="text-[10px] px-2 py-0 rounded-full font-normal"
                      style={{
                        borderColor: t.color ? `${t.color}40` : undefined,
                        backgroundColor: t.color ? `${t.color}15` : undefined,
                        color: t.color || undefined,
                      }}
                    >
                      {t.name}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Log Call */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenLogCall}
            className="h-8 gap-1.5 rounded-crm text-xs font-medium"
          >
            <Phone className="h-3.5 w-3.5 text-blue-600" />
            <span>Log Call</span>
          </Button>

          {/* Send Email */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSendEmail}
            className="h-8 gap-1.5 rounded-crm text-xs font-medium"
          >
            <Mail className="h-3.5 w-3.5 text-purple-600" />
            <span>Send Email</span>
          </Button>

          {/* Add Note */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenAddNote}
            className="h-8 gap-1.5 rounded-crm text-xs font-medium"
          >
            <StickyNote className="h-3.5 w-3.5 text-amber-600" />
            <span>Add Note</span>
          </Button>

          {/* Schedule Follow-up */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenScheduleFollowUp}
            className="h-8 gap-1.5 rounded-crm text-xs font-medium"
          >
            <CalendarPlus className="h-3.5 w-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Follow-up</span>
          </Button>

          {/* Create Lead */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenCreateLead}
            className="h-8 gap-1.5 rounded-crm text-xs font-medium"
          >
            <Briefcase className="h-3.5 w-3.5 text-primary" />
            <span>New Lead</span>
          </Button>

          {/* Edit */}
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onOpenEdit}
            className="h-8 gap-1.5 rounded-crm text-xs font-medium"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Edit</span>
          </Button>

          {/* More Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-crm"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {isContact && (
                <DropdownMenuItem asChild className="cursor-pointer text-xs gap-2">
                  <a href={`/print/contact/${id}`} target="_blank" rel="noreferrer">
                    <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Printable Report (A4)</span>
                  </a>
                </DropdownMenuItem>
              )}
              {isContact && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={() => setDeleteConfirmOpen(true)}
                className="cursor-pointer text-xs gap-2 text-destructive focus:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete {isContact ? 'Contact' : 'Company'}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={`Delete ${isContact ? 'contact' : 'company'} "${fullName}"?`}
        description={`This will soft-delete this record. Historical timeline interactions and linked data will be safely archived.`}
        confirmText="Confirm Deletion"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={async () => {
          await deleteMutation.mutateAsync();
        }}
      />
    </div>
  );
}

export default Customer360Header;
