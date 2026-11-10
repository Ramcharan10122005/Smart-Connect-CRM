import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  Download,
  Printer,
  User,
} from 'lucide-react';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DATE_PRESETS, computePresetRange } from '../reportUtils';

export function ReportsToolbar({
  preset,
  setPreset,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  ownerId,
  setOwnerId,
  onExportCsv,
  isExporting = false,
}) {
  const { role } = useAuthStore();
  const canFilterRep = role === 'ADMIN' || role === 'MANAGER';

  // Fetch users for rep filter
  const { data: usersData } = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: async () => {
      const res = await api.get('/users?limit=100');
      return res.data?.data || [];
    },
    enabled: canFilterRep,
  });

  const users = usersData || [];

  const handlePresetChange = (val) => {
    setPreset(val);
    if (val !== 'custom') {
      const { from, to } = computePresetRange(val);
      setDateFrom(from);
      setDateTo(to);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 rounded-card border bg-card p-3.5 shadow-sm print:hidden">
      {/* Left: Date Presets & Inputs */}
      <div className="flex items-center gap-2 flex-wrap flex-1">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={preset} onValueChange={handlePresetChange}>
            <SelectTrigger className="h-9 w-36 text-xs bg-background">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              {DATE_PRESETS.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-xs">
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom date range inputs */}
        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 w-36 text-xs bg-background"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 w-36 text-xs bg-background"
            />
          </div>
        )}

        {/* Rep Filter (Managers / Admins only) */}
        {canFilterRep && (
          <div className="flex items-center gap-1.5 ml-0 sm:ml-2">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger className="h-9 w-40 text-xs bg-background">
                <SelectValue placeholder="All Sales Reps" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sales Reps</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id} className="text-xs">
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Right: Export CSV & Print Page */}
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrint}
          className="h-9 text-xs gap-1.5 border-border bg-background hover:bg-muted/60"
        >
          <Printer className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Print</span>
        </Button>

        <Button
          variant="default"
          size="sm"
          onClick={onExportCsv}
          disabled={isExporting}
          className="h-9 text-xs gap-1.5"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export CSV</span>
        </Button>
      </div>
    </div>
  );
}
