import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Mail, Phone, Clock } from 'lucide-react';
import { formatDate, initials } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ContactSheet } from '../ContactSheet';

export function CompanyContactsTab({ contacts = [], company = {} }) {
  const navigate = useNavigate();
  const [newContactSheetOpen, setNewContactSheetOpen] = useState(false);

  const getLifecycleBadge = (stage) => {
    switch (stage) {
      case 'CUSTOMER':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
            Customer
          </Badge>
        );
      case 'INACTIVE':
        return (
          <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-[10px]">
            Inactive
          </Badge>
        );
      case 'PROSPECT':
      default:
        return (
          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px]">
            Prospect
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm text-foreground">Company Directory</h3>
          <p className="text-xs text-muted-foreground">
            {contacts.length} team member{contacts.length !== 1 ? 's' : ''} associated with {company.name}.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setNewContactSheetOpen(true)}
          className="h-8 gap-1.5 text-xs rounded-crm font-medium shadow-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Contact</span>
        </Button>
      </div>

      {/* Directory Table */}
      {contacts.length === 0 ? (
        <div className="rounded-card border border-dashed p-10 text-center text-muted-foreground space-y-3">
          <Users className="h-8 w-8 mx-auto opacity-40" />
          <div className="space-y-1">
            <h4 className="font-semibold text-sm text-foreground">No contacts linked</h4>
            <p className="text-xs max-w-sm mx-auto">
              Add decision makers, buyers, or team members who work at this organization.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNewContactSheetOpen(true)}
            className="text-xs"
          >
            Add First Contact
          </Button>
        </div>
      ) : (
        <div className="rounded-card border bg-card overflow-hidden shadow-xs">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Contact Name</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Lifecycle</TableHead>
                <TableHead>Last Contacted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((c) => {
                const fullName = `${c.firstName} ${c.lastName}`;
                return (
                  <TableRow
                    key={c.id}
                    onClick={() => navigate(`/customers/contact/${c.id}`)}
                    className="cursor-pointer hover:bg-muted/40 transition-colors group"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                            {initials(fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-xs text-foreground group-hover:text-primary transition-colors">
                          {fullName}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      {c.jobTitle || '-'}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      {c.email ? (
                        <span className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3 opacity-60" />
                          <span>{c.email}</span>
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      {c.phone ? (
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 opacity-60" />
                          <span>{c.phone}</span>
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>

                    <TableCell>{getLifecycleBadge(c.lifecycleStage)}</TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      {c.lastContactedAt ? (
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 opacity-60" />
                          <span>{formatDate(c.lastContactedAt, { relative: true })}</span>
                        </span>
                      ) : (
                        'Never'
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Inline Contact Create Sheet with company preselected */}
      <ContactSheet
        open={newContactSheetOpen}
        onOpenChange={setNewContactSheetOpen}
        contact={{ companyId: company.id }}
      />
    </div>
  );
}

export default CompanyContactsTab;

