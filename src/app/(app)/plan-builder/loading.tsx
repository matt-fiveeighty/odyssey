export default function PlanBuilderLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {/* Header skeleton */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-secondary" />
        <div className="h-4 w-96 animate-pulse rounded-md bg-secondary/60" />
      </div>

      {/* Progress bar skeleton */}
      <div className="mb-10 flex items-center gap-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-1.5 flex-1 animate-pulse rounded-full bg-secondary" />
        ))}
      </div>

      {/* Card skeleton */}
      <div className="rounded-xl border border-border bg-card p-8">
        {/* Question skeleton */}
        <div className="mb-6">
          <div className="mb-2 h-6 w-72 animate-pulse rounded-md bg-secondary" />
          <div className="h-4 w-48 animate-pulse rounded-md bg-secondary/50" />
        </div>

        {/* Option cards skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-border bg-secondary/30"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>

        {/* Button row skeleton */}
        <div className="mt-8 flex justify-between">
          <div className="h-10 w-24 animate-pulse rounded-md bg-secondary/40" />
          <div className="h-10 w-24 animate-pulse rounded-md bg-secondary" />
        </div>
      </div>
    </div>
  );
}
