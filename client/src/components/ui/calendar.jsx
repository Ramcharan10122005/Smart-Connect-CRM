import * as React from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

function Calendar({ className, selected, onSelect, disabledDate, initialMonth = new Date() }) {
  const [currentMonth, setCurrentMonth] = React.useState(
    selected instanceof Date ? selected : initialMonth
  );

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className={cn('p-3 select-none', className)}>
      <div className="flex items-center justify-between pb-3">
        <h4 className="text-sm font-semibold text-foreground">
          {format(currentMonth, 'MMMM yyyy')}
        </h4>
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={prevMonth}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'icon' }),
              'h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100'
            )}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'icon' }),
              'h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100'
            )}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {weekDays.map((d) => (
          <span key={d} className="text-[0.75rem] font-medium text-muted-foreground">
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isSelected = selected && isSameDay(day, selected);
          const isCurrentM = isSameMonth(day, currentMonth);
          const isDisabled = disabledDate ? disabledDate(day) : false;
          const today = isToday(day);

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={isDisabled}
              onClick={() => onSelect && onSelect(day)}
              className={cn(
                'h-8 w-8 text-sm p-0 font-normal rounded-md flex items-center justify-center transition-colors',
                !isCurrentM && 'text-muted-foreground/40',
                isCurrentM &&
                  !isSelected &&
                  'text-foreground hover:bg-accent hover:text-accent-foreground',
                today && !isSelected && 'border border-primary font-semibold text-primary',
                isSelected &&
                  'bg-primary text-primary-foreground font-semibold hover:bg-primary/90',
                isDisabled && 'opacity-30 cursor-not-allowed hover:bg-transparent'
              )}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { Calendar };
