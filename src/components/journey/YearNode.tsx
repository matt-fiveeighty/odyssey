"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Zap, ChevronRight, Milestone } from "lucide-react";
import { STATES_MAP } from "@/lib/constants/states";
import { SPECIES_MAP } from "@/lib/constants/species";
import { UnlockMarker } from "./UnlockMarker";

interface YearNodeHunt {
  stateId: string;
  speciesId: string;
  unitCode: string;
  type: "hunt" | "application" | "point_purchase";
}

interface YearNodeUnlock {
  stateId: string;
  speciesId: string;
  unitCode: string;
  unitName: string;
}

interface YearNodePointMilestone {
  stateId: string;
  speciesId: string;
  points: number;
}

interface YearNodeProps {
  year: number;
  hunts: YearNodeHunt[];
  unlocks: YearNodeUnlock[];
  pointMilestones: YearNodePointMilestone[];
  isCurrentYear: boolean;
  showConnector: boolean;
}

export function YearNode({
  year,
  hunts,
  unlocks,
  pointMilestones,
  isCurrentYear,
  showConnector,
}: YearNodeProps) {
  const hasActivity =
    hunts.length > 0 || unlocks.length > 0 || pointMilestones.length > 0;

  return (
    <div className="snap-start shrink-0 w-56">
      {/* Year connector line */}
      <div className="flex items-center mb-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
            isCurrentYear
              ? "bg-primary text-primary-foreground border-primary"
              : hasActivity
                ? "bg-primary/15 text-primary border-primary/30"
                : "bg-secondary text-muted-foreground border-border"
          }`}
        >
          {year.toString().slice(-2)}
        </div>
        {showConnector && (
          <div className="flex-1 h-px bg-border ml-2 relative">
            <ChevronRight className="w-3 h-3 text-border absolute right-0 -top-1.5" />
          </div>
        )}
      </div>

      <Card
        className={`bg-card border-border h-full ${
          isCurrentYear ? "ring-1 ring-primary/30" : ""
        }`}
      >
        <CardHeader className="p-3 pb-1">
          <CardTitle className="text-xs font-medium flex items-center gap-1.5">
            {year}
            {isCurrentYear && (
              <span className="text-[8px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
                NOW
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-2">
          {/* Hunts & applications */}
          {hunts.map((hunt, i) => {
            const state = STATES_MAP[hunt.stateId];
            const species = SPECIES_MAP[hunt.speciesId];
            return (
              <div
                key={`hunt-${i}`}
                className="flex items-center gap-1.5 text-[10px]"
              >
                {hunt.type === "hunt" ? (
                  <Target className="w-3 h-3 text-red-400 shrink-0" />
                ) : (
                  <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                )}
                <span
                  className="w-5 h-5 rounded text-[8px] font-bold text-white flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: state?.color ?? "#666",
                  }}
                >
                  {state?.abbreviation ?? hunt.stateId}
                </span>
                <span className="truncate">
                  {species?.name ?? hunt.speciesId}
                  {hunt.unitCode ? ` ${hunt.unitCode}` : ""}
                </span>
              </div>
            );
          })}

          {/* Unlocks */}
          {unlocks.map((unlock, i) => (
            <UnlockMarker
              key={`unlock-${i}`}
              stateId={unlock.stateId}
              unitCode={unlock.unitCode}
              unitName={unlock.unitName}
            />
          ))}

          {/* Point milestones */}
          {pointMilestones.map((pm, i) => {
            const state = STATES_MAP[pm.stateId];
            const species = SPECIES_MAP[pm.speciesId];
            return (
              <div
                key={`milestone-${i}`}
                className="flex items-center gap-1.5 text-[10px] text-purple-400"
              >
                <Milestone className="w-3 h-3 shrink-0" />
                <span className="truncate">
                  {state?.abbreviation ?? pm.stateId}{" "}
                  {species?.name ?? pm.speciesId}: {pm.points} pts
                </span>
              </div>
            );
          })}

          {!hasActivity && (
            <p className="text-[10px] text-muted-foreground/40 py-2">
              Building points...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
