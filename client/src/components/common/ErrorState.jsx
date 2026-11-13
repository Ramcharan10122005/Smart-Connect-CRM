import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ErrorState({
  title = 'Failed to load data',
  message = 'An unexpected error occurred while fetching information.',
  onRetry,
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-destructive/20 bg-destructive/5 p-8 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/15 text-destructive mb-3">
        <AlertCircle className="h-5 w-5" />
      </div>
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{message}</p>
      {onRetry && (
        <Button
          size="sm"
          variant="outline"
          onClick={onRetry}
          className="mt-4 h-8 gap-1.5 text-xs border-destructive/30 hover:bg-destructive/10"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </Button>
      )}
    </div>
  );
}

export default ErrorState;

