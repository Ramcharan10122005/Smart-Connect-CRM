import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Target, CalendarPlus, Clock, User, Building, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import { useDialogStore } from '@/stores/dialogStore';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';

export function CommandPalette({ open, onOpenChange }) {
  const navigate = useNavigate();
  const { openLogActivity, openCreateFollowUp } = useDialogStore();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 250);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }

    let isCurrent = true;
    setLoading(true);

    api
      .get(`/search?q=${encodeURIComponent(debouncedQuery.trim())}`)
      .then((res) => {
        if (isCurrent) {
          setResults(res.data?.data || { contacts: [], companies: [], leads: [] });
          setLoading(false);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setResults(null);
          setLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [debouncedQuery]);

  const handleSelect = (callback) => {
    onOpenChange(false);
    setQuery('');
    callback();
  };

  const hasResults =
    results &&
    ((results.contacts && results.contacts.length > 0) ||
      (results.companies && results.companies.length > 0) ||
      (results.leads && results.leads.length > 0));

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Type to search contacts, companies, leads or execute action..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {loading && (
          <div className="py-6 text-center text-xs text-muted-foreground">
            Searching across records...
          </div>
        )}

        {!loading && query.trim().length >= 2 && !hasResults && (
          <CommandEmpty>No matching records found.</CommandEmpty>
        )}

        {/* Dynamic Search Results */}
        {results?.contacts && results.contacts.length > 0 && (
          <CommandGroup heading="Contacts">
            {results.contacts.map((contact) => (
              <CommandItem
                key={contact.id}
                onSelect={() => handleSelect(() => navigate(`/customers/contact/${contact.id}`))}
              >
                <User className="mr-2 h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span>{contact.name}</span>
                  <span className="text-[11px] text-muted-foreground">{contact.email}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results?.companies && results.companies.length > 0 && (
          <CommandGroup heading="Companies">
            {results.companies.map((company) => (
              <CommandItem
                key={company.id}
                onSelect={() => handleSelect(() => navigate(`/customers/company/${company.id}`))}
              >
                <Building className="mr-2 h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span>{company.name}</span>
                  {company.domain && (
                    <span className="text-[11px] text-muted-foreground">{company.domain}</span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results?.leads && results.leads.length > 0 && (
          <CommandGroup heading="Leads">
            {results.leads.map((lead) => (
              <CommandItem
                key={lead.id}
                onSelect={() => handleSelect(() => navigate(`/leads?id=${lead.id}`))}
              >
                <TrendingUp className="mr-2 h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span>{lead.title}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {lead.stage?.name || 'Lead'} • {lead.companyName || lead.contactName || ''}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {hasResults && <CommandSeparator />}

        {/* Quick Actions */}
        <CommandGroup heading="Quick Actions">
          <CommandItem
            onSelect={() => handleSelect(() => navigate('/customers?action=new-contact'))}
          >
            <UserPlus className="mr-2 h-4 w-4 text-primary" />
            <span>New contact</span>
          </CommandItem>

          <CommandItem onSelect={() => handleSelect(() => navigate('/leads?action=new-lead'))}>
            <Target className="mr-2 h-4 w-4 text-indigo-500" />
            <span>New lead</span>
          </CommandItem>

          <CommandItem
            onSelect={() => handleSelect(() => openLogActivity())}
          >
            <CalendarPlus className="mr-2 h-4 w-4 text-emerald-500" />
            <span>Log activity</span>
          </CommandItem>

          <CommandItem
            onSelect={() => handleSelect(() => openCreateFollowUp())}
          >
            <Clock className="mr-2 h-4 w-4 text-amber-500" />
            <span>New follow-up</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Navigation Shortcuts */}
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => handleSelect(() => navigate('/dashboard'))}>
            <span>Go to Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('/customers'))}>
            <span>Go to Customers</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('/leads'))}>
            <span>Go to Leads & Pipeline</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('/follow-ups'))}>
            <span>Go to Follow-ups</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('/activities'))}>
            <span>Go to Activities</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('/reports'))}>
            <span>Go to Reports</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('/settings'))}>
            <span>Go to Settings</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export default CommandPalette;
