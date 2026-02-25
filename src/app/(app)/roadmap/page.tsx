"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Route, ArrowRight, Pencil, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRoadmapStore, useAppStore, useWizardStore } from "@/lib/store";
import { KPIGridSkeleton, MapSkeleton } from "@/components/shared/SkeletonShimmer";
import { SegmentedToggle } from "@/components/shared/SegmentedToggle";
import { PlanManager } from "@/components/roadmap/PlanManager";
import { YearPills } from "@/components/roadmap/dashboard/YearPills";
import { DashboardCard } from "@/components/roadmap/dashboard/DashboardCard";
import { AlertsBar } from "@/components/roadmap/dashboard/AlertsBar";
import { ActiveFilters, type FilterState } from "@/components/roadmap/dashboard/ActiveFilters";
import { RoadmapActionList, type RoadmapActionItem } from "@/components/roadmap/dashboard/RoadmapActionList";
import { RoadmapActionDetail } from "@/components/roadmap/dashboard/RoadmapActionDetail";
import { MapOverlay } from "@/components/roadmap/dashboard/MapOverlay";
import { MobileActionSheet } from "@/components/roadmap/dashboard/MobileActionSheet";
import { StateDetailModal } from "@/components/journey/StateDetailModal";
import { InteractiveMap, type StateAllocatorData } from "@/components/journey/InteractiveMap";
import { buildJourneyData } from "@/lib/engine/journey-data";
import { computeBoardState } from "@/lib/engine/board-state";
import { computeCapitalSummary } from "@/lib/engine/capital-allocator";
import { evaluateDisciplineRules } from "@/lib/engine/discipline-rules";
import { runAllGotchaChecks } from "@/lib/engine/state-gotchas";
import { detectAllConflicts } from "@/lib/engine/conflict-resolver";
import { detectInactivityPurges, detectLiquidityBottleneck } from "@/lib/engine/portfolio-stress";
import { detectMissedDeadlines } from "@/lib/engine/fiduciary-dispatcher";
import { formatSpeciesName } from "@/lib/utils";
import { STATES_MAP } from "@/lib/constants/states";
import { MAP_LEGEND } from "@/components/roadmap/dashboard/action-colors";
import { cn } from "@/lib/utils";

