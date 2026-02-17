export default function UnitsLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header + search skeleton */}
      <div className="mb-6">
        <div className="h-8 w-36 animate-pulse rounded-lg bg-secondary mb-2" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-secondary/60 mb-4" />
        <div className="h-10 w-full animate-pulse rounded-lg bg-secondary/40" />
      </div>

      {/* Filter row skeleton */}
      <div className="flex gap-3 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-9 w-28 animate-pulse rounded-lg bg-secondary/50"
          />
        ))}
      </div>

      {/* Unit cards grid skeleton */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-5"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="h-5 w-16 animate-pulse rounded-md bg-secondary" />
              <div className="h-5 w-10 animate-pulse rounded-full bg-secondary/40" />
            </div>
            <div className="h-4 w-full animate-pulse rounded-md bg-secondary/50 mb-2" />
            <div className="h-4 w-3/4 animate-pulse rounded-md bg-secondary/40" />
            <div className="flex gap-2 mt-3">
              <div className="h-6 w-14 animate-pulse rounded-full bg-secondary/30" />
              <div className="h-6 w-14 animate-pulse rounded-full bg-secondary/30" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
