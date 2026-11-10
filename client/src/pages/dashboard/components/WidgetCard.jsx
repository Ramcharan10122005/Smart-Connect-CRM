import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function WidgetCard({
  title,
  description,
  headerAction,
  isLoading = false,
  isError = false,
  onRetry,
  children,
  className,
  contentClassName,
}) {
  return (
    <Card className={className}>
      {(title || description || headerAction) && (
        <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
          <div className="space-y-0.5">
            {title && <CardTitle className="text-sm font-semibold">{title}</CardTitle>}
            {description && (
              <CardDescription className="text-xs text-muted-foreground">
                {description}
              </CardDescription>
            )}
          </div>
          {headerAction && <div className="flex items-center gap-2">{headerAction}</div>}
        </CardHeader>
      )}

      <CardContent className={contentClassName}>
        {isLoading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-28 w-full" />
            <div className="flex justify-between pt-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center p-6 text-center text-xs">
            <AlertCircle className="h-7 w-7 text-rose-500 mb-2" />
            <p className="font-semibold text-foreground">Failed to load data</p>
            <p className="text-muted-foreground mt-0.5 mb-3">
              An error occurred while fetching this section.
            </p>
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry} className="h-7 text-xs">
                <RefreshCw className="mr-1.5 h-3 w-3" /> Retry
              </Button>
            )}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

export default WidgetCard;

