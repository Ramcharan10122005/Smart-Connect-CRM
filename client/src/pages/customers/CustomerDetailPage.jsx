import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  History,
  Briefcase,
  CalendarClock,
  StickyNote,
  Users,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Customer360Header } from './components/360/Customer360Header';
import { CustomerLeftSidebar } from './components/360/CustomerLeftSidebar';
import { TimelineTab } from './components/360/TimelineTab';
import { LeadsTab } from './components/360/LeadsTab';
import { FollowUpsTab } from './components/360/FollowUpsTab';
import { NotesTab } from './components/360/NotesTab';
import { CompanyContactsTab } from './components/360/CompanyContactsTab';
import { LogActivityDialog } from './components/360/LogActivityDialog';
import { ScheduleFollowUpDialog } from './components/360/ScheduleFollowUpDialog';
import { CreateLeadDialog } from './components/360/CreateLeadDialog';
import { ContactSheet } from './components/ContactSheet';
import { CompanySheet } from './components/CompanySheet';
import { EmailComposerModal } from '@/components/email/EmailComposerModal';

export default function CustomerDetailPage() {
  const { type = 'contact', id } = useParams();
  const navigate = useNavigate();

  const isContact = type === 'contact';

  // Modal Triggers
  const [logCallOpen, setLogCallOpen] = useState(false);
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [scheduleFollowUpOpen, setScheduleFollowUpOpen] = useState(false);
  const [createLeadOpen, setCreateLeadOpen] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [emailComposerOpen, setEmailComposerOpen] = useState(false);

  // Active Tab State
  const [activeTab, setActiveTab] = useState('timeline');

  // Query Overview
  const {
    data: overviewData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: isContact ? queryKeys.contacts.overview(id) : queryKeys.companies.overview(id),
    queryFn: async () => {
      const endpoint = isContact ? `/contacts/${id}/overview` : `/companies/${id}/overview`;
      const res = await api.get(endpoint);
      return res.data?.data;
    },
    retry: 1,
  });

  // Loading Skeletons
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-28 w-full rounded-card" />
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <Skeleton className="h-56 w-full rounded-card" />
            <Skeleton className="h-32 w-full rounded-card" />
            <Skeleton className="h-40 w-full rounded-card" />
          </div>
          <div className="lg:col-span-7 space-y-4">
            <Skeleton className="h-10 w-96 rounded-crm" />
            <Skeleton className="h-32 w-full rounded-card" />
            <Skeleton className="h-64 w-full rounded-card" />
          </div>
        </div>
      </div>
    );
  }

  // Not Found State
  if (isError || !overviewData) {
    return (
      <div className="min-h-[500px] flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight">Record Not Found</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The {isContact ? 'contact' : 'company'} you requested does not exist, has been deleted, or you don&apos;t have access to view it.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => navigate('/customers')}
            className="gap-2 text-xs rounded-crm"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Customers
          </Button>
        </div>
      </div>
    );
  }

  // Unpack overview data
  const record = isContact ? overviewData.contact : overviewData;
  const summaryStats = isContact
    ? overviewData.summaryStats || {}
    : {
        totalInteractions: overviewData.activities?.length || 0,
        lastContactedAt: overviewData.activities?.[0]?.occurredAt || null,
        daysSinceLastContact: overviewData.activities?.[0]?.occurredAt
          ? Math.max(
              0,
              Math.floor(
                (Date.now() - new Date(overviewData.activities[0].occurredAt).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            )
          : null,
        openPipelineValue: (overviewData.leads || [])
          .filter((l) => l.stage?.type === 'OPEN' || !l.stage?.type)
          .reduce((sum, l) => sum + Number(l.value || 0), 0),
      };

  const leads = isContact ? overviewData.openLeads || [] : overviewData.leads || [];
  const companyContacts = !isContact ? overviewData.contacts || [] : [];

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <Customer360Header
        type={type}
        data={record}
        onOpenLogCall={() => setLogCallOpen(true)}
        onOpenSendEmail={() => setEmailComposerOpen(true)}
        onOpenAddNote={() => setAddNoteOpen(true)}
        onOpenScheduleFollowUp={() => setScheduleFollowUpOpen(true)}
        onOpenCreateLead={() => setCreateLeadOpen(true)}
        onOpenEdit={() => setEditSheetOpen(true)}
      />

      {/* 2. Main 360 Grid: Left (30%) + Tabs (70%) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
        {/* Left Column (30%) */}
        <div className="lg:col-span-3">
          <CustomerLeftSidebar
            type={type}
            data={record}
            summaryStats={summaryStats}
          />
        </div>

        {/* Main Column Tabs (70%) */}
        <div className="lg:col-span-7 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="bg-muted/60 p-1 rounded-crm w-full sm:w-auto flex flex-wrap justify-start">
              {/* Timeline Tab */}
              <TabsTrigger
                value="timeline"
                className="gap-1.5 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-xs rounded-crm"
              >
                <History className="h-3.5 w-3.5 text-primary" />
                <span>Timeline</span>
              </TabsTrigger>

              {/* Leads Tab */}
              <TabsTrigger
                value="leads"
                className="gap-1.5 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-xs rounded-crm"
              >
                <Briefcase className="h-3.5 w-3.5" />
                <span>Deals & Leads</span>
                {leads.length > 0 && (
                  <span className="text-[10px] ml-1 bg-muted px-1.5 py-0.2 rounded-full font-normal">
                    {leads.length}
                  </span>
                )}
              </TabsTrigger>

              {/* Follow-ups Tab */}
              <TabsTrigger
                value="followups"
                className="gap-1.5 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-xs rounded-crm"
              >
                <CalendarClock className="h-3.5 w-3.5" />
                <span>Follow-ups</span>
              </TabsTrigger>

              {/* Notes Tab */}
              <TabsTrigger
                value="notes"
                className="gap-1.5 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-xs rounded-crm"
              >
                <StickyNote className="h-3.5 w-3.5 text-amber-500" />
                <span>Notes</span>
              </TabsTrigger>

              {/* Company Contacts Tab (Only for companies) */}
              {!isContact && (
                <TabsTrigger
                  value="contacts"
                  className="gap-1.5 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-xs rounded-crm"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>People ({companyContacts.length})</span>
                </TabsTrigger>
              )}
            </TabsList>

            {/* Timeline Tab Content */}
            <TabsContent value="timeline" className="mt-0 focus-visible:outline-none">
              <TimelineTab
                contactId={isContact ? id : null}
                companyId={!isContact ? id : null}
              />
            </TabsContent>

            {/* Leads Tab Content */}
            <TabsContent value="leads" className="mt-0 focus-visible:outline-none">
              <LeadsTab
                leads={leads}
                contactId={isContact ? id : null}
                companyId={!isContact ? id : null}
                contactName={isContact ? `${record.firstName} ${record.lastName}` : null}
                companyName={!isContact ? record.name : record.company?.name}
              />
            </TabsContent>

            {/* Follow-ups Tab Content */}
            <TabsContent value="followups" className="mt-0 focus-visible:outline-none">
              <FollowUpsTab
                contactId={isContact ? id : null}
              />
            </TabsContent>

            {/* Notes Tab Content */}
            <TabsContent value="notes" className="mt-0 focus-visible:outline-none">
              <NotesTab
                contactId={isContact ? id : null}
                companyId={!isContact ? id : null}
              />
            </TabsContent>

            {/* Company Contacts Tab Content (Companies only) */}
            {!isContact && (
              <TabsContent value="contacts" className="mt-0 focus-visible:outline-none">
                <CompanyContactsTab
                  contacts={companyContacts}
                  company={record}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      {/* Dialogs */}
      {/* 1. Log Activity Dialog (Call / Note / Email / Meeting) */}
      <LogActivityDialog
        open={logCallOpen}
        onOpenChange={setLogCallOpen}
        defaultType="CALL"
        contactId={isContact ? id : null}
        companyId={!isContact ? id : null}
      />

      <LogActivityDialog
        open={addNoteOpen}
        onOpenChange={setAddNoteOpen}
        defaultType="NOTE"
        contactId={isContact ? id : null}
        companyId={!isContact ? id : null}
      />

      {/* 2. Schedule Follow-up Dialog */}
      <ScheduleFollowUpDialog
        open={scheduleFollowUpOpen}
        onOpenChange={setScheduleFollowUpOpen}
        contactId={isContact ? id : null}
      />

      {/* 3. Create Lead Dialog */}
      <CreateLeadDialog
        open={createLeadOpen}
        onOpenChange={setCreateLeadOpen}
        contactId={isContact ? id : null}
        companyId={!isContact ? id : null}
        contactName={isContact ? `${record.firstName} ${record.lastName}` : null}
        companyName={!isContact ? record.name : record.company?.name}
      />

      {/* 4. Edit Sheet (Contact or Company) */}
      {isContact ? (
        <ContactSheet
          open={editSheetOpen}
          onOpenChange={setEditSheetOpen}
          contact={record}
        />
      ) : (
        <CompanySheet
          open={editSheetOpen}
          onOpenChange={setEditSheetOpen}
          company={record}
        />
      )}

      {/* 5. Email Composer Dialog */}
      <EmailComposerModal
        open={emailComposerOpen}
        onOpenChange={setEmailComposerOpen}
        contact={isContact ? record : null}
        defaultTo={!isContact && record.contacts?.[0]?.email ? record.contacts[0].email : ''}
      />
    </div>
  );
}
