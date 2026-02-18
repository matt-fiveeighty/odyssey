"use client";

import { useRef } from "react";
import { YearNode } from "./YearNode";

interface YearNodeData {
  year: number;
  hunts: {
    stateId: string;
    speciesId: string;
    unitCode: string;
    type: "hunt" | "application" | "point_purchase";
  }[];
  unlocks: {
    stateId: string;
    speciesId: string;
    unitCode: string;
    unitName: string;
  }[];
  pointMilestones: {
    stateId: string;
    speciesId: string;
    points: number;
  }[];
}

interface JourneyTimelineProps {
  timelineData: YearNodeData[];
  currentYear: number;
}

export function JourneyTimeline({ timelineData, currentYear }: JourneyTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scrollRef}
      className="overflow-x-auto pb-4 -mx-6 px-6 scroll-smooth snap-x snap-mandatory"
    >
      <div className="flex gap-4 min-w-max">
        {timelineData.map((yearData, idx) => (
          <YearNode
            key={yearData.year}
            year={yearData.year}
            hunts={yearData.hunts}
            unlocks={yearData.unlocks}
            pointMilestones={yearData.pointMilestones}
            isCurrentYear={yearData.year === currentYear}
            showConnector={idx < timelineData.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
