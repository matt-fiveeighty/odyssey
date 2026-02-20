"use client";

import { RefreshCw } from "lucide-react";

export default function RebalancePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
      <RefreshCw className="w-10 h-10 text-muted-foreground/50" />
      <div className="text-center max-w-md">
        <h1 className="text-xl font-semibold mb-2">Rebalance</h1>
        <p className="text-sm text-muted-foreground">
          When draw results come in, regulations change, or your budget shifts, this view
          will show exactly what changed and how the roadmap should adjust.
        </p>
        <p className="text-xs text-muted-foreground/60 mt-2">Coming soon.</p>
      </div>
    </div>
  );
}
