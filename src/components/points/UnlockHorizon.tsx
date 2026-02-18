"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Zap, CalendarClock, Hourglass, Infinity } from "lucide-react";
import type { UserPoints } from "@/lib/types";
import { SAMPLE_UNITS } from "@/lib/constants/sample-units";
import { STATES_MAP } from "@/lib/constants/states";
import { SPECIES_MAP } from "@/lib/constants/species";
import {
  estimateCreepRate,
  yearsToDrawWithCreep,
} from "@/lib/engine/point-creep";

interface UnlockHorizonProps {
  stateId: string;
  points: UserPoints[];
}

interface HorizonUnit {
  unitCode: string;
  unitName: string;
  speciesId: string;
  yearsToUnlock: number;
  pointsNeeded: number;
  currentPoints: number;
  successRate: number;
  trophyRating: number;
}

const HORIZONS = [
  {
    key: "thisYear" as const,
    label: "This Year",
    icon: Zap,
    color: "text-green-400",
    bg: "bg-green-400/10",
    borderColor: "border-green-400/20",
    description: "Drawable now",
  },
  {
    key: "shortTerm" as const,
    label: "1-3 Years",
    icon: Clock,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    borderColor: "border-blue-400/20",
    description: "Short-term targets",
  },
  {
    key: "midTerm" as const,
    label: "3-7 Years",
    icon: CalendarClock,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    borderColor: "border-amber-400/20",
    description: "Mid-term goals",
  },
  {
    key: "longTerm" as const,
    label: "7+ Years",
    icon: Hourglass,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    borderColor: "border-purple-400/20",
    description: "Long-term investments",
  },
];

export function UnlockHorizon({ stateId, points }: UnlockHorizonProps) {
  const horizons = useMemo(() => {
    const state = STATES_MAP[stateId];
    if (!state) return null;

    // Get all units for this state
    const stateUnits = SAMPLE_UNITS.filter((u) => u.stateId === stateId);
    if (stateUnits.length === 0) return null;

    // Build point lookup: speciesId → points
    const pointLookup = new Map<string, number>();
    for (const pt of points) {
      pointLookup.set(pt.speciesId, pt.points);
    }

    // Random draw states: everything is in "thisYear"
    const isRandom = state.pointSystem === "random";

    const buckets: Record<string, HorizonUnit[]> = {
      thisYear: [],
      shortTerm: [],
      midTerm: [],
      longTerm: [],
    };

    for (const unit of stateUnits) {
      const userPts = pointLookup.get(unit.speciesId) ?? 0;
      const required = unit.pointsRequiredNonresident;

      let years: number;
      if (isRandom || required === 0) {
        years = 0;
      } else {
        const creepRate = estimateCreepRate(unit.trophyRating);
        years = yearsToDrawWithCreep(userPts, required, creepRate);
      }

      const pointsNeeded = Math.max(0, required - userPts);

      const entry: HorizonUnit = {
        unitCode: unit.unitCode,
        unitName: unit.unitName ?? unit.unitCode,
        speciesId: unit.speciesId,
        yearsToUnlock: years,
        pointsNeeded,
        currentPoints: userPts,
        successRate: unit.successRate,
        trophyRating: unit.trophyRating,
      };

      if (years === 0) {
        buckets.thisYear.push(entry);
      } else if (years <= 3) {
        buckets.shortTerm.push(entry);
      } else if (years <= 7) {
        buckets.midTerm.push(entry);
      } else {
        buckets.longTerm.push(entry);
      }
    }

    // Sort each bucket by years ascending, then trophy descending
    for (const key of Object.keys(buckets)) {
      buckets[key].sort(
        (a, b) => a.yearsToUnlock - b.yearsToUnlock || b.trophyRating - a.trophyRating
      );
    }

    return buckets;
  }, [stateId, points]);

  if (!horizons) return null;

  const hasAny = Object.values(horizons).some((arr) => arr.length > 0);
  if (!hasAny) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Infinity className="w-3.5 h-3.5" />
        Unlock Horizons
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {HORIZONS.map((horizon) => {
          const units = horizons[horizon.key];
          if (units.length === 0) return null;

          return (
            <Card
              key={horizon.key}
              className={`${horizon.borderColor} border bg-card/50`}
            >
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                  <horizon.icon className={`w-3.5 h-3.5 ${horizon.color}`} />
                  <span>{horizon.label}</span>
                  <span className={`ml-auto text-[10px] ${horizon.bg} ${horizon.color} px-1.5 py-0.5 rounded-full`}>
                    {units.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <div className="space-y-1">
                  {units.slice(0, 3).map((u) => {
                    const species = SPECIES_MAP[u.speciesId];
                    return (
                      <div
                        key={`${u.unitCode}-${u.speciesId}`}
                        className="flex items-center justify-between text-[10px]"
                      >
                        <span className="text-muted-foreground truncate mr-2">
                          {species?.name ?? u.speciesId} {u.unitCode}
                        </span>
                        <span className="font-medium whitespace-nowrap">
                          {u.yearsToUnlock === 0
                            ? "Now"
                            : `~${u.yearsToUnlock}yr`}
                        </span>
                      </div>
                    );
                  })}
                  {units.length > 3 && (
                    <p className="text-[10px] text-muted-foreground/60">
                      +{units.length - 3} more
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
