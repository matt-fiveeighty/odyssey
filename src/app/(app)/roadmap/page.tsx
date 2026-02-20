"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Route, ArrowRight } from "lucide-react";
import { useRoadmapStore, useAppStore } from "@/lib/store";
import { BoardStateHeader } from "@/components/roadmap/BoardStateHeader";
import { DisciplineAlerts } from "@/components/roadmap/DisciplineAlerts";
import { RoadmapTimeline } from "@/components/roadmap/RoadmapTimeline";
import { StateYearGrid } from "@/components/roadmap/StateYearGrid";
import { computeBoardState } from "@/lib/engine/board-state";
import { evaluateDisciplineRules } from "@/lib/engine/discipline-rules";

export default function RoadmapPage() {
  const activeAssessment = useRoadmapStore((s) => s.activeAssessment);
  const portfolioMandate = useRoadmapStore((s) => s.portfolioMandate);
  const userPoints = useAppStore((s) => s.userPoints);

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
      {/* Board State Header */}
      {boardState && <BoardStateHeader boardState={boardState} />}

      {/* Discipline Alerts */}
      <DisciplineAlerts violations={violations} />

      {/* State × Year Grid — scrollable state view with hover */}
      <StateYearGrid roadmap={activeAssessment.roadmap} />

      {/* Roadmap Timeline */}
      <RoadmapTimeline roadmap={activeAssessment.roadmap} />
    </div>
  );
}
