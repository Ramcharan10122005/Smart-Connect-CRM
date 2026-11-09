import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  Sun,
  Moon,
  Sparkles,
  Search,
  Trash2,
  Plus,
  Mail,
  User,
  Building,
  FolderOpen,
  HelpCircle,
} from 'lucide-react';
import { useUiStore } from '@/stores/uiStore';
import { formatCurrency, formatDate, initials } from '@/lib/utils';
import {
  Button,
  Input,
  Textarea,
  Label,
  FormField,
  Checkbox,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  Combobox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuShortcut,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Badge,
  Avatar,
  AvatarFallback,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  Calendar,
  DatePicker,
  EmptyState,
  ConfirmDialog,
  Popover,
  PopoverContent,
  PopoverTrigger,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui';

export default function DesignSystemPage() {
  const { theme, toggleTheme } = useUiStore();

  // State for interactive widgets
  const [btnLoading, setBtnLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  // Form controls state
  const [inputValue, setInputValue] = useState('');
  const [textareaValue, setTextareaValue] = useState('');
  const [selectValue, setSelectValue] = useState('active');
  const [comboboxValue, setComboboxValue] = useState('acme');
  const [checkedBox, setCheckedBox] = useState(true);
  const [switchChecked, setSwitchChecked] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarDate, setCalendarDate] = useState(new Date());

  const comboboxItems = [
    { label: 'Acme Corporation', value: 'acme' },
    { label: 'Stark Industries', value: 'stark' },
    { label: 'Wayne Enterprises', value: 'wayne' },
    { label: 'Cyberdyne Systems', value: 'cyberdyne' },
    { label: 'Globex Corp', value: 'globex' },
  ];

  const handleSimulateAction = () => {
    setBtnLoading(true);
    setTimeout(() => {
      setBtnLoading(false);
      toast.success('Action executed successfully!');
    }, 1200);
  };

  const handleConfirmAction = async () => {
    setConfirmLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setConfirmLoading(false);
    setConfirmOpen(false);
    toast.error('Record was permanently deleted.');
  };

  // Keyboard shortcut for command palette
  React.useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground pb-20">
        {/* Header Bar */}
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto max-w-6xl flex h-16 items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-crm bg-primary text-primary-foreground shadow-subtle">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-semibold tracking-tight">
                  SmartConnect Design System
                </h1>
                <p className="text-xs text-muted-foreground">Component Library & Styleguide</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCommandOpen(true)}
                className="hidden sm:inline-flex text-xs text-muted-foreground"
              >
                <Search className="mr-1.5 h-3.5 w-3.5" />
                Quick Search{' '}
                <kbd className="ml-2 font-mono text-[10px] bg-muted px-1 rounded border">⌘K</kbd>
              </Button>

              <Button variant="outline" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4 text-amber-400" />
                ) : (
                  <Moon className="h-4 w-4 text-slate-700" />
                )}
              </Button>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="container mx-auto max-w-6xl px-4 sm:px-6 pt-8 space-y-12">
          {/* Section: Overview & Design Tokens */}
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Design Tokens & Utilities</h2>
              <p className="text-sm text-muted-foreground">
                Tokens configured from PROJECT_CONTEXT: Indigo (#4F46E5) primary, 10px corner
                radius, Slate neutral scale, 150ms subtle transitions.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Currency Formatter</p>
                <p className="text-lg font-semibold mt-1">{formatCurrency(48500.5)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Relative Date</p>
                <p className="text-lg font-semibold mt-1">
                  {formatDate(new Date(Date.now() - 3600000 * 5), 'relative')}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Formatted Date</p>
                <p className="text-lg font-semibold mt-1">
                  {formatDate(new Date(), 'MMM d, yyyy')}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Initials Helper</p>
                <p className="text-lg font-semibold mt-1">
                  {initials('Anjan Prasad')} / {initials('SmartConnect')}
                </p>
              </Card>
            </div>
          </section>

          {/* Section: Buttons */}
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Buttons</h2>
              <p className="text-sm text-muted-foreground">
                All variants, sizes, and states with focus rings and loading animations.
              </p>
            </div>

            <Card className="p-6 space-y-6">
              <div>
                <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-3">
                  Variants
                </h3>
                <div className="flex flex-wrap gap-2.5">
                  <Button variant="default">Default (Indigo)</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="success">Success</Button>
                  <Button variant="link">Link Style</Button>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-3">
                  Sizes & Icons
                </h3>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Button size="sm">Small (sm)</Button>
                  <Button size="default">Default</Button>
                  <Button size="lg">Large (lg)</Button>
                  <Button size="icon" aria-label="Add item">
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Mail className="mr-1.5 h-3.5 w-3.5" /> Send Email
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-3">
                  Interactive & Loading States
                </h3>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Button loading={btnLoading} onClick={handleSimulateAction}>
                    {btnLoading ? 'Saving...' : 'Click to Load'}
                  </Button>
                  <Button variant="outline" disabled>
                    Disabled State
                  </Button>
                  <Button variant="destructive" loading>
                    Deleting...
                  </Button>
                </div>
              </div>
            </Card>
          </section>

          {/* Section: Badges */}
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Badges & Tags</h2>
              <p className="text-sm text-muted-foreground">
                Status badges tailored for CRM lifecycle, stages, and priorities.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>System & Lifecycle Badges</CardTitle>
                <CardDescription>
                  Visual indicators representing pipeline stages and urgency tiers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="default">Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="outline">Outline</Badge>
                  <Badge variant="success">Active</Badge>
                  <Badge variant="warning">Pending</Badge>
                  <Badge variant="info">In Progress</Badge>
                  <Badge variant="won">Stage: Won</Badge>
                  <Badge variant="lost">Stage: Lost</Badge>
                  <Badge variant="open">Stage: Discovery</Badge>
                  <Badge variant="urgent">Priority: Urgent</Badge>
                  <Badge variant="destructive">Failed</Badge>
                </div>
              </CardContent>
              <CardFooter className="text-xs text-muted-foreground border-t pt-4">
                Structured with CardHeader, CardTitle, CardDescription, CardContent, and CardFooter
              </CardFooter>
            </Card>
          </section>

          {/* Section: Form Controls */}
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Form Controls</h2>
              <p className="text-sm text-muted-foreground">
                Accessible inputs, textareas, selects, comboboxes, switches, and form field
                wrappers.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6 space-y-4">
                <FormField
                  id="contact-name"
                  label="Full Name"
                  required
                  description="As shown on official identification"
                >
                  <Input
                    id="contact-name"
                    placeholder="Jane Doe"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                </FormField>

                <FormField
                  id="contact-email"
                  label="Email Address"
                  error="Please enter a valid business email address"
                >
                  <Input id="contact-email" type="email" defaultValue="invalid-email" error />
                </FormField>

                <FormField id="company-notes" label="Notes & Background">
                  <Textarea
                    id="company-notes"
                    placeholder="Enter background notes about this prospect..."
                    value={textareaValue}
                    onChange={(e) => setTextareaValue(e.target.value)}
                    rows={3}
                  />
                </FormField>
              </Card>

              <Card className="p-6 space-y-4">
                <FormField id="lead-stage" label="Pipeline Stage">
                  <Select value={selectValue} onValueChange={setSelectValue}>
                    <SelectTrigger id="lead-stage">
                      <SelectValue placeholder="Select a stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Pipeline Stages</SelectLabel>
                        <SelectItem value="discovery">Discovery & Qual</SelectItem>
                        <SelectItem value="active">Active Pitch</SelectItem>
                        <SelectItem value="negotiation">Negotiation</SelectItem>
                        <SelectItem value="won">Closed Won</SelectItem>
                        <SelectItem value="lost">Closed Lost</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField id="company-lookup" label="Account (Searchable Combobox)">
                  <Combobox
                    items={comboboxItems}
                    value={comboboxValue}
                    onChange={setComboboxValue}
                    placeholder="Select company..."
                    searchPlaceholder="Search companies..."
                  />
                </FormField>

                <FormField id="due-date" label="Follow-up Due Date">
                  <DatePicker
                    value={selectedDate}
                    onChange={setSelectedDate}
                    placeholder="Pick due date"
                  />
                </FormField>

                <div className="pt-2 flex flex-col gap-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="terms" checked={checkedBox} onCheckedChange={setCheckedBox} />
                    <Label htmlFor="terms" className="cursor-pointer">
                      Subscribe to automated reminder notifications
                    </Label>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <Label htmlFor="two-factor" className="cursor-pointer">
                        Require Two-Factor Auth
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Enforce TOTP validation on every session login.
                      </p>
                    </div>
                    <Switch
                      id="two-factor"
                      checked={switchChecked}
                      onCheckedChange={setSwitchChecked}
                    />
                  </div>
                </div>
              </Card>
            </div>
          </section>

          {/* Section: Calendar & Date Picker */}
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Calendar Component</h2>
              <p className="text-sm text-muted-foreground">
                Interactive standalone calendar grid using date-fns.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-4 flex flex-col items-center justify-center">
                <Calendar
                  selected={calendarDate}
                  onSelect={setCalendarDate}
                  className="rounded-crm border shadow-sm"
                />
                <p className="text-xs text-muted-foreground mt-3">
                  Selected date:{' '}
                  <span className="font-semibold text-foreground">
                    {calendarDate ? formatDate(calendarDate, 'PPPP') : 'None'}
                  </span>
                </p>
              </Card>

              <Card className="p-6 flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-sm mb-1">Calendar & DatePicker Features</h3>
                  <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside mt-3">
                    <li>Accessible keyboard navigation & click target styling</li>
                    <li>Integrated with popovers for flexible form usage</li>
                    <li>Highlights current day and selected day states</li>
                    <li>Supports clear button and arbitrary date disabling rules</li>
                  </ul>
                </div>

                <div className="pt-6 border-t">
                  <Label className="mb-2 block">Quick Date Selector</Label>
                  <DatePicker
                    value={calendarDate}
                    onChange={setCalendarDate}
                    placeholder="Choose date"
                  />
                </div>
              </Card>
            </div>
          </section>

          {/* Section: Dialogs, Drawers & Overlays */}
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Overlays & Modals</h2>
              <p className="text-sm text-muted-foreground">
                Radix-powered Dialogs, Side Drawers (Sheets), Popovers, Dropdowns, and Tooltips.
              </p>
            </div>

            <Card className="p-6">
              <div className="flex flex-wrap items-center gap-3">
                {/* Standard Dialog */}
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">Open Modal Dialog</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                      <DialogTitle>Create New Contact</DialogTitle>
                      <DialogDescription>
                        Fill in details to add a customer record to your pipeline.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-3">
                      <FormField label="Full Name">
                        <Input placeholder="Sarah Connor" />
                      </FormField>
                      <FormField label="Email">
                        <Input placeholder="sarah@resistance.org" type="email" />
                      </FormField>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          setDialogOpen(false);
                          toast.success('Contact record created!');
                        }}
                      >
                        Save Contact
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Side Drawer / Sheet */}
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline">Open Side Sheet</Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="sm:max-w-md">
                    <SheetHeader>
                      <SheetTitle>Activity Details</SheetTitle>
                      <SheetDescription>
                        Timeline and meta information for this interaction.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="py-6 space-y-4 text-sm">
                      <div className="rounded-lg bg-muted p-3">
                        <p className="font-semibold text-foreground">
                          Discovery Call with Stark Industries
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Logged by Tony Stark • 25 mins
                        </p>
                      </div>
                      <p className="text-muted-foreground">
                        Customer expressed strong interest in enterprise deployment. Follow-up
                        meeting scheduled for next Tuesday.
                      </p>
                    </div>
                  </SheetContent>
                </Sheet>

                {/* Confirm Dialog */}
                <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
                  <Trash2 className="mr-1.5 h-4 w-4" /> Trigger Confirm Dialog
                </Button>
                <ConfirmDialog
                  open={confirmOpen}
                  onOpenChange={setConfirmOpen}
                  title="Delete Contact Record?"
                  description="Are you sure you want to permanently delete Sarah Connor? This will also remove associated activities and cannot be undone."
                  confirmText="Yes, Delete Record"
                  variant="destructive"
                  loading={confirmLoading}
                  onConfirm={handleConfirmAction}
                />

                {/* Dropdown Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">Actions Menu ▾</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="start">
                    <DropdownMenuLabel>Account Options</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => toast.info('Export started')}>
                      Export as CSV <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast.info('Duplicate check initiated')}>
                      Find Duplicates
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setConfirmOpen(true)}
                    >
                      Delete Account <DropdownMenuShortcut>⌫</DropdownMenuShortcut>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Popover */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">Interactive Popover</Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="start">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Quick Calculations</h4>
                      <p className="text-xs text-muted-foreground">
                        Weighted pipeline value = \$125,000 × 70% win probability ={' '}
                        <strong>\$87,500</strong>.
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Tooltip */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <HelpCircle className="h-5 w-5 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Helpful tooltip explaining this metric</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </Card>
          </section>

          {/* Section: Command Palette */}
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Command Palette (cmdk)</h2>
              <p className="text-sm text-muted-foreground">
                Press ⌘K or click below to launch the spotlight command dialog.
              </p>
            </div>

            <Card className="p-6 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">Global Quick Navigation & Search</p>
                <p className="text-xs text-muted-foreground">
                  Jump to leads, contacts, settings or execute batch commands.
                </p>
              </div>
              <Button onClick={() => setCommandOpen(true)}>
                <Search className="mr-2 h-4 w-4" /> Open Command Palette (⌘K)
              </Button>
            </Card>

            <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
              <CommandInput placeholder="Type a command or search..." />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="Suggestions">
                  <CommandItem
                    onSelect={() => {
                      setCommandOpen(false);
                      toast.info('Navigating to Leads');
                    }}
                  >
                    <FolderOpen className="mr-2 h-4 w-4" />
                    <span>View All Leads</span>
                  </CommandItem>
                  <CommandItem
                    onSelect={() => {
                      setCommandOpen(false);
                      toast.info('Navigating to Contacts');
                    }}
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>Contacts Directory</span>
                  </CommandItem>
                  <CommandItem
                    onSelect={() => {
                      setCommandOpen(false);
                      toast.info('Navigating to Companies');
                    }}
                  >
                    <Building className="mr-2 h-4 w-4" />
                    <span>Company Accounts</span>
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Settings">
                  <CommandItem
                    onSelect={() => {
                      setCommandOpen(false);
                      toggleTheme();
                    }}
                  >
                    <Sun className="mr-2 h-4 w-4" />
                    <span>Toggle Light / Dark Mode</span>
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </CommandDialog>
          </section>

          {/* Section: Data Table & Pagination */}
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Table & Pagination</h2>
              <p className="text-sm text-muted-foreground">
                Standardized tabular layout for contacts, leads, and activity logs.
              </p>
            </div>

            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    {
                      name: 'Sarah Connor',
                      email: 'sarah@resistance.org',
                      company: 'Cyberdyne Inc',
                      stage: 'won',
                      value: 85000,
                    },
                    {
                      name: 'Bruce Wayne',
                      email: 'bruce@waynecorp.com',
                      company: 'Wayne Enterprises',
                      stage: 'open',
                      value: 250000,
                    },
                    {
                      name: 'Tony Stark',
                      email: 'tony@stark.com',
                      company: 'Stark Industries',
                      stage: 'won',
                      value: 500000,
                    },
                    {
                      name: 'Peter Parker',
                      email: 'peter@dailybugle.com',
                      company: 'Daily Bugle',
                      stage: 'lost',
                      value: 12000,
                    },
                  ].map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{initials(row.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium leading-none">{row.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{row.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{row.company}</TableCell>
                      <TableCell>
                        <Badge variant={row.stage}>{row.stage.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell className="font-mono">{formatCurrency(row.value)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toast.info(`Viewing ${row.name}`)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="p-4 border-t">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious href="#" onClick={(e) => e.preventDefault()} />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLink href="#" isActive onClick={(e) => e.preventDefault()}>
                        1
                      </PaginationLink>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLink href="#" onClick={(e) => e.preventDefault()}>
                        2
                      </PaginationLink>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext href="#" onClick={(e) => e.preventDefault()} />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </Card>
          </section>

          {/* Section: Tabs & Skeletons */}
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Tabs & Skeletons</h2>
              <p className="text-sm text-muted-foreground">
                Tab navigation and smooth animated loading states.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <Tabs defaultValue="overview">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="activities">Activities</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                  </TabsList>
                  <TabsContent
                    value="overview"
                    className="space-y-2 mt-4 text-sm text-muted-foreground"
                  >
                    <p className="font-medium text-foreground">Account Overview Panel</p>
                    <p>
                      Total annual contract value: <strong>\$320,000</strong> across 3 active
                      opportunities.
                    </p>
                  </TabsContent>
                  <TabsContent
                    value="activities"
                    className="space-y-2 mt-4 text-sm text-muted-foreground"
                  >
                    <p className="font-medium text-foreground">Recent Activity Logs</p>
                    <p>3 completed calls and 2 upcoming follow-up reminders scheduled.</p>
                  </TabsContent>
                  <TabsContent
                    value="settings"
                    className="space-y-2 mt-4 text-sm text-muted-foreground"
                  >
                    <p className="font-medium text-foreground">Notification Preferences</p>
                    <p>Daily morning digests are enabled for 08:00 AM.</p>
                  </TabsContent>
                </Tabs>
              </Card>

              <Card className="p-6 space-y-4">
                <h3 className="font-semibold text-sm mb-2">Skeleton Loading Placeholders</h3>
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[150px]" />
                  </div>
                </div>
                <div className="space-y-2 pt-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-8 w-28 rounded-crm mt-2" />
                </div>
              </Card>
            </div>
          </section>

          {/* Section: Empty State */}
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Empty State</h2>
              <p className="text-sm text-muted-foreground">
                Zero-data views with helpful iconography and call-to-actions.
              </p>
            </div>

            <EmptyState
              icon={FolderOpen}
              title="No leads found in this pipeline stage"
              description="You have cleared all pending leads in Discovery. Create a new lead or import prospects from CSV."
              actionLabel="Create First Lead"
              onAction={() => toast.success('Lead creation dialog triggered')}
            />
          </section>

          {/* Section: Toaster Notifications */}
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Sonner Toast Notifications</h2>
              <p className="text-sm text-muted-foreground">
                Trigger rich notification toasts in all variations.
              </p>
            </div>

            <Card className="p-6">
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => toast.success('Operation completed successfully!')}
                >
                  Success Toast
                </Button>
                <Button
                  variant="outline"
                  onClick={() => toast.error('Action failed. Please verify inputs.')}
                >
                  Error Toast
                </Button>
                <Button
                  variant="outline"
                  onClick={() => toast.warning('Lead is due for follow-up in 10 minutes.')}
                >
                  Warning Toast
                </Button>
                <Button
                  variant="outline"
                  onClick={() => toast.info('New lead assigned to your queue.')}
                >
                  Info Toast
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const promise = () => new Promise((resolve) => setTimeout(resolve, 2000));
                    toast.promise(promise, {
                      loading: 'Exporting CSV data...',
                      success: 'Data exported successfully!',
                      error: 'Failed to export.',
                    });
                  }}
                >
                  Promise Toast (2s)
                </Button>
              </div>
            </Card>
          </section>
        </main>
      </div>
    </TooltipProvider>
  );
}
