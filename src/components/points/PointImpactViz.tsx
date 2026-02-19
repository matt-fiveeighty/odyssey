"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, ArrowRight, TrendingUp } from "lucide-react";
import { SAMPLE_UNITS } from "@/lib/constants/sample-units";
import { STATES_MAP } from "@/lib/constants/states";
import { SPECIES_MAP } from "@/lib/constants/species";
import {
  estimateCreepRate,
  yearsToDrawWithCreep,
} from "@/lib/engine/point-creep";
import { resolveFees } from "@/lib/engine/fee-resolver";
import { useWizardStore } from "@/lib/store";

interface PointImpactVizProps {
  stateId: string;
  speciesId: string;
  currentPoints: number;
}

interface ImpactUnit {
  unitCode: string;
  unitName: string;
  yearsBefore: number;
  yearsAfter: number;
  yearsSaved: number;
  trophyRating: number;
  successRate: number;
}

/**
 * Shows what buying 1 more point unlocks — units that become
 * drawable sooner or move into a new horizon bucket.
 */
export function PointImpactViz({
  stateId,
  speciesId,
  currentPoints,
}: PointImpactVizProps) {
  const impacts = useMemo(() => {
    const state = STATES_MAP[stateId];
    if (!state || state.pointSystem === "random") return [];

    const units = SAMPLE_UNITS.filter(
      (u) => u.stateId === stateId && u.speciesId === speciesId
    );

    const results: ImpactUnit[] = [];

    for (const unit of units) {
      const required = unit.pointsRequiredNonresident;
      if (required === 0) continue; // Already drawable regardless

      const creepRate = estimateCreepRate(unit.trophyRating);
      const yearsBefore = yearsToDrawWithCreep(currentPoints, required, creepRate);
      const yearsAfter = yearsToDrawWithCreep(currentPoints + 1, required, creepRate);
      const yearsSaved = yearsBefore - yearsAfter;

      if (yearsSaved > 0) {
        results.push({
          unitCode: unit.unitCode,
          unitName: unit.unitName ?? unit.unitCode,
          yearsBefore,
          yearsAfter,
          yearsSaved,
          trophyRating: unit.trophyRating,
          successRate: unit.successRate,
        });
      }
    }

    // Sort by impact: units where 1 point makes the biggest difference
    results.sort((a, b) => b.yearsSaved - a.yearsSaved || b.trophyRating - a.trophyRating);

    return results.slice(0, 5);
  }, [stateId, speciesId, currentPoints]);

  const homeState = useWizardStore((s) => s.homeState);

  if (impacts.length === 0) return null;

  const species = SPECIES_MAP[speciesId];
  const state = STATES_MAP[stateId];
  const pointCost = state ? (resolveFees(state, homeState).pointCost[speciesId] ?? 0) : 0;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          What 1 More Point Unlocks
          {pointCost > 0 && (
            <span className="text-[10px] text-muted-foreground font-normal ml-auto">
              ${pointCost} investment
            </span>
          )}
        </CardTitle>
        <p className="text-[10px] text-muted-foreground">
          Impact of buying 1 additional {species?.name ?? speciesId} point in {state?.abbreviation ?? stateId}
        </p>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2">
        {impacts.map((impact) => (
          <div
            key={impact.unitCode}
            className="flex items-center gap-3 p-2 rounded-lg bg-card/50 border border-border/50"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium truncate">
                  Unit {impact.unitCode}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {impact.unitName}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[10px] text-muted-foreground">
                  Trophy: {impact.trophyRating}/10
                </span>
                <span className="text-[10px] text-muted-foreground">
                  &middot; {Math.round(impact.successRate * 100)}% success
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-muted-foreground">
                {impact.yearsBefore === 0 ? "Now" : `${impact.yearsBefore}yr`}
              </span>
              <ArrowRight className="w-3 h-3 text-primary" />
              <span className="text-xs font-bold text-primary">
                {impact.yearsAfter === 0 ? "Now" : `${impact.yearsAfter}yr`}
              </span>
            </div>
            <div className="flex items-center gap-0.5 text-success shrink-0">
              <TrendingUp className="w-3 h-3" />
              <span className="text-[10px] font-bold">
                {impact.yearsSaved > 1 ? `-${impact.yearsSaved}yr` : "-1yr"}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
