export default function CalculatorLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 w-44 animate-pulse rounded-lg bg-secondary mb-2" />
        <div className="h-4 w-80 animate-pulse rounded-md bg-secondary/60" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input panel skeleton */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <div className="h-4 w-24 animate-pulse rounded-md bg-secondary/60 mb-2" />
              <div className="h-10 w-full animate-pulse rounded-lg bg-secondary/40" />
            </div>
          ))}
        </div>

        {/* Results panel skeleton */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="h-6 w-32 animate-pulse rounded-md bg-secondary mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="h-4 w-32 animate-pulse rounded-md bg-secondary/50" />
                <div className="h-5 w-16 animate-pulse rounded-md bg-secondary" />
              </div>
            ))}
            <div className="mt-4 h-px w-full bg-border" />
            <div className="flex items-center justify-between pt-2">
              <div className="h-5 w-24 animate-pulse rounded-md bg-secondary" />
              <div className="h-6 w-20 animate-pulse rounded-md bg-secondary" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
