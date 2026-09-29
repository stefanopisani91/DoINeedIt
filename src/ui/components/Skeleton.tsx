import { useCopy } from '@/i18n';

interface SkeletonProps {
  className?: string;
}

/** A placeholder block that pulses while content loads. Decorative: wrap it in a status region. */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse-soft rounded-control bg-surface-sunken ${className}`}
      aria-hidden="true"
    />
  );
}

/** The shape of the product card while the shop page is being read. */
export function PreviewSkeleton() {
  const copy = useCopy();
  return (
    <div role="status" className="grid gap-6 sm:grid-cols-[10rem_1fr]" aria-busy="true">
      <span className="sr-only">{copy.common.loading}</span>
      <Skeleton className="mx-auto h-40 w-40 rounded-tile sm:mx-0" />
      <div className="space-y-4">
        <Skeleton className="h-11 w-full" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </div>
    </div>
  );
}

/** A list of card-shaped placeholders. */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  const copy = useCopy();
  return (
    <div role="status" className="space-y-3" aria-busy="true">
      <span className="sr-only">{copy.common.loading}</span>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-20 w-full rounded-card" />
      ))}
    </div>
  );
}
