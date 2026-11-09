import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Download, Upload, Users } from 'lucide-react';

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Unified directory of contacts and company accounts with lifecycle filters."
        actions={
          <>
            <Button variant="outline" size="sm">
              <Upload className="mr-1.5 h-3.5 w-3.5" /> Import CSV
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export
            </Button>
            <Button size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Customer
            </Button>
          </>
        }
      />

      <Card className="min-h-[400px] flex items-center justify-center border-dashed">
        <div className="text-center p-8">
          <Users className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
          <h3 className="font-semibold text-sm">Customer Directory</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Searchable contacts and companies table with duplicate detection and bulk actions.
          </p>
        </div>
      </Card>
    </div>
  );
}
