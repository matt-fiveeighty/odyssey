export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-5"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="h-4 w-20 animate-pulse rounded-md bg-secondary/60 mb-3" />
            <div className="h-8 w-16 animate-pulse rounded-lg bg-secondary" />
          </div>
        ))}
      </div>

      {/* Two-column layout skeleton */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Timeline / milestones */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="h-6 w-40 animate-pulse rounded-md bg-secondary mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="size-8 animate-pulse rounded-full bg-secondary" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-48 animate-pulse rounded-md bg-secondary" />
                  <div className="h-3 w-32 animate-pulse rounded-md bg-secondary/50" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Deadlines / quick actions */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="h-6 w-44 animate-pulse rounded-md bg-secondary mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="space-y-1.5">
                  <div className="h-4 w-36 animate-pulse rounded-md bg-secondary" />
                  <div className="h-3 w-24 animate-pulse rounded-md bg-secondary/50" />
                </div>
                <div className="h-6 w-16 animate-pulse rounded-full bg-secondary/40" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
