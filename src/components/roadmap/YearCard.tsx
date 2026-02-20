"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";
import { MoveCard } from "./MoveCard";
import type { RoadmapYear, YearType } from "@/lib/types";
import { YEAR_TYPE_LABELS, migratePhaseToYearType } from "@/lib/types";
import { cn } from "@/lib/utils";

const YEAR_TYPE_COLORS: Record<YearType, string> = {
  build: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  positioning: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  burn: "bg-primary/15 text-primary border-primary/30",
  recovery: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  youth_window: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

interface YearCardProps {
  year: RoadmapYear;
  defaultExpanded?: boolean;
}

export function YearCard({ year, defaultExpanded = false }: YearCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const yearType = migratePhaseToYearType(year.phase);
  const label = year.phaseLabel ?? YEAR_TYPE_LABELS[yearType];
  const colors = YEAR_TYPE_COLORS[yearType];
  const huntCount = year.actions.filter((a) => a.type === "hunt").length;

  return (
    <Card className="border-border/30">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left"
        aria-expanded={expanded}
      >
        <CardContent className="p-4 flex items-center gap-3">
          {/* Year number */}
          <div className="text-lg font-bold tabular-nums text-foreground/80 w-12 shrink-0">
            {year.year}
          </div>

          {/* Phase badge */}
          <span
            className={cn(
              "inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-semibold border",
              colors,
            )}
          >
            {label}
          </span>

          {/* Summary */}
          <div className="flex-1 min-w-0 flex items-center gap-3 text-xs text-muted-foreground">
            <span>{year.actions.length} moves</span>
            {huntCount > 0 && (
              <span className="text-primary font-medium">{huntCount} hunt{huntCount > 1 ? "s" : ""}</span>
            )}
          </div>

          {/* Cost */}
          <span className="text-sm font-medium tabular-nums">
            ${year.estimatedCost.toLocaleString()}
          </span>

          {/* Expand */}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
        </CardContent>
      </button>

      {expanded && year.actions.length > 0 && (
        <div className="px-4 pb-4 space-y-2">
          {year.actions.map((action, i) => (
            <MoveCard key={`${action.stateId}-${action.speciesId}-${action.type}-${i}`} action={action} />
          ))}
        </div>
      )}
    </Card>
  );
}
