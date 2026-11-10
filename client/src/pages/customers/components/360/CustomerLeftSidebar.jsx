import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Compass,
  Tag as TagIcon,
  Plus,
  X,
  Activity,
  AlertCircle,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { cn, formatCurrency, formatDate, initials } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

export function CustomerLeftSidebar({
  type = 'contact', // 'contact' | 'company'
  data = {},
  summaryStats = {},
}) {
  const queryClient = useQueryClient();
  const isContact = type === 'contact';
  const id = data.id;

  const [ownerPopoverOpen, setOwnerPopoverOpen] = useState(false);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);

  // Load team users for owner change
  const { data: usersData } = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: async () => {
      const res = await api.get('/users?limit=100');
      return res.data?.data || [];
    },
  });
  const users = usersData || [];

  // Load all available tags
  const { data: allTagsData } = useQuery({
    queryKey: queryKeys.tags.all,
    queryFn: async () => {
      const res = await api.get('/tags');
      return res.data?.data || [];
    },
  });
  const allTags = allTagsData || [];

  // Change owner mutation
  const changeOwnerMutation = useMutation({
    mutationFn: async (newOwnerId) => {
      if (isContact) {
        await api.patch(`/contacts/${id}`, { ownerId: newOwnerId });
      } else {
        await api.patch(`/companies/${id}`, { ownerId: newOwnerId });
      }
    },
    onSuccess: () => {
      if (isContact) {
        queryClient.invalidateQueries({ queryKey: queryKeys.contacts.overview(id) });
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.companies.overview(id) });
      }
      toast.success('Owner updated successfully');
      setOwnerPopoverOpen(false);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update owner');
    },
  });

  // Attach tag mutation
  const attachTagMutation = useMutation({
    mutationFn: async (tagId) => {
      if (isContact) {
        await api.post(`/contacts/${id}/tags`, { tagId });
      } else {
        await api.post(`/companies/${id}/tags`, { tagId });
      }
    },
    onSuccess: () => {
      if (isContact) {
        queryClient.invalidateQueries({ queryKey: queryKeys.contacts.overview(id) });
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.companies.overview(id) });
      }
      toast.success('Tag attached');
      setTagPopoverOpen(false);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to attach tag');
    },
  });

  // Detach tag mutation
  const detachTagMutation = useMutation({
    mutationFn: async (tagId) => {
      if (isContact) {
        await api.delete(`/contacts/${id}/tags/${tagId}`);
      } else {
        await api.delete(`/companies/${id}/tags/${tagId}`);
      }
    },
    onSuccess: () => {
      if (isContact) {
        queryClient.invalidateQueries({ queryKey: queryKeys.contacts.overview(id) });
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.companies.overview(id) });
      }
      toast.success('Tag removed');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to remove tag');
    },
  });

  const currentTags = (data.tags || []).map((t) => t.tag || t);
  const currentTagIds = currentTags.map((t) => t.id);

  // Address string
  const addressParts = [
    data.addressLine1,
    data.city,
    data.state,
    data.country,
    data.postalCode,
  ].filter(Boolean);
  const formattedAddress = addressParts.join(', ');

  // Days since contact calculation
  const daysSinceContact =
    summaryStats.daysSinceLastContact !== undefined && summaryStats.daysSinceLastContact !== null
      ? summaryStats.daysSinceLastContact
      : null;

  return (
    <div className="space-y-4">
      {/* 1. Contact / Company Details Card */}
      <Card className="rounded-card border shadow-xs">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>{isContact ? 'Contact Details' : 'Company Details'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3.5 text-xs">
          {/* Email */}
          {data.email && (
            <div className="flex items-start gap-2.5">
              <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="truncate">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                  Email
                </span>
                <a
                  href={`mailto:${data.email}`}
                  className="font-medium text-foreground hover:text-primary transition-colors truncate block"
                >
                  {data.email}
                </a>
              </div>
            </div>
          )}

          {/* Phone */}
          {data.phone && (
            <div className="flex items-start gap-2.5">
              <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                  Phone
                </span>
                <a
                  href={`tel:${data.phone}`}
                  className="font-medium text-foreground hover:text-primary transition-colors"
                >
                  {data.phone}
                </a>
              </div>
            </div>
          )}

          {/* Address */}
          {formattedAddress && (
            <div className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                  Location
                </span>
                <span className="text-foreground leading-relaxed">{formattedAddress}</span>
              </div>
            </div>
          )}

          {/* LinkedIn Profile */}
          {data.linkedinUrl && (
            <div className="flex items-start gap-2.5">
              <Linkedin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0 text-blue-600" />
              <div className="truncate">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                  LinkedIn
                </span>
                <a
                  href={data.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline font-medium truncate block"
                >
                  {data.linkedinUrl.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, '')}
                </a>
              </div>
            </div>
          )}

          {/* Lead Source */}
          {data.source && (
            <div className="flex items-start gap-2.5">
              <Compass className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                  Acquisition Source
                </span>
                <Badge variant="secondary" className="text-[11px] font-normal mt-0.5">
                  {data.source.name}
                </Badge>
              </div>
            </div>
          )}

          {/* Assigned Owner with Change Option */}
          <div className="pt-2 border-t flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <Avatar className="h-6 w-6">
                <AvatarImage src={data.owner?.avatarUrl} alt={data.owner?.name} />
                <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                  {initials(data.owner?.name || 'Unassigned')}
                </AvatarFallback>
              </Avatar>
              <div className="truncate">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                  Owner
                </span>
                <span className="font-medium text-foreground truncate block">
                  {data.owner?.name || 'Unassigned'}
                </span>
              </div>
            </div>

            {/* Change Owner Popover */}
            <Popover open={ownerPopoverOpen} onOpenChange={setOwnerPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-[11px] text-primary hover:underline font-medium">
                  Change
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-0 shadow-md" align="end">
                <Command>
                  <CommandInput placeholder="Search owner..." />
                  <CommandList className="max-h-52">
                    <CommandEmpty>No users found.</CommandEmpty>
                    <CommandGroup>
                      {users.map((u) => (
                        <CommandItem
                          key={u.id}
                          onSelect={() => changeOwnerMutation.mutate(u.id)}
                          className="cursor-pointer text-xs flex items-center justify-between"
                        >
                          <span className="truncate">{u.name}</span>
                          {data.owner?.id === u.id && (
                            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* 2. Interactive Tags Editor */}
      <Card className="rounded-card border shadow-xs">
        <CardHeader className="pb-2.5 pt-3.5 px-4 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <TagIcon className="h-3.5 w-3.5" />
            <span>Tags</span>
          </CardTitle>

          {/* Add Tag Popover */}
          <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs text-primary gap-1">
                <Plus className="h-3 w-3" /> Add
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-0 shadow-md" align="end">
              <Command>
                <CommandInput placeholder="Attach tag..." />
                <CommandList className="max-h-48">
                  <CommandEmpty>No tags found.</CommandEmpty>
                  <CommandGroup>
                    {allTags.map((t) => {
                      const isAttached = currentTagIds.includes(t.id);
                      return (
                        <CommandItem
                          key={t.id}
                          disabled={isAttached}
                          onSelect={() => !isAttached && attachTagMutation.mutate(t.id)}
                          className={cn(
                            'cursor-pointer text-xs flex items-center justify-between',
                            isAttached && 'opacity-40 cursor-not-allowed'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: t.color || '#4F46E5' }}
                            />
                            <span>{t.name}</span>
                          </div>
                          {isAttached && <Check className="h-3 w-3 text-primary" />}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </CardHeader>
        <CardContent className="p-4">
          {currentTags.length === 0 ? (
            <p className="text-xs text-muted-foreground/70 italic">No tags attached.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {currentTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="pl-2 pr-1 py-0.5 text-xs rounded-full flex items-center gap-1 font-normal"
                  style={{
                    borderColor: tag.color ? `${tag.color}40` : undefined,
                    backgroundColor: tag.color ? `${tag.color}15` : undefined,
                    color: tag.color || undefined,
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: tag.color || '#4F46E5' }}
                  />
                  <span>{tag.name}</span>
                  <button
                    type="button"
                    onClick={() => detachTagMutation.mutate(tag.id)}
                    className="hover:bg-foreground/10 rounded-full p-0.5 cursor-pointer ml-0.5"
                    title="Remove tag"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Key Stats Card */}
      <Card className="rounded-card border shadow-xs">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            <span>Relationship Health</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {/* Total Interactions */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Total Interactions</span>
            <span className="font-semibold text-foreground">
              {summaryStats.totalInteractions !== undefined
                ? summaryStats.totalInteractions
                : data._count?.activities || 0}
            </span>
          </div>

          {/* Last Contacted */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Last Contacted</span>
            <span className="font-medium text-foreground">
              {data.lastContactedAt
                ? formatDate(data.lastContactedAt, { relative: true })
                : summaryStats.lastContactedAt
                ? formatDate(summaryStats.lastContactedAt, { relative: true })
                : 'Never'}
            </span>
          </div>

          {/* Days Since Contact */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Days Since Contact</span>
            <div className="flex items-center gap-1.5">
              {daysSinceContact !== null ? (
                <>
                  <span
                    className={cn(
                      'font-semibold',
                      daysSinceContact > 30
                        ? 'text-rose-600 dark:text-rose-400'
                        : daysSinceContact > 14
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-foreground'
                    )}
                  >
                    {daysSinceContact} {daysSinceContact === 1 ? 'day' : 'days'}
                  </span>
                  {daysSinceContact > 14 && (
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  )}
                </>
              ) : (
                <span className="text-muted-foreground italic">-</span>
              )}
            </div>
          </div>

          {/* Open Pipeline Value */}
          <div className="pt-2 border-t flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Open Deals Value</span>
            <span className="font-bold text-primary text-sm">
              {formatCurrency(summaryStats.openPipelineValue || 0)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CustomerLeftSidebar;
