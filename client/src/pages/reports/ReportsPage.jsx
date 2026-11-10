import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  Filter,
  Layers,
  Users,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReportsToolbar } from './components/ReportsToolbar';
import { computePresetRange } from './reportUtils';
import { SalesReport } from './components/SalesReport';
import { LeadFunnelReport } from './components/LeadFunnelReport';
import { LeadSourcesReport } from './components/LeadSourcesReport';
import { TeamActivityReport } from './components/TeamActivityReport';
import { CustomerGrowthReport } from './components/CustomerGrowthReport';

const REPORT_TABS = [
  { id: 'sales', label: 'Sales Performance', icon: TrendingUp, endpoint: 'sales-performance' },
  { id: 'funnel', label: 'Lead Funnel', icon: Filter, endpoint: 'lead-funnel' },
  { id: 'sources', label: 'Lead Sources', icon: Layers, endpoint: 'lead-sources' },
  { id: 'activity', label: 'Team Activity', icon: Users, endpoint: 'rep-activity' },
  { id: 'growth', label: 'Customer Growth', icon: UserCheck, endpoint: 'customer-growth' },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('sales');

  // Date range state
  const initialRange = computePresetRange('last_90_days');
  const [preset, setPreset] = useState('last_90_days');
  const [dateFrom, setDateFrom] = useState(initialRange.from);
  const [dateTo, setDateTo] = useState(initialRange.to);
  const [ownerId, setOwnerId] = useState('all');
  const [isExporting, setIsExporting] = useState(false);

  const activeConfig = REPORT_TABS.find((t) => t.id === activeTab) || REPORT_TABS[0];

  // Report query parameters
  const queryParams = {
    from: dateFrom ? new Date(dateFrom).toISOString() : undefined,
    to: dateTo ? new Date(dateTo).toISOString() : undefined,
    ownerId: ownerId !== 'all' ? ownerId : undefined,
  };

  // Fetch report data for active tab
  const { data: reportData, isLoading } = useQuery({
    queryKey: queryKeys.reports.detail(activeConfig.endpoint, queryParams),
    queryFn: async () => {
      const cleanParams = Object.fromEntries(
        Object.entries(queryParams).filter(([_, v]) => v !== undefined && v !== null && v !== '')
      );
      const res = await api.get(`/reports/${activeConfig.endpoint}`, { params: cleanParams });
      return res.data?.data || {};
    },
  });

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const cleanParams = Object.fromEntries(
        Object.entries(queryParams).filter(([_, v]) => v !== undefined && v !== null && v !== '')
      );
      const res = await api.get(`/reports/${activeConfig.endpoint}.csv`, {
        params: cleanParams,
        responseType: 'blob',
      });

      // Trigger browser download
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${activeConfig.endpoint}-${dateFrom}-to-${dateTo}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Exported ${activeConfig.label} CSV`);
    } catch {
      toast.error('Failed to export CSV report');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="print:mb-4">
        <PageHeader
          title="Reports & Analytics"
          description="Actionable sales performance metrics, pipeline conversions, team velocity, and customer growth."
        />
      </div>

      {/* Report Selector Tabs */}
      <div className="print:hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 sm:grid-cols-5 h-auto p-1 bg-muted/60">
            {REPORT_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="gap-2 py-2 text-xs font-semibold data-[state=active]:shadow-sm"
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      {/* Date & Filter Toolbar */}
      <ReportsToolbar
        preset={preset}
        setPreset={setPreset}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        ownerId={ownerId}
        setOwnerId={setOwnerId}
        onExportCsv={handleExportCsv}
        isExporting={isExporting}
      />

      {/* Printable Heading (shows on print only) */}
      <div className="hidden print:block border-b pb-2 mb-4">
        <h2 className="text-xl font-bold text-black">{activeConfig.label} Report</h2>
        <p className="text-xs text-gray-600">
          Period: {dateFrom} to {dateTo} • Generated via SmartConnect CRM
        </p>
      </div>

      {/* Active Report Body */}
      <div>
        {activeTab === 'sales' && <SalesReport data={reportData} isLoading={isLoading} />}
        {activeTab === 'funnel' && <LeadFunnelReport data={reportData} isLoading={isLoading} />}
        {activeTab === 'sources' && <LeadSourcesReport data={reportData} isLoading={isLoading} />}
        {activeTab === 'activity' && <TeamActivityReport data={reportData} isLoading={isLoading} />}
        {activeTab === 'growth' && <CustomerGrowthReport data={reportData} isLoading={isLoading} />}
      </div>
    </div>
  );
}
