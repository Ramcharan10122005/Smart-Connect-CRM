import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronsUpDown, Plus, Loader2, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';

export function CompanyCombobox({ value, onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const queryClient = useQueryClient();

  const { data: companiesData, isLoading } = useQuery({
    queryKey: queryKeys.companies.list({ limit: 100 }),
    queryFn: async () => {
      const res = await api.get('/companies?limit=100');
      return res.data?.data || [];
    },
  });

  const companies = companiesData || [];
  const selectedCompany = companies.find((c) => c.id === value);

  // Quick inline create mutation
  const createCompanyMutation = useMutation({
    mutationFn: async (name) => {
      const res = await api.post('/companies', { name });
      return res.data?.data;
    },
    onSuccess: (newCompany) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
      onChange(newCompany.id);
      setOpen(false);
      setSearchValue('');
      toast.success(`Created company "${newCompany.name}"`);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to create company');
    },
  });

  const handleCreateInline = async () => {
    const trimmed = searchValue.trim();
    if (!trimmed) return;
    await createCompanyMutation.mutateAsync(trimmed);
  };

  const exactMatchExists = companies.some(
    (c) => c.name.toLowerCase() === searchValue.trim().toLowerCase()
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between rounded-crm font-normal text-sm h-9 bg-background',
            !selectedCompany && 'text-muted-foreground'
          )}
        >
          <span className="flex items-center gap-2 truncate">
            <Building2 className="h-3.5 w-3.5 shrink-0 opacity-60" />
            <span className="truncate">
              {selectedCompany ? selectedCompany.name : 'Select or create company...'}
            </span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0 shadow-md" align="start">
        <Command>
          <CommandInput
            placeholder="Search company..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList className="max-h-60">
            {isLoading ? (
              <div className="flex items-center justify-center p-4 text-xs text-muted-foreground">
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Loading companies...
              </div>
            ) : null}

            {!isLoading && companies.length === 0 && !searchValue && (
              <CommandEmpty>No companies found.</CommandEmpty>
            )}

            <CommandGroup heading="Companies">
              {/* Option to clear company selection */}
              <CommandItem
                value="__none__"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="text-muted-foreground text-xs italic cursor-pointer"
              >
                (No company / Individual)
              </CommandItem>

              {companies.map((company) => (
                <CommandItem
                  key={company.id}
                  value={company.name}
                  onSelect={() => {
                    onChange(company.id);
                    setOpen(false);
                  }}
                  className="cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{company.name}</span>
                  </div>
                  <Check
                    className={cn(
                      'h-4 w-4 shrink-0 text-primary',
                      value === company.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>

            {/* Inline create button when user searches for a company name that doesn't exist */}
            {searchValue.trim().length > 0 && !exactMatchExists && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    value={`create-${searchValue}`}
                    onSelect={handleCreateInline}
                    className="cursor-pointer text-primary font-medium flex items-center gap-2 py-2"
                  >
                    {createCompanyMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    ) : (
                      <Plus className="h-4 w-4 shrink-0" />
                    )}
                    <span className="truncate">Create company &quot;{searchValue.trim()}&quot;</span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default CompanyCombobox;

