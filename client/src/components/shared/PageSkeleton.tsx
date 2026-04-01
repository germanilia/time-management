/**
 * Skeleton loading state for pages.
 * Renders animated placeholder blocks while data is loading.
 *
 * @example
 * if (!data) return <PageSkeleton />;
 */
export function PageSkeleton() {
  return (
    <div className="animate-fade-in space-y-6">
      {/* Title skeleton */}
      <div className="flex items-center gap-3">
        <div className="skeleton size-10 rounded-full" />
        <div className="space-y-2">
          <div className="skeleton h-6 w-40" />
          <div className="skeleton h-4 w-28" />
        </div>
      </div>
      {/* Cards skeleton */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border p-5">
            <div className="skeleton size-12 rounded-xl" />
            <div className="space-y-2">
              <div className="skeleton h-3 w-20" />
              <div className="skeleton h-6 w-16" />
            </div>
          </div>
        ))}
      </div>
      {/* Chart skeleton */}
      <div className="rounded-xl border p-6">
        <div className="skeleton mb-4 h-5 w-36" />
        <div className="skeleton h-64 w-full" />
      </div>
    </div>
  );
}

/**
 * Table skeleton with configurable rows.
 *
 * @example
 * if (!data) return <TableSkeleton rows={5} cols={6} />;
 */
interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

export function TableSkeleton({ rows = 5, cols = 5 }: TableSkeletonProps) {
  return (
    <div className="animate-fade-in rounded-xl border">
      <div className="border-b px-6 py-4">
        <div className="skeleton h-5 w-40" />
      </div>
      <div className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="skeleton h-4 flex-1" />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4">
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className="skeleton h-8 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
