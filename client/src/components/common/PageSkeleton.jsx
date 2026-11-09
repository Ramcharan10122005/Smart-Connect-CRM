import { Skeleton } from '@/components/ui/skeleton';

export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Header skeleton */}
      <div className="pb-6 border-b border-border/60 flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-9 w-24 rounded-crm" />
          <Skeleton className="h-9 w-28 rounded-crm" />
        </div>
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Skeleton className="h-28 rounded-card" />
        <Skeleton className="h-28 rounded-card" />
        <Skeleton className="h-28 rounded-card" />
        <Skeleton className="h-28 rounded-card" />
      </div>

      {/* Content Skeleton */}
      <Skeleton className="h-80 w-full rounded-card" />
    </div>
  );
}

export default PageSkeleton;