export default function RoadmapPage() {
  const activeAssessment = useRoadmapStore((s) => s.activeAssessment);
  const portfolioMandate = useRoadmapStore((s) => s.portfolioMandate);
  const userPoints = useAppStore((s) => s.userPoints);
  const milestones = useAppStore((s) => s.milestones);
  const fiduciaryAlerts = useAppStore((s) => s.fiduciaryAlerts);
  const needsRegeneration = useAppStore((s) => s.needsRegeneration);
  const regenerateAssessment = useAppStore((s) => s.regenerateAssessment);
  const homeState = useWizardStore((s) => s.homeState);
  const huntYearBudget = useWizardStore((s) => s.huntYearBudget);
  const pointYearBudget = useWizardStore((s) => s.pointYearBudget);
  const huntDaysPerYear = useWizardStore((s) => s.huntDaysPerYear);
  const guidedForSpecies = useWizardStore((s) => s.guidedForSpecies);
  const capitalFloatTolerance = useWizardStore((s) => s.capitalFloatTolerance);

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [selectedActionIdx, setSelectedActionIdx] = useState<number | null>(0);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"Action List" | "State Map">("Action List");
  const [regenerating, setRegenerating] = useState(false);
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

  // ── Gotcha & conflict alerts ──
  const gotchaAlerts = useMemo(() => {
    if (!activeAssessment) return [];
    // Convert UserPoints[] → Record<string, number> keyed by "STATE-SPECIES"
    const ptMap: Record<string, number> = {};
    for (const p of userPoints) {
      ptMap[`${p.stateId}-${p.speciesId}`] = (ptMap[`${p.stateId}-${p.speciesId}`] ?? 0) + p.points;
    }
    const baseGotchas = runAllGotchaChecks(activeAssessment, {
      userPoints: ptMap,
      huntYearBudget,
      homeState,
      guidedForSpecies,
    });

    // Inactivity purge alerts → converted to GotchaAlert shape
    const nested: Record<string, Record<string, number>> = {};
    const annualCosts: Record<string, Record<string, number>> = {};
    for (const p of userPoints) {
      if (!nested[p.stateId]) nested[p.stateId] = {};
      nested[p.stateId][p.speciesId] = (nested[p.stateId][p.speciesId] ?? 0) + p.points;
    }
    // Estimate annual point costs from state data
    for (const stateId of Object.keys(nested)) {
      const st = STATES_MAP[stateId];
      if (!st) continue;
      annualCosts[stateId] = {};
      for (const speciesId of Object.keys(nested[stateId])) {
        annualCosts[stateId][speciesId] = (st.pointCost?.[speciesId] ?? 0) + (st.licenseFees?.appFee ?? 0);
      }
    }

    const purgeAlerts = detectInactivityPurges(
      activeAssessment.roadmap,
      nested,
      annualCosts,
    ).map((pa) => ({
      id: `purge-${pa.stateId}-${pa.speciesId}`,
      stateId: pa.stateId,
      severity: pa.severity,
      title: pa.yearOfPurge
        ? `Point Purge: ${pa.stateId} ${pa.speciesId} (${pa.yearOfPurge})`
        : `Purge Risk: ${pa.stateId} ${pa.speciesId}`,
      description: pa.message,
      recommendation: pa.yearOfPurge
        ? `Apply or buy points for ${pa.stateId} ${pa.speciesId} before ${pa.yearOfPurge} to prevent permanent deletion of ${pa.currentPoints} points.`
        : undefined,
    }));

    // Liquidity bottleneck check — build float events from roadmap deadlines
    const floatEvents: import("@/lib/engine/portfolio-stress").FloatEvent[] = [];
    for (const yr of activeAssessment.roadmap) {
      for (const action of yr.actions) {
        if (action.type !== "apply" || !action.dueDate) continue;
        const st = STATES_MAP[action.stateId];
        if (!st) continue;
        const tagCost = st.tagCosts?.[action.speciesId] ?? 0;
        // States with upfront tag fees: NM, ID, WY
        const upfrontStates = ["NM", "ID", "WY"];
        if (upfrontStates.includes(action.stateId) && tagCost > 0) {
          const drawDate = st.drawResultDates?.[action.speciesId];
          floatEvents.push({
            stateId: action.stateId,
            speciesId: action.speciesId,
            amount: tagCost,
            floatStartDate: action.dueDate,
            floatEndDate: drawDate ?? action.dueDate,
            isRefundable: true,
          });
        }
      }
    }

    const bottleneck = detectLiquidityBottleneck(floatEvents, capitalFloatTolerance);
    const liquidityAlerts = bottleneck.deficit > 0 ? [{
      id: "liquidity-bottleneck",
      stateId: bottleneck.overlappingEvents[0]?.stateId ?? "MULTI",
      severity: bottleneck.severity === "critical" ? "critical" as const : "warning" as const,
      title: `Liquidity Bottleneck: $${bottleneck.peakAmount.toLocaleString()} float peak`,
      description: `Your float exposure peaks at $${bottleneck.peakAmount.toLocaleString()} around ${bottleneck.peakDate}, exceeding your $${capitalFloatTolerance.toLocaleString()} tolerance by $${bottleneck.deficit.toLocaleString()}.`,
      recommendation: `Stagger applications to avoid overlapping float windows, or increase your capital float tolerance.`,
    }] : [];

    // Missed deadline alerts — scan milestones for past-due applications
    const missedDeadlines = detectMissedDeadlines(milestones);
    const deadlineAlerts = missedDeadlines.map((md) => ({
      id: `missed-${md.stateId}-${md.speciesId}-${md.year}`,
      stateId: md.stateId,
      severity: "critical" as const,
      title: `Missed Deadline: ${md.stateId} ${md.speciesId}`,
      description: `The ${md.stateId} ${md.speciesId} application deadline (${md.deadline}) has passed without a recorded submission.`,
      recommendation: `Update your milestone if you did apply, or adjust your roadmap.`,
    }));

    // Persistent fiduciary cascade alerts (from draw outcomes, profile changes, etc.)
    const cascadeAlerts = fiduciaryAlerts.map((fa) => ({
      id: fa.id,
      stateId: fa.stateId ?? "SYSTEM",
      severity: fa.severity,
      title: fa.title,
      description: fa.description,
      recommendation: fa.recommendation,
    }));

    return [...baseGotchas, ...purgeAlerts, ...liquidityAlerts, ...deadlineAlerts, ...cascadeAlerts];
  }, [activeAssessment, userPoints, milestones, fiduciaryAlerts, huntYearBudget, homeState, guidedForSpecies, capitalFloatTolerance]);

  const planConflicts = useMemo(() => {
    if (!activeAssessment) return [];
    // Convert UserPoints[] → Record<stateId, Record<speciesId, number>>
    const nested: Record<string, Record<string, number>> = {};
    for (const p of userPoints) {
      if (!nested[p.stateId]) nested[p.stateId] = {};
      nested[p.stateId][p.speciesId] = (nested[p.stateId][p.speciesId] ?? 0) + p.points;
    }
    return detectAllConflicts(activeAssessment, {
      huntDaysPerYear: huntDaysPerYear || 14,
      pointYearBudget,
      huntYearBudget,
      existingPoints: nested,
    });
  }, [activeAssessment, userPoints, huntDaysPerYear, pointYearBudget, huntYearBudget]);

  // ── Journey data for map ──
  const journeyData = useMemo(
    () => buildJourneyData(activeAssessment?.roadmap ?? [], userPoints),
    [activeAssessment, userPoints],
  );

  const selectedYearData = useMemo(
    () => journeyData.years.find((y) => y.year === selectedYear) ?? null,
    [journeyData, selectedYear],
  );

  // ── Allocator data for mobile standalone map (mirrors DashboardCard logic) ──
  const mobileMapAllocatorData = useMemo<Record<string, StateAllocatorData>>(() => {
    if (!activeAssessment) return {};
    const capitalSummary = computeCapitalSummary(activeAssessment, homeState);
    const result: Record<string, StateAllocatorData> = {};
    for (const rec of activeAssessment.stateRecommendations) {
      const pts = userPoints
        .filter((p) => p.stateId === rec.stateId)
        .reduce((s, p) => s + p.points, 0);
      const sunk = capitalSummary.byState.find((s) => s.stateId === rec.stateId)?.sunk ?? 0;
      let targetDrawYear: number | null = null;
      for (const yr of activeAssessment.roadmap) {
        const hunt = yr.actions.find((a) => a.stateId === rec.stateId && a.type === "hunt");
        if (hunt) { targetDrawYear = yr.year; break; }
      }
      result[rec.stateId] = { points: pts, sunkCost: sunk, targetDrawYear };
    }
    return result;
  }, [activeAssessment, userPoints, homeState]);

  // ── Year pills + inline status labels ──
  const roadmapYears = useMemo(
    () => activeAssessment?.roadmap.map((yr) => yr.year) ?? [],
    [activeAssessment],
  );

  const yearLabels = useMemo(() => {
    if (!activeAssessment) return [];
    return activeAssessment.roadmap.map((yr) => {
      const hasHunt = yr.actions.some((a) => a.type === "hunt");
      const hasApply = yr.actions.some((a) => a.type === "apply");
      const hasBuyPts = yr.actions.some((a) => a.type === "buy_points");
      const tags: string[] = [];
      if (hasHunt) tags.push("BURN");
      if (hasApply && !hasHunt) tags.push("LOTTERY");
      if (hasBuyPts && !hasHunt && !hasApply) tags.push("BUILD");
      if (!hasHunt && hasBuyPts && hasApply) tags.push("BUILD");
      if (tags.length === 0) tags.push("BUILD");
      return { year: yr.year, label: tags.join(" & ") };
    });
  }, [activeAssessment]);

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

  const handleRegenerate = useCallback(async () => {
    setRegenerating(true);
    try {
      await regenerateAssessment();
    } finally {
      setRegenerating(false);
    }
  }, [regenerateAssessment]);

  const handleActionSelect = useCallback((idx: number) => {
    setSelectedActionIdx(idx);
    // Open mobile sheet on small screens
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileSheetOpen(true);
    }
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
            yearLabels={yearLabels}
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
      {boardState ? (
        <DashboardCard
          assessment={activeAssessment}
          boardState={boardState}
          violations={violations}
          yearData={selectedYearData}
          selectedYear={selectedYear}
          onMapExpand={() => setMapExpanded(true)}
          onStateClick={setSelectedStateId}
        />
      ) : (
        /* Skeleton loading — metallic shimmer while engine computes */
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-0 rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
          <div className="p-5">
            <KPIGridSkeleton />
          </div>
          <div className="hidden lg:block lg:border-l border-border/50 bg-secondary/50 p-4">
            <MapSkeleton />
          </div>
        </div>
      )}

      {/* ROW 2.5: Mobile View Toggle — Action List | State Map */}
      <div className="lg:hidden flex justify-center">
        <SegmentedToggle
          options={["Action List", "State Map"] as const}
          value={mobileView}
          onChange={(v) => setMobileView(v as "Action List" | "State Map")}
          size="sm"
        />
      </div>

      {/* ROW 2.7: Rebalance banner — shown when anchor fields changed */}
      {needsRegeneration && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-amber-400">Plan out of sync</p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Your profile changed since this roadmap was generated. Regenerate to reflect current inputs.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleRegenerate}
              disabled={regenerating}
              className="gap-1.5 text-xs h-8 bg-amber-500 hover:bg-amber-600 text-white shrink-0"
            >
              <RefreshCw className={cn("w-3 h-3", regenerating && "animate-spin")} />
              {regenerating ? "Regenerating..." : "Regenerate"}
            </Button>
          </div>
        </div>
      )}

      {/* ROW 2.75: Alerts — State Gotchas & Plan Conflicts */}
      {(gotchaAlerts.length > 0 || planConflicts.length > 0 || needsRegeneration) && (
        <AlertsBar gotchas={gotchaAlerts} conflicts={planConflicts} needsRegeneration={needsRegeneration} />
      )}

      {/* Mobile State Map — shown when SegmentedToggle is "State Map" */}
      {mobileView === "State Map" && (
        <div className="lg:hidden rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
          <div className="p-4 bg-secondary/50">
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <p className="label-uppercase">Hunt Year</p>
                <p className="text-xl font-bold font-financial">{selectedYear}</p>
              </div>
            </div>
            <div className="rounded-lg overflow-hidden bg-background/60 border border-border/40 shadow-inner">
              <InteractiveMap
                yearData={selectedYearData}
                onStateClick={setSelectedStateId}
                selectedYear={selectedYear}
                allocatorData={mobileMapAllocatorData}
              />
            </div>
            {/* Legend */}
            <div className="flex gap-3 mt-2.5 text-[9px] text-muted-foreground/60 uppercase tracking-wider">
              {MAP_LEGEND.map((item) => (
                <span key={item.label} className="flex items-center gap-1.5">
                  <span className={cn("w-2 h-2 rounded-sm", item.bg)} />
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ROW 3: Active Filters — hidden on mobile when viewing map */}
      <div className={cn(mobileView === "State Map" && "hidden lg:block")}>
        <ActiveFilters
          filters={filters}
          onChange={setFilters}
          speciesOptions={speciesOptions}
          stateOptions={stateOptions}
          yearOptions={roadmapYears}
          statusOptions={statusOptions}
        />
      </div>

      {/* ROW 4: Master-Detail — Action List + Action Detail */}
      <div className={cn(
        "grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-0 min-h-[440px] rounded-xl border border-border/60 overflow-hidden bg-card shadow-sm",
        mobileView === "State Map" && "hidden lg:grid",
      )}>
        {/* Left: Action List — own background zone */}
        <div className="lg:border-r border-border/50 lg:max-h-[540px] lg:overflow-y-auto scrollbar-thin bg-card">
          {filteredActions.length > 0 ? (
            <RoadmapActionList
              actions={filteredActions}
              selectedIndex={effectiveIdx}
              onSelect={handleActionSelect}
            />
          ) : (
            <div className="flex items-center justify-center h-full p-6 text-sm text-muted-foreground/40">
              No actions match your filters
            </div>
          )}
        </div>
        {/* Right: Action Detail — hidden on mobile (uses bottom sheet), visible on lg+ */}
        <div className="hidden lg:block min-w-0 bg-secondary/25">
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

      {/* Mobile Bottom Sheet for Action Detail */}
      <MobileActionSheet
        action={selectedAction}
        assessment={activeAssessment}
        open={mobileSheetOpen}
        onClose={() => setMobileSheetOpen(false)}
      />

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
