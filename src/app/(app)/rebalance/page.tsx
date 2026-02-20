"use client";

import { RefreshCw } from "lucide-react";

export default function RebalancePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
      <RefreshCw className="w-10 h-10 text-muted-foreground/50" />
      <div className="text-center max-w-md">
        <h1 className="text-xl font-semibold mb-2">Rebalance</h1>
        <p className="text-sm text-muted-foreground">
          When draw results, regulatory changes, or budget shifts happen, this view
          shows exactly what changed and how your roadmap adjusted. Coming in P1.
        </p>
      </div>
    </div>
  );
}
