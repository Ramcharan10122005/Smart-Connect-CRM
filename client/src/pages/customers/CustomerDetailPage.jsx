import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Printer, Mail, Phone, CalendarPlus, UserCheck } from 'lucide-react';

export default function CustomerDetailPage() {
  const { type, id } = useParams();

  const formattedType = type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Record';

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${formattedType} Profile`}
        description={`Record ID: ${id}`}
        breadcrumbs={[
          { label: 'Customers', href: '/customers' },
          { label: formattedType },
          { label: id ? `${id.slice(0, 8)}...` : 'Detail' },
        ]}
        actions={
          <>
            <a href={`/print/contact/${id}`} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">
                <Printer className="mr-1.5 h-3.5 w-3.5" /> Printable Report
              </Button>
            </a>
            <Button size="sm">
              <CalendarPlus className="mr-1.5 h-3.5 w-3.5" /> Log Activity
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 md:col-span-1 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Customer Details</h3>
              <p className="text-xs text-muted-foreground">Type: {formattedType}</p>
            </div>
          </div>
          <div className="space-y-2 text-xs">
            <p className="text-muted-foreground flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" /> Email communication active
            </p>
            <p className="text-muted-foreground flex items-center gap-2">
              <Phone className="h-3.5 w-3.5" /> Direct phone link
            </p>
          </div>
        </Card>

        <Card className="p-6 md:col-span-2 min-h-[300px] flex items-center justify-center border-dashed">
          <div className="text-center">
            <h4 className="font-semibold text-sm">Customer Timeline & Open Leads</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Merged interactions, stage changes, and follow-ups.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
