"use client";

/**
 * Year Timeline — vertical (desktop) or horizontal (mobile) year selector.
 * Clicking a year re-colors the interactive map for that year's actions.
 */

import { useRef, useEffect } from "react";
import type { JourneyYearData } from "@/lib/engine/journey-data";

interface YearTimelineProps {
  years: JourneyYearData[];
  selectedYear: number;
  onYearSelect: (year: number) => void;
  currentYear: number;
}

export function YearTimeline({ years, selectedYear, onYearSelect, currentYear }: YearTimelineProps) {
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll to selected year on mount
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, []);

  return (
    <div className="lg:flex lg:flex-col lg:gap-1 lg:max-h-[340px] lg:overflow-y-auto flex flex-row gap-1.5 overflow-x-auto pb-2 lg:pb-0 scrollbar-thin">
      {years.map((yearData) => {
        const isSelected = yearData.year === selectedYear;
        const isCurrent = yearData.year === currentYear;
        const hasHunts = yearData.hunts.length > 0;
        const hasApps = yearData.applications.length > 0;
        const hasPoints = yearData.pointPurchases.length > 0;
        const hasActivity = hasHunts || hasApps || hasPoints;

        return (
          <button
            key={yearData.year}
            ref={isSelected ? selectedRef : undefined}
            onClick={() => onYearSelect(yearData.year)}
            className={`
              relative shrink-0 flex items-center justify-center gap-1.5
              lg:w-full lg:px-2 lg:py-2 px-3 py-2
              rounded-lg text-xs font-semibold transition-all duration-150
              cursor-pointer
              ${isSelected
                ? "bg-primary text-primary-foreground shadow-sm"
                : hasActivity
                  ? "bg-secondary/60 text-foreground hover:bg-secondary"
                  : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-secondary/30"
              }
              ${isCurrent && !isSelected ? "ring-1 ring-destructive/60" : ""}
            `}
            aria-label={`${yearData.year}${isCurrent ? " (current year)" : ""}${hasHunts ? " — has hunts" : ""}${hasApps ? " — has applications" : ""}`}
            aria-pressed={isSelected}
          >
            <span className="tabular-nums">{yearData.year}</span>

            {/* Activity dots */}
            <span className="flex gap-0.5">
              {hasHunts && <span className="w-1.5 h-1.5 rounded-full bg-success" />}
              {hasApps && <span className="w-1.5 h-1.5 rounded-full bg-info" />}
              {hasPoints && !hasHunts && !hasApps && <span className="w-1.5 h-1.5 rounded-full bg-warning" />}
            </span>

            {/* Current year marker */}
            {isCurrent && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-destructive lg:block hidden" />
            )}
          </button>
        );
      })}
    </div>
  );
}
