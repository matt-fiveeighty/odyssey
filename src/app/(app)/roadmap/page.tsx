"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Route, ArrowRight, Pencil, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRoadmapStore, useAppStore } from "@/lib/store";
import { PlanManager } from "@/components/roadmap/PlanManager";
import { YearPills } from "@/components/roadmap/dashboard/YearPills";
import { DashboardCard } from "@/components/roadmap/dashboard/DashboardCard";
import { ActiveFilters, type FilterState } from "@/components/roadmap/dashboard/ActiveFilters";
import { RoadmapActionList, type RoadmapActionItem } from "@/components/roadmap/dashboard/RoadmapActionList";
import { RoadmapActionDetail } from "@/components/roadmap/dashboard/RoadmapActionDetail";
import { MapOverlay } from "@/components/roadmap/dashboard/MapOverlay";
import { StateDetailModal } from "@/components/journey/StateDetailModal";
import { buildJourneyData } from "@/lib/engine/journey-data";
import { computeBoardState } from "@/lib/engine/board-state";
import { evaluateDisciplineRules } from "@/lib/engine/discipline-rules";
import { formatSpeciesName } from "@/lib/utils";
import { STATES_MAP } from "@/lib/constants/states";

export default function RoadmapPage() {
  const activeAssessment = useRoadmapStore((s) => s.activeAssessment);
  const portfolioMandate = useRoadmapStore((s) => s.portfolioMandate);
  const userPoints = useAppStore((s) => s.userPoints);
  const milestones = useAppStore((s) => s.milestones);

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [selectedActionIdx, setSelectedActionIdx] = useState<number | null>(0);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    species: "",
    state: "",
    year: "",
    status: "",
    search: "",
  });

  // ── Compute discipline violations and board state ──
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

  // ── Journey data for map ──
  const journeyData = useMemo(
    () => buildJourneyData(activeAssessment?.roadmap ?? [], userPoints),
    [activeAssessment, userPoints],
  );

  const selectedYearData = useMemo(
    () => journeyData.years.find((y) => y.year === selectedYear) ?? null,
    [journeyData, selectedYear],
  );

  // ── Year pills ──
  const roadmapYears = useMemo(
    () => activeAssessment?.roadmap.map((yr) => yr.year) ?? [],
    [activeAssessment],
  );

  // ── Flatten all actions with milestone data ──
  const allActions: RoadmapActionItem[] = useMemo(() => {
    if (!activeAssessment) return [];
    const items: RoadmapActionItem[] = [];
    for (const yr of activeAssessment.roadmap) {
      for (const a of yr.actions) {
        const milestone = milestones.find(
          (m) => m.stateId === a.stateId && m.speciesId === a.speciesId && m.type === a.type && m.year === yr.year,
        );
        items.push({ ...a, year: yr.year, milestone });
      }
    }
    return items;
  }, [activeAssessment, milestones]);

  // ── Filter options (computed from all actions) ──
  const speciesOptions = useMemo(() => {
    const set = new Set(allActions.map((a) => formatSpeciesName(a.speciesId)));
    return [...set].sort();
  }, [allActions]);

  const stateOptions = useMemo(() => {
    const set = new Set(allActions.map((a) => STATES_MAP[a.stateId]?.name ?? a.stateId));
    return [...set].sort();
  }, [allActions]);

  const statusOptions = [
    { value: "not_started", label: "To Do" },
    { value: "applied", label: "Applied" },
    { value: "awaiting_draw", label: "Awaiting Draw" },
    { value: "drew", label: "Drew" },
    { value: "didnt_draw", label: "Didn't Draw" },
    { value: "hunt_planned", label: "Hunt Planned" },
  ];

  // ── Apply filters to action list ──
  const filteredActions = useMemo(() => {
    let result = allActions;

    // Year filter: use selected year pill OR dropdown override
    const yearFilter = filters.year ? Number(filters.year) : selectedYear;
    result = result.filter((a) => a.year === yearFilter);

    if (filters.species) {
      result = result.filter((a) => formatSpeciesName(a.speciesId) === filters.species);
    }
    if (filters.state) {
      result = result.filter((a) => (STATES_MAP[a.stateId]?.name ?? a.stateId) === filters.state);
    }
    if (filters.status) {
      result = result.filter((a) => {
        const phase = resolvePhaseSimple(a.milestone);
        return phase === filters.status;
      });
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (a) =>
          formatSpeciesName(a.speciesId).toLowerCase().includes(q) ||
          (STATES_MAP[a.stateId]?.name ?? "").toLowerCase().includes(q) ||
          (a.unitCode ?? "").toLowerCase().includes(q) ||
          (a.description ?? "").toLowerCase().includes(q),
      );
    }
    return result;
  }, [allActions, filters, selectedYear]);

  // Keep selection in bounds
  const effectiveIdx = useMemo(() => {
    if (filteredActions.length === 0) return null;
    if (selectedActionIdx === null || selectedActionIdx >= filteredActions.length) return 0;
    return selectedActionIdx;
  }, [selectedActionIdx, filteredActions.length]);

  const selectedAction = effectiveIdx !== null ? filteredActions[effectiveIdx] : null;

  const handleYearChange = useCallback((year: number) => {
    setSelectedYear(year);
    setSelectedActionIdx(0);
  }, []);

  // ── No plan state ──
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
    <div className="p-4 md:p-6 space-y-4 fade-in-up">
      {/* ROW 1: Header — Plan name + Year pills + Edit/Rebuild */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PlanManager />
        <div className="flex items-center gap-3">
          <YearPills
            years={roadmapYears}
            selectedYear={selectedYear}
            onSelect={handleYearChange}
            currentYear={currentYear}
          />
          <div className="h-6 w-px bg-border/30 hidden md:block" />
          <div className="flex items-center gap-1.5">
            <Link href="/plan-builder">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                <Pencil className="w-3 h-3" />
                Edit Plan
              </Button>
            </Link>
            <Link href="/plan-builder">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                <RefreshCw className="w-3 h-3" />
                Rebuild
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ROW 2: Dashboard Card — KPIs + Mini Map + Discipline */}
      {boardState && (
        <DashboardCard
          assessment={activeAssessment}
          boardState={boardState}
          violations={violations}
          yearData={selectedYearData}
          selectedYear={selectedYear}
          onMapExpand={() => setMapExpanded(true)}
          onStateClick={setSelectedStateId}
        />
      )}

      {/* ROW 3: Active Filters */}
      <ActiveFilters
        filters={filters}
        onChange={setFilters}
        speciesOptions={speciesOptions}
        stateOptions={stateOptions}
        yearOptions={roadmapYears}
        statusOptions={statusOptions}
      />

      {/* ROW 4: Master-Detail — Action List + Action Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-0 min-h-[440px] rounded-xl border border-border/60 overflow-hidden bg-card shadow-sm">
        {/* Left: Action List — own background zone */}
        <div className="lg:border-r border-border/50 lg:max-h-[540px] lg:overflow-y-auto scrollbar-thin bg-card">
          {filteredActions.length > 0 ? (
            <RoadmapActionList
              actions={filteredActions}
              selectedIndex={effectiveIdx}
              onSelect={setSelectedActionIdx}
            />
          ) : (
            <div className="flex items-center justify-center h-full p-6 text-sm text-muted-foreground/40">
              No actions match your filters
            </div>
          )}
        </div>
        {/* Right: Action Detail — distinct background */}
        <div className="min-w-0 bg-secondary/25">
          {selectedAction ? (
            <RoadmapActionDetail
              action={selectedAction}
              assessment={activeAssessment}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground/40">
              Select an action to view details
            </div>
          )}
        </div>
      </div>

      {/* Map Overlay (expanded) */}
      {mapExpanded && (
        <MapOverlay
          assessment={activeAssessment}
          journeyData={journeyData}
          selectedYear={selectedYear}
          onYearChange={handleYearChange}
          onClose={() => setMapExpanded(false)}
          onStateClick={(id) => { setSelectedStateId(id); setMapExpanded(false); }}
        />
      )}

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

/** Simple phase resolver for filtering */
function resolvePhaseSimple(m?: { type: string; completed?: boolean; drawOutcome?: string | null }) {
  if (!m) return "not_started";
  if (m.type === "buy_points") return m.completed ? "points_bought" : "not_started";
  if (m.type === "hunt" || m.type === "scout") return m.completed ? "hunt_complete" : "hunt_planned";
  if (m.drawOutcome === "drew") return "drew";
  if (m.drawOutcome === "didnt_draw") return "didnt_draw";
  if (m.completed) return "awaiting_draw";
  return "not_started";
}
