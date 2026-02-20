"use client";

import { useRoadmapStore } from "@/lib/store";
import { PieChart } from "lucide-react";

export default function PortfolioPage() {
  const activeAssessment = useRoadmapStore((s) => s.activeAssessment);

  if (!activeAssessment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <PieChart className="w-10 h-10 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          Build a roadmap first. Your portfolio view will show state-by-state investment breakdown.
        </p>
      </div>
    );
  }

  const stateCount = activeAssessment.stateRecommendations.length;
  const totalCost = activeAssessment.financialSummary.annualSubscription;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <PieChart className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-semibold">Portfolio</h1>
      </div>
      <div className="rounded-xl border border-border bg-card p-6 space-y-4 max-w-lg">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-2xl font-bold text-primary">{stateCount}</p>
            <p className="text-xs text-muted-foreground">States</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-chart-2">${totalCost.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Annual Cost</p>
          </div>
        </div>
        <div className="space-y-2">
          {activeAssessment.stateRecommendations.map((rec) => (
            <div key={rec.stateId} className="flex items-center justify-between text-sm">
              <span className="font-medium">{rec.stateId}</span>
              <span className="text-muted-foreground text-xs capitalize">{rec.role.replace("_", " ")}</span>
              <span className="text-xs font-mono">${rec.annualCost}/yr</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground pt-2 border-t border-border">
          Detailed allocation breakdown, species coverage matrix, and concentration analysis coming soon.
        </p>
      </div>
    </div>
  );
}
