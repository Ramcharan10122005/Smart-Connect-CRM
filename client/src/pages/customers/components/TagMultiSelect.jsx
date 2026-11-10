import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown, X, Tag as TagIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function TagMultiSelect({ value = [], onChange, disabled = false }) {
  const [open, setOpen] = useState(false);

  const { data: tagsData, isLoading } = useQuery({
    queryKey: queryKeys.tags.all,
    queryFn: async () => {
      const res = await api.get('/tags');
      return res.data?.data || [];
    },
  });

  const allTags = tagsData || [];
  const selectedTagIds = Array.isArray(value) ? value : [];

  const handleToggleTag = (tagId) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  const handleRemoveTag = (e, tagId) => {
    e.stopPropagation();
    onChange(selectedTagIds.filter((id) => id !== tagId));
  };

  const selectedTags = allTags.filter((t) => selectedTagIds.includes(t.id));

  return (
    <div className="space-y-1.5">
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
              selectedTagIds.length === 0 && 'text-muted-foreground'
            )}
          >
            <span className="flex items-center gap-2 truncate">
              <TagIcon className="h-3.5 w-3.5 shrink-0 opacity-60" />
              <span className="truncate">
                {selectedTagIds.length === 0
                  ? 'Select tags...'
                  : `${selectedTagIds.length} tag${selectedTagIds.length > 1 ? 's' : ''} selected`}
              </span>
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0 shadow-md" align="start">
          <Command>
            <CommandInput placeholder="Search tags..." />
            <CommandList className="max-h-52">
              {isLoading && (
                <div className="flex items-center justify-center p-3 text-xs text-muted-foreground">
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Loading tags...
                </div>
              )}
              {!isLoading && allTags.length === 0 && (
                <CommandEmpty>No tags found.</CommandEmpty>
              )}
              <CommandGroup>
                {allTags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  return (
                    <CommandItem
                      key={tag.id}
                      value={tag.name}
                      onSelect={() => handleToggleTag(tag.id)}
                      className="cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: tag.color || '#4F46E5' }}
                        />
                        <span className="text-sm">{tag.name}</span>
                      </div>
                      <Check
                        className={cn(
                          'h-4 w-4 shrink-0 text-primary',
                          isSelected ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Render selected tag chips */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {selectedTags.map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="pl-2 pr-1 py-0.5 text-xs flex items-center gap-1 rounded-full font-normal"
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
                onClick={(e) => handleRemoveTag(e, tag.id)}
                className="hover:bg-foreground/10 rounded-full p-0.5 cursor-pointer ml-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export default TagMultiSelect;

