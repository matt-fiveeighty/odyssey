"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Route, ArrowRight, Pencil, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRoadmapStore, useAppStore } from "@/lib/store";
import { BoardStateHeader } from "@/components/roadmap/BoardStateHeader";
import { DisciplineAlerts } from "@/components/roadmap/DisciplineAlerts";
import { ApplicationStatusBoard } from "@/components/roadmap/ApplicationStatusBoard";
import { RoadmapTimeline } from "@/components/roadmap/RoadmapTimeline";
import { PlanManager } from "@/components/roadmap/PlanManager";
import { InteractiveMap } from "@/components/journey/InteractiveMap";
import { YearTimeline } from "@/components/journey/YearTimeline";
import { MapLegend } from "@/components/journey/MapLegend";
import { StateDetailModal } from "@/components/journey/StateDetailModal";
import { buildJourneyData } from "@/lib/engine/journey-data";
import { computeBoardState } from "@/lib/engine/board-state";
import { evaluateDisciplineRules } from "@/lib/engine/discipline-rules";

export default function RoadmapPage() {
  const activeAssessment = useRoadmapStore((s) => s.activeAssessment);
  const portfolioMandate = useRoadmapStore((s) => s.portfolioMandate);
  const userPoints = useAppStore((s) => s.userPoints);

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);

  // Compute discipline violations and board state on the fly
  const violations = useMemo(() => {
    if (!activeAssessment) return [];
    return evaluateDisciplineRules(activeAssessment, portfolioMandate ?? undefined, userPoints);
  }, [activeAssessment, portfolioMandate, userPoints]);

  const boardState = useMemo(() => {
    if (!activeAssessment) return null;
    return computeBoardState(
      activeAssessment,
      portfolioMandate ?? undefined,
      violations,
      userPoints,
    );
  }, [activeAssessment, portfolioMandate, violations, userPoints]);

  // Build journey data for the interactive map
  const journeyData = useMemo(
    () => buildJourneyData(activeAssessment?.roadmap ?? [], userPoints),
    [activeAssessment, userPoints],
  );

  const selectedYearData = useMemo(
    () => journeyData.years.find((y) => y.year === selectedYear) ?? null,
    [journeyData, selectedYear],
  );

  // No plan state
  if (!activeAssessment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Route className="w-8 h-8 text-primary" />
        </div>
        <div className="text-center max-w-md">
          <h1 className="text-xl font-semibold mb-2">No roadmap yet</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Build your multi-year strategy. Every point dollar, every burn window,
            every conversion opportunity — mapped and managed.
          </p>
        </div>
        <Link
          href="/plan-builder"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Build Your Roadmap
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 fade-in-up">
      {/* Top bar: plan switcher + plan actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PlanManager />
        <div className="flex items-center gap-2">
          <Link href="/plan-builder">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Pencil className="w-3.5 h-3.5" />
              Edit Plan
            </Button>
          </Link>
          <Link href="/plan-builder">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <RefreshCw className="w-3.5 h-3.5" />
              Rebuild
            </Button>
          </Link>
        </div>
      </div>

      {/* Board State Header — position / health at top */}
      {boardState && <BoardStateHeader boardState={boardState} />}

      {/* Discipline Alerts — surface issues early */}
      <DisciplineAlerts violations={violations} />

      {/* Interactive State Map — click a state for details, year selector on right */}
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
      <MapLegend />

      {/* Two-column dashboard: Applications (left) + Roadmap Timeline (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="min-w-0">
          <ApplicationStatusBoard assessment={activeAssessment} />
        </div>
        <div className="min-w-0">
          <RoadmapTimeline roadmap={activeAssessment.roadmap} />
        </div>
      </div>

      {/* State Detail Modal */}
      <StateDetailModal
        stateId={selectedStateId}
        onClose={() => setSelectedStateId(null)}
        journeyData={journeyData}
        assessment={activeAssessment}
      />
    </div>
  );
}
