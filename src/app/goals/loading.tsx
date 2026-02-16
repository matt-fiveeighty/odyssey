export default function GoalsLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="mb-2 h-8 w-48 animate-pulse rounded-lg bg-secondary" />
        <div className="h-4 w-80 animate-pulse rounded-md bg-secondary/60" />
      </div>

      {/* Goals list skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-6"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex items-start gap-4">
              <div className="size-10 animate-pulse rounded-lg bg-secondary" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-40 animate-pulse rounded-md bg-secondary" />
                <div className="h-4 w-64 animate-pulse rounded-md bg-secondary/50" />
                <div className="mt-3 h-2 w-full animate-pulse rounded-full bg-secondary/30" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
