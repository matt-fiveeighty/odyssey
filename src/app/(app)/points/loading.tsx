export default function PointsLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header skeleton */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="h-8 w-40 animate-pulse rounded-lg bg-secondary mb-2" />
          <div className="h-4 w-64 animate-pulse rounded-md bg-secondary/60" />
        </div>
        <div className="h-9 w-28 animate-pulse rounded-lg bg-secondary" />
      </div>

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="h-4 w-20 animate-pulse rounded-md bg-secondary/60 mb-2" />
            <div className="h-7 w-12 animate-pulse rounded-lg bg-secondary" />
          </div>
        ))}
      </div>

      {/* Points table skeleton */}
      <div className="rounded-xl border border-border bg-card">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 border-b border-border last:border-b-0"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="size-9 animate-pulse rounded-lg bg-secondary" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-32 animate-pulse rounded-md bg-secondary" />
              <div className="h-3 w-48 animate-pulse rounded-md bg-secondary/50" />
            </div>
            <div className="h-7 w-10 animate-pulse rounded-md bg-secondary" />
          </div>
        ))}
      </div>
    </div>
  );
}
