/* eslint-disable react-refresh/only-export-components */
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        success:
          'border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
        warning:
          'border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20',
        info: 'border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/20',
        won: 'border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-medium',
        lost: 'border-transparent bg-rose-500/15 text-rose-700 dark:text-rose-400 font-medium',
        open: 'border-transparent bg-primary/15 text-primary font-medium',
        urgent: 'border-transparent bg-rose-600 text-white font-medium',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
