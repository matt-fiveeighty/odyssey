"use client";

import { useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Map as MapIcon,
  Target,
  Zap,
  ChevronRight,
  Lock,
  Milestone,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { STATES_MAP } from "@/lib/constants/states";
import { SPECIES_MAP } from "@/lib/constants/species";
import {
  estimateCreepRate,
  yearsToDrawWithCreep,
} from "@/lib/engine/point-creep";
import { SAMPLE_UNITS } from "@/lib/constants/sample-units";

interface YearNodeData {
  year: number;
  hunts: Array<{
    stateId: string;
    speciesId: string;
    unitCode: string;
    type: "hunt" | "application" | "point_purchase";
  }>;
  unlocks: Array<{
    stateId: string;
    speciesId: string;
    unitCode: string;
    unitName: string;
  }>;
  pointMilestones: Array<{
    stateId: string;
    speciesId: string;
    points: number;
  }>;
}

export default function JourneyPage() {
  const { confirmedAssessment, userPoints } = useAppStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentYear = new Date().getFullYear();

  // Build timeline data
  const timelineData = useMemo(() => {
    const years: YearNodeData[] = [];

    // Build point projections for each state/species combo
    const pointProjections = new Map<string, number>();
    for (const pt of userPoints) {
      pointProjections.set(`${pt.stateId}-${pt.speciesId}`, pt.points);
    }

    for (let yearOffset = 0; yearOffset < 15; yearOffset++) {
      const year = currentYear + yearOffset;
      const node: YearNodeData = {
        year,
        hunts: [],
        unlocks: [],
        pointMilestones: [],
      };

      // Check roadmap for planned hunts
      if (confirmedAssessment?.roadmap) {
        const roadmapYear = confirmedAssessment.roadmap.find(
          (ry) => ry.year === year
        );
        if (roadmapYear) {
          for (const action of roadmapYear.actions) {
            if (action.type === "hunt") {
              node.hunts.push({
                stateId: action.stateId,
                speciesId: action.speciesId,
                unitCode: action.unitCode ?? "",
                type: "hunt",
              });
            } else if (action.type === "apply") {
              node.hunts.push({
                stateId: action.stateId,
                speciesId: action.speciesId,
                unitCode: action.unitCode ?? "",
                type: "application",
              });
            }
          }
        }
      }

      // Check unit unlocks at this year
      for (const unit of SAMPLE_UNITS) {
        const key = `${unit.stateId}-${unit.speciesId}`;
        const currentPts = (pointProjections.get(key) ?? 0) + yearOffset;
        const required = unit.pointsRequiredNonresident;

        if (required > 0) {
          const creepRate = estimateCreepRate(unit.trophyRating);
          const prevPts = currentPts - 1;
          const prevYears = yearsToDrawWithCreep(
            prevPts > 0 ? prevPts : 0,
            required,
            creepRate
          );
          const nowYears = yearsToDrawWithCreep(
            currentPts,
            required,
            creepRate
          );

          // Unit becomes drawable at this point threshold
          if (prevYears > 0 && nowYears === 0) {
            node.unlocks.push({
              stateId: unit.stateId,
              speciesId: unit.speciesId,
              unitCode: unit.unitCode,
              unitName: unit.unitName ?? unit.unitCode,
            });
          }
        }
      }

      // Point milestones (every 5 points)
      for (const [key, basePts] of pointProjections) {
        const projected = basePts + yearOffset;
        if (projected > 0 && projected % 5 === 0) {
          const [stateId, speciesId] = key.split("-");
          node.pointMilestones.push({
            stateId,
            speciesId,
            points: projected,
          });
        }
      }

      years.push(node);
    }

    return years;
  }, [confirmedAssessment, userPoints, currentYear]);

  const hasData =
    confirmedAssessment !== null || userPoints.length > 0;

  return (
    <div className="p-6 space-y-6 fade-in-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <MapIcon className="w-6 h-6 text-primary" />
          Journey Map
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your 15-year hunting timeline — point accumulation, unit unlocks, and
          planned hunts
        </p>
      </div>

      {!hasData ? (
        <Card className="bg-card border-border">
          <CardContent className="p-12 text-center">
            <MapIcon className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              No journey data yet
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Complete a strategic assessment or add your points portfolio to see
              your hunting journey unfold across a 15-year timeline.
            </p>
          </CardContent>
        </Card>
      ) : (
        /* Horizontal scroll timeline */
        <div
          ref={scrollRef}
          className="overflow-x-auto pb-4 -mx-6 px-6 scroll-smooth snap-x snap-mandatory"
        >
          <div className="flex gap-4 min-w-max">
            {timelineData.map((yearData, idx) => {
              const hasActivity =
                yearData.hunts.length > 0 ||
                yearData.unlocks.length > 0 ||
                yearData.pointMilestones.length > 0;
              const isCurrentYear = yearData.year === currentYear;

              return (
                <div
                  key={yearData.year}
                  className="snap-start shrink-0 w-56"
                >
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
                      {yearData.year.toString().slice(-2)}
                    </div>
                    {idx < timelineData.length - 1 && (
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
                        {yearData.year}
                        {isCurrentYear && (
                          <span className="text-[8px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
                            NOW
                          </span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-2">
                      {/* Hunts */}
                      {yearData.hunts.map((hunt, i) => {
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
                      {yearData.unlocks.map((unlock, i) => {
                        const state = STATES_MAP[unlock.stateId];
                        return (
                          <div
                            key={`unlock-${i}`}
                            className="flex items-center gap-1.5 text-[10px] text-green-400"
                          >
                            <Lock className="w-3 h-3 shrink-0" />
                            <span className="truncate">
                              🔓 {state?.abbreviation} {unlock.unitCode}{" "}
                              unlocked
                            </span>
                          </div>
                        );
                      })}

                      {/* Point milestones */}
                      {yearData.pointMilestones.map((pm, i) => {
                        const state = STATES_MAP[pm.stateId];
                        const species = SPECIES_MAP[pm.speciesId];
                        return (
                          <div
                            key={`milestone-${i}`}
                            className="flex items-center gap-1.5 text-[10px] text-purple-400"
                          >
                            <Milestone className="w-3 h-3 shrink-0" />
                            <span className="truncate">
                              {state?.abbreviation} {species?.name ?? pm.speciesId}:{" "}
                              {pm.points} pts
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
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      {hasData && (
        <div className="flex flex-wrap gap-4 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Target className="w-3 h-3 text-red-400" />
            <span>Planned Hunt</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Application</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-green-400" />
            <span>Unit Unlock</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Milestone className="w-3 h-3 text-purple-400" />
            <span>Point Milestone</span>
          </div>
        </div>
      )}
    </div>
  );
}
