import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase,
  Loader2,
  Check,
  ChevronsUpDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function CreateLeadModal({
  open,
  onOpenChange,
  defaultStageId = null,
  onSuccess,
}) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);

  // Form Mode: 'existing' contact or 'new' contact
  const [contactMode, setContactMode] = useState('existing');
  const [contactComboboxOpen, setContactComboboxOpen] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [stageId, setStageId] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [ownerId, setOwnerId] = useState('');

  // Existing contact selection
  const [selectedContactId, setSelectedContactId] = useState(null);

  // New lead details (if no existing contact)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');

  // Fetch stages
  const { data: stagesData } = useQuery({
    queryKey: queryKeys.pipelineStages.all,
    queryFn: async () => {
      const res = await api.get('/pipeline-stages');
      return res.data?.data || [];
    },
  });
  const stages = useMemo(() => stagesData || [], [stagesData]);

  // Fetch sources
  const { data: sourcesData } = useQuery({
    queryKey: queryKeys.leadSources.all,
    queryFn: async () => {
      const res = await api.get('/lead-sources');
      return res.data?.data || [];
    },
  });
  const sources = sourcesData || [];

  // Fetch team users
  const { data: usersData } = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: async () => {
      const res = await api.get('/users?limit=100');
      return res.data?.data || [];
    },
  });
  const users = usersData || [];

  // Fetch contacts for combobox
  const { data: contactsData } = useQuery({
    queryKey: queryKeys.contacts.list({ limit: 100 }),
    queryFn: async () => {
      const res = await api.get('/contacts?limit=100');
      return res.data?.data || [];
    },
  });
  const contacts = contactsData || [];

  useEffect(() => {
    if (open) {
      setTitle('');
      setValue('25000');
      setCurrency('USD');
      setStageId(defaultStageId || (stages[0] ? stages[0].id : ''));
      setPriority('MEDIUM');
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 30);
      setExpectedCloseDate(targetDate.toISOString().slice(0, 10));
      setSourceId('');
      setOwnerId(currentUser?.id || '');
      setSelectedContactId(null);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setCompanyName('');
      setContactMode('existing');
    }
  }, [open, defaultStageId, stages, currentUser]);

  const selectedContact = contacts.find((c) => c.id === selectedContactId);

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/leads', payload);
      return res.data?.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(`Created opportunity "${data.title}"`);
      onOpenChange(false);
      if (onSuccess) onSuccess(data);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to create lead');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Deal title is required');
      return;
    }
    if (!stageId) {
      toast.error('Pipeline stage is required');
      return;
    }

    const payload = {
      title: title.trim(),
      value: value ? Number(value) : 0,
      currency,
      stageId,
      priority,
      expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
      sourceId: sourceId || null,
      ownerId: ownerId || currentUser?.id || null,
    };

    if (contactMode === 'existing' && selectedContactId) {
      payload.contactId = selectedContactId;
      payload.companyId = selectedContact?.companyId || null;
    } else if (contactMode === 'new') {
      payload.firstName = firstName.trim() || null;
      payload.lastName = lastName.trim() || null;
      payload.email = email.trim() || null;
      payload.phone = phone.trim() || null;
      payload.companyName = companyName.trim() || null;
    }

    createMutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            Create Opportunity / Lead
          </DialogTitle>
          <DialogDescription className="text-xs">
            Track a new deal pipeline item and assign sales probability.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="mlTitle" className="text-xs font-medium">
              Opportunity Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="mlTitle"
              placeholder="e.g. Acme Corp Enterprise Platform 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9 text-xs rounded-crm"
              required
            />
          </div>

          {/* Deal Value & Stage */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="mlVal" className="text-xs font-medium">
                Deal Value ($ USD)
              </Label>
              <Input
                id="mlVal"
                type="number"
                min="0"
                step="500"
                placeholder="25000"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="h-9 text-xs rounded-crm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Pipeline Stage <span className="text-destructive">*</span>
              </Label>
              <Select value={stageId} onValueChange={setStageId}>
                <SelectTrigger className="h-9 text-xs rounded-crm">
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((st) => (
                    <SelectItem key={st.id} value={st.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: st.color || '#4F46E5' }}
                        />
                        <span>{st.name}</span>
                        <span className="text-muted-foreground text-[10px]">({st.probability}%)</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contact Association Mode Switcher */}
          <div className="pt-2 border-t space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Contact & Account Link
              </span>
              <div className="flex items-center gap-1 bg-muted p-0.5 rounded-crm text-[11px]">
                <button
                  type="button"
                  onClick={() => setContactMode('existing')}
                  className={cn(
                    'px-2 py-0.5 rounded-crm font-medium transition-all cursor-pointer',
                    contactMode === 'existing'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Existing Contact
                </button>
                <button
                  type="button"
                  onClick={() => setContactMode('new')}
                  className={cn(
                    'px-2 py-0.5 rounded-crm font-medium transition-all cursor-pointer',
                    contactMode === 'new'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  New Contact Details
                </button>
              </div>
            </div>

            {contactMode === 'existing' ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Select Contact</Label>
                <Popover open={contactComboboxOpen} onOpenChange={setContactComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between h-9 text-xs rounded-crm font-normal"
                    >
                      <span className="truncate">
                        {selectedContact
                          ? `${selectedContact.firstName} ${selectedContact.lastName} ${
                              selectedContact.company ? `(${selectedContact.company.name})` : ''
                            }`
                          : 'Search existing contacts...'}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[360px] p-0 shadow-md" align="start">
                    <Command>
                      <CommandInput placeholder="Search contact name, company..." />
                      <CommandList className="max-h-52">
                        <CommandEmpty>No contacts found.</CommandEmpty>
                        <CommandGroup>
                          {contacts.map((c) => (
                            <CommandItem
                              key={c.id}
                              value={`${c.firstName} ${c.lastName} ${c.company?.name || ''}`}
                              onSelect={() => {
                                setSelectedContactId(c.id);
                                if (!title) {
                                  setTitle(`${c.company?.name || c.lastName} - Opportunity`);
                                }
                                setContactComboboxOpen(false);
                              }}
                              className="cursor-pointer text-xs flex items-center justify-between"
                            >
                              <div className="truncate">
                                <span className="font-medium">
                                  {c.firstName} {c.lastName}
                                </span>
                                {c.company && (
                                  <span className="text-muted-foreground ml-1.5">
                                    • {c.company.name}
                                  </span>
                                )}
                              </div>
                              {selectedContactId === c.id && (
                                <Check className="h-4 w-4 text-primary shrink-0" />
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">First Name</Label>
                    <Input
                      placeholder="Jane"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="h-8 text-xs rounded-crm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Last Name</Label>
                    <Input
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="h-8 text-xs rounded-crm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Email</Label>
                    <Input
                      type="email"
                      placeholder="jane@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-8 text-xs rounded-crm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Phone</Label>
                    <Input
                      type="tel"
                      placeholder="+1 (555) 0100"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-8 text-xs rounded-crm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Company Name</Label>
                  <Input
                    placeholder="Acme Inc."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="h-8 text-xs rounded-crm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Expected Close Date & Priority */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            <div className="space-y-1.5">
              <Label htmlFor="mlClose" className="text-xs font-medium">
                Target Close Date
              </Label>
              <Input
                id="mlClose"
                type="date"
                value={expectedCloseDate}
                onChange={(e) => setExpectedCloseDate(e.target.value)}
                className="h-9 text-xs rounded-crm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-9 text-xs rounded-crm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Source & Owner */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Lead Source</Label>
              <Select
                value={sourceId || '__none__'}
                onValueChange={(val) => setSourceId(val === '__none__' ? '' : val)}
              >
                <SelectTrigger className="h-9 text-xs rounded-crm">
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-muted-foreground italic text-xs">
                    (None / Direct)
                  </SelectItem>
                  {sources.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Assigned Owner</Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger className="h-9 text-xs rounded-crm">
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={createMutation.isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending}
              className="min-w-28"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Creating...
                </>
              ) : (
                'Create Deal'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateLeadModal;
