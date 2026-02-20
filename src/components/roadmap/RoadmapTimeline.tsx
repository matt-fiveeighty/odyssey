"use client";

import { YearCard } from "./YearCard";
import type { RoadmapYear } from "@/lib/types";

interface RoadmapTimelineProps {
  roadmap: RoadmapYear[];
}

export function RoadmapTimeline({ roadmap }: RoadmapTimelineProps) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {roadmap.length}-Year Roadmap
        </p>
        <p className="text-xs text-muted-foreground">
          ${roadmap.reduce((s, y) => s + y.estimatedCost, 0).toLocaleString()} total
        </p>
      </div>

      {roadmap.map((year, i) => (
        <YearCard
          key={year.year}
          year={year}
          defaultExpanded={year.year === currentYear || i === 0}
        />
      ))}
    </div>
  );
}
