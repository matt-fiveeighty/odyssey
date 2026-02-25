"use client";

import { useMemo } from "react";
import type { StrategicAssessment, YearStatusTicker, AnnualStatusTag } from "@/lib/types";
import { computeStatusTicker } from "@/lib/engine/capital-allocator";

interface StatusTickerProps {
  assessment: StrategicAssessment;
}

const TAG_STYLES: Record<AnnualStatusTag, { bg: string; text: string; label: string }> = {
  build:    { bg: "bg-chart-2/15", text: "text-chart-2", label: "BUILD" },
  lottery:  { bg: "bg-chart-4/15", text: "text-chart-4", label: "LOTTERY" },
  dividend: { bg: "bg-chart-3/15", text: "text-chart-3", label: "DIVIDEND" },
  burn:     { bg: "bg-primary/15",  text: "text-primary",  label: "BURN" },
  recovery: { bg: "bg-muted/30",    text: "text-muted-foreground", label: "RECOVERY" },
};

export function StatusTicker({ assessment }: StatusTickerProps) {
  const tickers = useMemo(
    () => computeStatusTicker(assessment.roadmap),
    [assessment.roadmap],
  );

  const currentYear = new Date().getFullYear();
  const currentTicker = tickers.find((t) => t.year === currentYear) ?? tickers[0];
  if (!currentTicker) return null;

  return (
    <div className="w-full rounded-xl border border-border/50 bg-gradient-to-r from-secondary/60 via-secondary/30 to-transparent p-3 flex items-center gap-3 overflow-x-auto">
      {/* Year badge */}
      <div className="shrink-0 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold text-sm font-financial">
        {currentTicker.year}
      </div>

      {/* Status tags */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {currentTicker.entries.map((entry) => {
          const style = TAG_STYLES[entry.tag];
          return (
            <span
              key={`${entry.stateId}-${entry.tag}`}
              className={`${style.bg} ${style.text} text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md whitespace-nowrap`}
            >
              {style.label} {entry.label}
            </span>
          );
        })}
      </div>

      {/* Mini timeline dots for all years */}
      <div className="ml-auto flex items-center gap-0.5 shrink-0">
        {tickers.map((t) => {
          const isCurrent = t.year === currentYear;
          const hasHunt = t.entries.some((e) => e.tag === "burn" || e.tag === "dividend");
          return (
            <div
              key={t.year}
              className={`rounded-full transition-all ${
                isCurrent
                  ? "w-2.5 h-2.5 bg-primary"
                  : hasHunt
                    ? "w-1.5 h-1.5 bg-chart-3/60"
                    : "w-1.5 h-1.5 bg-muted-foreground/20"
              }`}
              title={`${t.year}: ${t.summary}`}
            />
          );
        })}
      </div>
    </div>
  );
}
