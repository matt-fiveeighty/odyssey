"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Trophy,
  Target,
  Users,
  ArrowRight,
} from "lucide-react";
import type { Unit } from "@/lib/types";
import type { AlternateUnit } from "@/lib/engine/unit-alternates";

const TRADEOFF_STYLES: Record<
  AlternateUnit["tradeoffType"],
  { bg: string; text: string; label: string }
> = {
  higher_success: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    label: "Higher Success",
  },
  fewer_points: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    label: "Fewer Points",
  },
  lower_pressure: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    label: "Lower Pressure",
  },
  different_terrain: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    label: "Different Terrain",
  },
  nearby_state: {
    bg: "bg-chart-1/10",
    text: "text-chart-1",
    label: "Nearby State",
  },
};

interface AlternateUnitsAccordionProps {
  primaryUnit: Unit;
  alternates: AlternateUnit[];
}

export default function AlternateUnitsAccordion({
  primaryUnit,
  alternates,
}: AlternateUnitsAccordionProps) {
  const [expanded, setExpanded] = useState(false);

  if (alternates.length === 0) return null;

  return (
    <div className="space-y-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        {expanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
        <span>
          {expanded ? "Hide" : "See"} {alternates.length} Alternate Unit
          {alternates.length !== 1 ? "s" : ""}
        </span>
      </button>

      {expanded && (
        <div className="space-y-3 fade-in-up">
          {alternates.map((alt) => {
            const style = TRADEOFF_STYLES[alt.tradeoffType];
            return (
              <Card
                key={alt.unit.id}
                className="bg-card border-border hover:border-primary/20 transition-colors"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm font-semibold">
                          Unit {alt.unit.unitCode}
                        </span>
                        {alt.unit.unitName && (
                          <span className="text-xs text-muted-foreground">
                            {alt.unit.unitName}
                          </span>
                        )}
                        {alt.unit.stateId !== primaryUnit.stateId && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-medium">
                            {alt.unit.stateId}
                          </span>
                        )}
                      </div>

                      {/* Tradeoff badge + summary */}
                      <div className="flex items-start gap-2 mb-2">
                        <span
                          className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}
                        >
                          {style.label}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {alt.tradeoffSummary}
                        </p>
                      </div>

                      {/* Key stats */}
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-primary" />
                          {Math.round(alt.unit.successRate * 100)}% success
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Trophy className="w-3 h-3 text-chart-2" />
                          {alt.unit.trophyRating}/10 trophy
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Target className="w-3 h-3 text-chart-4" />
                          {alt.unit.pointsRequiredNonresident} pts NR
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {alt.unit.pressureLevel}
                        </span>
                      </div>
                    </div>

                    {/* Link to profile */}
                    <Link
                      href={`/units/${alt.unit.id}`}
                      className="shrink-0 w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors"
                      aria-label={`View Unit ${alt.unit.unitCode} profile`}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
