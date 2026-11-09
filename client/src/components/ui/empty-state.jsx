import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionButton,
  className,
  children,
}) {
  return (
    <div
      className={cn(
        'flex min-h-[300px] flex-col items-center justify-center rounded-card border border-dashed p-8 text-center animate-in fade-in-50',
        className
      )}
    >
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button onClick={onAction}>{actionLabel}</Button>
        </div>
      )}
      {actionButton && <div className="mt-5">{actionButton}</div>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

export { EmptyState };
