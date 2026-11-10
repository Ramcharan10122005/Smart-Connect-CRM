import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Users, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CustomerToolbar } from './components/CustomerToolbar';
import { ContactsTable } from './components/ContactsTable';
import { CompaniesTable } from './components/CompaniesTable';
import { ContactSheet } from './components/ContactSheet';
import { CompanySheet } from './components/CompanySheet';
import { CsvImportWizardDialog } from './components/CsvImportWizardDialog';
import { BulkActionBar } from './components/BulkActionBar';

const CONTACT_COLUMNS = [
  { id: 'company', label: 'Company' },
  { id: 'phone', label: 'Phone' },
  { id: 'lifecycleStage', label: 'Lifecycle Stage' },
  { id: 'tags', label: 'Tags' },
  { id: 'owner', label: 'Owner' },
  { id: 'lastContacted', label: 'Last Contacted' },
];

const COMPANY_COLUMNS = [
  { id: 'industry', label: 'Industry' },
  { id: 'phone', label: 'Phone' },
  { id: 'counts', label: 'Contacts / Deals' },
  { id: 'tags', label: 'Tags' },
  { id: 'owner', label: 'Owner' },
  { id: 'createdAt', label: 'Created At' },
];

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab state: 'contacts' | 'companies'
  const activeTab = searchParams.get('tab') || 'contacts';
  const setActiveTab = (tab) => {
    setSearchParams((prev) => {
      const updated = new URLSearchParams(prev);
      updated.set('tab', tab);
      return updated;
    });
    setSelectedContactIds([]);
    setSelectedCompanyIds([]);
  };

  // Contacts Table State
  const [contactSearch, setContactSearch] = useState('');
  const [contactFilters, setContactFilters] = useState({});
  const [contactPage, setContactPage] = useState(1);
  const [contactLimit, setContactLimit] = useState(25);
  const [contactSort, setContactSort] = useState('lastName');
  const [contactOrder, setContactOrder] = useState('asc');
  const [selectedContactIds, setSelectedContactIds] = useState([]);

  // Companies Table State
  const [companySearch, setCompanySearch] = useState('');
  const [companyFilters, setCompanyFilters] = useState({});
  const [companyPage, setCompanyPage] = useState(1);
  const [companyLimit, setCompanyLimit] = useState(25);
  const [companySort, setCompanySort] = useState('name');
  const [companyOrder, setCompanyOrder] = useState('asc');
  const [selectedCompanyIds, setSelectedCompanyIds] = useState([]);

  // Column Visibility States
  const [contactColVisibility, setContactColVisibility] = useState({
    company: true,
    phone: true,
    lifecycleStage: true,
    tags: true,
    owner: true,
    lastContacted: true,
  });

  const [companyColVisibility, setCompanyColVisibility] = useState({
    industry: true,
    phone: true,
    counts: true,
    tags: true,
    owner: true,
    createdAt: true,
  });

  // Modal / Sheet States
  const [contactSheetOpen, setContactSheetOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);

  const [companySheetOpen, setCompanySheetOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);

  const [importWizardOpen, setImportWizardOpen] = useState(false);

  // 1. Fetch Contacts Query
  const contactQueryParams = {
    page: contactPage,
    limit: contactLimit,
    sort: contactSort,
    order: contactOrder,
    search: contactSearch || undefined,
    ...contactFilters,
  };

  const {
    data: contactsResponse,
    isLoading: isContactsLoading,
  } = useQuery({
    queryKey: queryKeys.contacts.list(contactQueryParams),
    queryFn: async () => {
      const cleanParams = Object.fromEntries(
        Object.entries(contactQueryParams).filter(
          ([_, v]) => v !== undefined && v !== null && v !== ''
        )
      );
      const res = await api.get('/contacts', { params: cleanParams });
      return res.data;
    },
    keepPreviousData: true,
  });

  const contactsList = contactsResponse?.data || [];
  const contactsMeta = contactsResponse?.meta || {};

  // 2. Fetch Companies Query
  const companyQueryParams = {
    page: companyPage,
    limit: companyLimit,
    sort: companySort,
    order: companyOrder,
    search: companySearch || undefined,
    ...companyFilters,
  };

  const {
    data: companiesResponse,
    isLoading: isCompaniesLoading,
  } = useQuery({
    queryKey: queryKeys.companies.list(companyQueryParams),
    queryFn: async () => {
      const cleanParams = Object.fromEntries(
        Object.entries(companyQueryParams).filter(
          ([_, v]) => v !== undefined && v !== null && v !== ''
        )
      );
      const res = await api.get('/companies', { params: cleanParams });
      return res.data;
    },
    keepPreviousData: true,
  });

  const companiesList = companiesResponse?.data || [];
  const companiesMeta = companiesResponse?.meta || {};

  // Contacts single delete
  const deleteContactMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/contacts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Contact deleted successfully');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to delete contact');
    },
  });

  // Companies single delete
  const deleteCompanyMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/companies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Company deleted successfully');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to delete company');
    },
  });

  // Toggle selection helpers
  const handleToggleContactRow = (id) => {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleContactAll = () => {
    const pageIds = contactsList.map((c) => c.id);
    const isAll = pageIds.every((id) => selectedContactIds.includes(id));
    if (isAll) {
      setSelectedContactIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedContactIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleToggleCompanyRow = (id) => {
    setSelectedCompanyIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleCompanyAll = () => {
    const pageIds = companiesList.map((c) => c.id);
    const isAll = pageIds.every((id) => selectedCompanyIds.includes(id));
    if (isAll) {
      setSelectedCompanyIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedCompanyIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Customers"
        description="Unified directory of individuals and company accounts with lifecycle filters and bulk actions."
      />

      {/* Main Tabs Container */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <TabsList className="bg-muted/60 p-1 rounded-crm">
            <TabsTrigger
              value="contacts"
              className="gap-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-xs rounded-crm"
            >
              <Users className="h-3.5 w-3.5" />
              <span>Contacts</span>
              <Badge
                variant="secondary"
                className="h-4.5 px-1.5 text-[10px] rounded-full font-medium"
              >
                {contactsMeta.total !== undefined ? contactsMeta.total : '...'}
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value="companies"
              className="gap-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-xs rounded-crm"
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Companies</span>
              <Badge
                variant="secondary"
                className="h-4.5 px-1.5 text-[10px] rounded-full font-medium"
              >
                {companiesMeta.total !== undefined ? companiesMeta.total : '...'}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Contacts Tab Content */}
        <TabsContent value="contacts" className="space-y-4 mt-0 focus-visible:outline-none">
          <CustomerToolbar
            activeTab="contacts"
            search={contactSearch}
            onSearchChange={(val) => {
              setContactSearch(val);
              setContactPage(1);
            }}
            filters={contactFilters}
            onFilterChange={(key, val) => {
              setContactFilters((prev) => ({ ...prev, [key]: val }));
              setContactPage(1);
            }}
            onResetFilters={() => {
              setContactSearch('');
              setContactFilters({});
              setContactPage(1);
            }}
            columns={CONTACT_COLUMNS}
            visibleColumns={contactColVisibility}
            onToggleColumn={(colId) =>
              setContactColVisibility((prev) => ({
                ...prev,
                [colId]: prev[colId] === false ? true : false,
              }))
            }
            onOpenCreateSheet={() => {
              setEditingContact(null);
              setContactSheetOpen(true);
            }}
            onOpenImportWizard={() => setImportWizardOpen(true)}
          />

          <ContactsTable
            contacts={contactsList}
            meta={contactsMeta}
            isLoading={isContactsLoading}
            page={contactPage}
            limit={contactLimit}
            sort={contactSort}
            order={contactOrder}
            onPageChange={setContactPage}
            onLimitChange={(newLimit) => {
              setContactLimit(newLimit);
              setContactPage(1);
            }}
            onSortChange={(field, ord) => {
              setContactSort(field);
              setContactOrder(ord);
            }}
            selectedIds={selectedContactIds}
            onToggleSelectRow={handleToggleContactRow}
            onToggleSelectAll={handleToggleContactAll}
            onEditContact={(contact) => {
              setEditingContact(contact);
              setContactSheetOpen(true);
            }}
            onDeleteContact={(id) => deleteContactMutation.mutate(id)}
            visibleColumns={contactColVisibility}
          />
        </TabsContent>

        {/* Companies Tab Content */}
        <TabsContent value="companies" className="space-y-4 mt-0 focus-visible:outline-none">
          <CustomerToolbar
            activeTab="companies"
            search={companySearch}
            onSearchChange={(val) => {
              setCompanySearch(val);
              setCompanyPage(1);
            }}
            filters={companyFilters}
            onFilterChange={(key, val) => {
              setCompanyFilters((prev) => ({ ...prev, [key]: val }));
              setCompanyPage(1);
            }}
            onResetFilters={() => {
              setCompanySearch('');
              setCompanyFilters({});
              setCompanyPage(1);
            }}
            columns={COMPANY_COLUMNS}
            visibleColumns={companyColVisibility}
            onToggleColumn={(colId) =>
              setCompanyColVisibility((prev) => ({
                ...prev,
                [colId]: prev[colId] === false ? true : false,
              }))
            }
            onOpenCreateSheet={() => {
              setEditingCompany(null);
              setCompanySheetOpen(true);
            }}
            onOpenImportWizard={() => setImportWizardOpen(true)}
          />

          <CompaniesTable
            companies={companiesList}
            meta={companiesMeta}
            isLoading={isCompaniesLoading}
            page={companyPage}
            limit={companyLimit}
            sort={companySort}
            order={companyOrder}
            onPageChange={setCompanyPage}
            onLimitChange={(newLimit) => {
              setCompanyLimit(newLimit);
              setCompanyPage(1);
            }}
            onSortChange={(field, ord) => {
              setCompanySort(field);
              setCompanyOrder(ord);
            }}
            selectedIds={selectedCompanyIds}
            onToggleSelectRow={handleToggleCompanyRow}
            onToggleSelectAll={handleToggleCompanyAll}
            onEditCompany={(comp) => {
              setEditingCompany(comp);
              setCompanySheetOpen(true);
            }}
            onDeleteCompany={(id) => deleteCompanyMutation.mutate(id)}
            visibleColumns={companyColVisibility}
          />
        </TabsContent>
      </Tabs>

      {/* Bulk Action Floating Bar */}
      {activeTab === 'contacts' && selectedContactIds.length > 0 && (
        <BulkActionBar
          entityType="contacts"
          selectedIds={selectedContactIds}
          onClearSelection={() => setSelectedContactIds([])}
        />
      )}

      {activeTab === 'companies' && selectedCompanyIds.length > 0 && (
        <BulkActionBar
          entityType="companies"
          selectedIds={selectedCompanyIds}
          onClearSelection={() => setSelectedCompanyIds([])}
        />
      )}

      {/* Contact Create / Edit Right Sheet */}
      <ContactSheet
        open={contactSheetOpen}
        onOpenChange={setContactSheetOpen}
        contact={editingContact}
      />

      {/* Company Create / Edit Right Sheet */}
      <CompanySheet
        open={companySheetOpen}
        onOpenChange={setCompanySheetOpen}
        company={editingCompany}
      />

      {/* CSV Import Wizard Multi-Step Dialog */}
      <CsvImportWizardDialog
        open={importWizardOpen}
        onOpenChange={setImportWizardOpen}
      />
    </div>
  );
}
