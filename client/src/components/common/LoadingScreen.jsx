import { Layers, Loader2 } from 'lucide-react';

export function LoadingScreen({ message = 'Loading SmartConnect...' }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-elevated animate-pulse">
          <Layers className="h-7 w-7" />
        </div>
        <div className="flex flex-col items-center space-y-1.5 text-center">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            SmartConnect CRM
          </h2>
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            <span>{message}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoadingScreen;
