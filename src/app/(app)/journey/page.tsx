"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Map as MapIcon,
  Target,
  Zap,
  Lock,
  Milestone,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { SAMPLE_UNITS } from "@/lib/constants/sample-units";
import {
  estimateCreepRate,
  yearsToDrawWithCreep,
} from "@/lib/engine/point-creep";
import { buildJourneyData } from "@/lib/engine/journey-data";
import { JourneyTimeline } from "@/components/journey/JourneyTimeline";
import { PointAccumulationTrack } from "@/components/journey/PointAccumulationTrack";

export default function JourneyPage() {
  const { confirmedAssessment, userPoints } = useAppStore();
  const currentYear = new Date().getFullYear();

  // Build journey data from engine
  const journeyData = useMemo(
    () =>
      buildJourneyData(
        confirmedAssessment?.roadmap ?? [],
        userPoints
      ),
    [confirmedAssessment, userPoints]
  );

  // Build the legacy timeline data structure that JourneyTimeline + YearNode expect.
  // This preserves pixel-identical rendering with the original inline implementation.
  const timelineData = useMemo(() => {
    const pointProjections = new Map<string, number>();
    for (const pt of userPoints) {
      pointProjections.set(`${pt.stateId}-${pt.speciesId}`, pt.points);
    }

    return Array.from({ length: 15 }, (_, yearOffset) => {
      const year = currentYear + yearOffset;

      // Hunts + applications from roadmap
      const hunts: {
        stateId: string;
        speciesId: string;
        unitCode: string;
        type: "hunt" | "application" | "point_purchase";
      }[] = [];

      if (confirmedAssessment?.roadmap) {
        const roadmapYear = confirmedAssessment.roadmap.find(
          (ry) => ry.year === year
        );
        if (roadmapYear) {
          for (const action of roadmapYear.actions) {
            if (action.type === "hunt") {
              hunts.push({
                stateId: action.stateId,
                speciesId: action.speciesId,
                unitCode: action.unitCode ?? "",
                type: "hunt",
              });
            } else if (action.type === "apply") {
              hunts.push({
                stateId: action.stateId,
                speciesId: action.speciesId,
                unitCode: action.unitCode ?? "",
                type: "application",
              });
            }
          }
        }
      }

      // Unit unlocks
      const unlocks: {
        stateId: string;
        speciesId: string;
        unitCode: string;
        unitName: string;
      }[] = [];

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

          if (prevYears > 0 && nowYears === 0) {
            unlocks.push({
              stateId: unit.stateId,
              speciesId: unit.speciesId,
              unitCode: unit.unitCode,
              unitName: unit.unitName ?? unit.unitCode,
            });
          }
        }
      }

      // Point milestones (every 5 points)
      const pointMilestones: {
        stateId: string;
        speciesId: string;
        points: number;
      }[] = [];

      for (const [key, basePts] of pointProjections) {
        const projected = basePts + yearOffset;
        if (projected > 0 && projected % 5 === 0) {
          const [stateId, speciesId] = key.split("-");
          pointMilestones.push({ stateId, speciesId, points: projected });
        }
      }

      return { year, hunts, unlocks, pointMilestones };
    });
  }, [confirmedAssessment, userPoints, currentYear]);

  const hasData = confirmedAssessment !== null || userPoints.length > 0;

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
        <>
          {/* Horizontal scroll timeline */}
          <JourneyTimeline
            timelineData={timelineData}
            currentYear={currentYear}
          />

          {/* Point accumulation tracks */}
          {journeyData.pointTracks.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-muted-foreground">
                Point Accumulation
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {journeyData.pointTracks.map((track) => (
                  <Card
                    key={`${track.stateId}-${track.speciesId}`}
                    className="bg-card border-border p-3"
                  >
                    <PointAccumulationTrack track={track} />
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
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
