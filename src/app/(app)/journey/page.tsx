"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Map as MapIcon } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { buildJourneyData } from "@/lib/engine/journey-data";
import { InteractiveMap } from "@/components/journey/InteractiveMap";
import { YearTimeline } from "@/components/journey/YearTimeline";
import { MapLegend } from "@/components/journey/MapLegend";
import { StateDetailModal } from "@/components/journey/StateDetailModal";
import { PointAccumulationTrack } from "@/components/journey/PointAccumulationTrack";

export default function JourneyPage() {
  const { confirmedAssessment, userPoints } = useAppStore();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);

  // Build journey data from engine
  const journeyData = useMemo(
    () =>
      buildJourneyData(
        confirmedAssessment?.roadmap ?? [],
        userPoints
      ),
    [confirmedAssessment, userPoints]
  );

  // Year data for the currently selected year
  const selectedYearData = useMemo(
    () => journeyData.years.find((y) => y.year === selectedYear) ?? null,
    [journeyData, selectedYear]
  );

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
          Your 15-year hunting timeline — click a state for details, select a year to see your plan
        </p>
      </div>

      {!hasData ? (
        <>
          {/* Show map in baseline mode even with no data */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_80px] gap-4">
            <InteractiveMap
              yearData={null}
              onStateClick={setSelectedStateId}
              selectedYear={selectedYear}
            />
            <YearTimeline
              years={journeyData.years}
              selectedYear={selectedYear}
              onYearSelect={setSelectedYear}
              currentYear={currentYear}
            />
          </div>
          <MapLegend />

          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center">
              <MapIcon className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-2">
                No journey data yet
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Complete a strategic assessment to see your states light up with hunts,
                draw entries, and point-building actions across the timeline.
              </p>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Map + Year Timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_80px] gap-4">
            <InteractiveMap
              yearData={selectedYearData}
              onStateClick={setSelectedStateId}
              selectedYear={selectedYear}
            />
            <YearTimeline
              years={journeyData.years}
              selectedYear={selectedYear}
              onYearSelect={setSelectedYear}
              currentYear={currentYear}
            />
          </div>

          {/* Legend */}
          <MapLegend />

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

      {/* State Detail Modal */}
      <StateDetailModal
        stateId={selectedStateId}
        onClose={() => setSelectedStateId(null)}
        journeyData={journeyData}
      />
    </div>
  );
}
