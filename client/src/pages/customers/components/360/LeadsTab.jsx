import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Plus, Calendar } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreateLeadDialog } from './CreateLeadDialog';

export function LeadsTab({
  leads = [],
  contactId = null,
  companyId = null,
  contactName = null,
  companyName = null,
}) {
  const [createLeadOpen, setCreateLeadOpen] = useState(false);

  const openLeads = leads.filter((l) => l.stage?.type === 'OPEN' || !l.stage?.type);
  const closedLeads = leads.filter(
    (l) => l.stage?.type === 'WON' || l.stage?.type === 'LOST'
  );

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'URGENT':
        return <Badge variant="destructive" className="text-[10px] py-0 px-1.5">Urgent</Badge>;
      case 'HIGH':
        return <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/40">High</Badge>;
      case 'LOW':
        return <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-muted-foreground">Low</Badge>;
      case 'MEDIUM':
      default:
        return <Badge variant="outline" className="text-[10px] py-0 px-1.5">Medium</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with New Lead Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm text-foreground">Pipeline Opportunities</h3>
          <p className="text-xs text-muted-foreground">
            {leads.length} total deal{leads.length !== 1 ? 's' : ''} associated with this account.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setCreateLeadOpen(true)}
          className="h-8 gap-1.5 text-xs rounded-crm font-medium shadow-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Lead</span>
        </Button>
      </div>

      {/* Zero State */}
      {leads.length === 0 ? (
        <div className="rounded-card border border-dashed p-10 text-center text-muted-foreground space-y-3">
          <Briefcase className="h-8 w-8 mx-auto opacity-40" />
          <div className="space-y-1">
            <h4 className="font-semibold text-sm text-foreground">No leads created yet</h4>
            <p className="text-xs max-w-sm mx-auto">
              Start tracking a deal or contract opportunity with this customer.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateLeadOpen(true)}
            className="text-xs"
          >
            Create First Lead
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 1. Open Deals */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Active Opportunities ({openLeads.length})
              </span>
              <div className="h-px bg-border flex-1" />
            </div>

            {openLeads.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 italic py-2">No active open leads.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {openLeads.map((lead) => (
                  <Link
                    key={lead.id}
                    to="/leads"
                    className="rounded-card border bg-card p-4 shadow-xs hover:border-primary/50 transition-all block group space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 truncate">
                        <span className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors block truncate">
                          {lead.title}
                        </span>
                        <span className="font-bold text-sm text-foreground">
                          {formatCurrency(lead.value || 0)}
                        </span>
                      </div>
                      {getPriorityBadge(lead.priority)}
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: lead.stage?.color || '#4F46E5' }}
                        />
                        <span className="font-medium text-[11px]">{lead.stage?.name || 'Open'}</span>
                      </div>

                      {lead.expectedCloseDate && (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3 opacity-60" />
                          <span>Close: {formatDate(lead.expectedCloseDate, { formatStr: 'MMM d' })}</span>
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 2. Closed / Won Deals */}
          {closedLeads.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Past / Closed Deals ({closedLeads.length})
                </span>
                <div className="h-px bg-border flex-1" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {closedLeads.map((lead) => {
                  const isWon = lead.stage?.type === 'WON';
                  return (
                    <div
                      key={lead.id}
                      className="rounded-card border bg-muted/20 p-3.5 space-y-2 opacity-80"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-xs truncate">{lead.title}</span>
                        <Badge
                          variant="outline"
                          className={
                            isWon
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px]'
                              : 'bg-rose-50 text-rose-700 border-rose-300 text-[10px]'
                          }
                        >
                          {lead.stage?.name || (isWon ? 'Won' : 'Lost')}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          {formatCurrency(lead.value || 0)}
                        </span>
                        <span>{formatDate(lead.updatedAt || lead.createdAt, { formatStr: 'MMM yyyy' })}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Lead Modal */}
      <CreateLeadDialog
        open={createLeadOpen}
        onOpenChange={setCreateLeadOpen}
        contactId={contactId}
        companyId={companyId}
        contactName={contactName}
        companyName={companyName}
      />
    </div>
  );
}

export default LeadsTab;
