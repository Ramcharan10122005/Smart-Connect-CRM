import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, BarChart3 } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Comprehensive sales performance, funnel conversion, and rep activity reports."
        actions={
          <Button variant="outline" size="sm">
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export All (CSV)
          </Button>
        }
      />

      <Card className="min-h-[400px] flex items-center justify-center border-dashed">
        <div className="text-center p-8">
          <BarChart3 className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
          <h3 className="font-semibold text-sm">Reporting Engine</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Date-range filtered sales metrics, funnel conversion analytics, and rep velocity data.
          </p>
        </div>
      </Card>
    </div>
  );
}
