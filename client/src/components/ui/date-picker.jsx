import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  disabled = false,
  allowClear = true,
  className,
}) {
  const [open, setOpen] = React.useState(false);

  const dateValue = value ? (value instanceof Date ? value : new Date(value)) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn('relative inline-block w-full', className)}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              'w-full justify-start text-left font-normal pr-8',
              !dateValue && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateValue ? format(dateValue, 'PPP') : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>

        {allowClear && dateValue && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange && onChange(null);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground rounded"
            aria-label="Clear date"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          selected={dateValue}
          onSelect={(d) => {
            onChange && onChange(d);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export { DatePicker };
