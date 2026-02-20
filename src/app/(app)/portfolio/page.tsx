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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <PieChart className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-semibold">Portfolio</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        {activeAssessment.stateRecommendations.length} states. Portfolio view coming in P1.
      </p>
    </div>
  );
}
