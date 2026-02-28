"use client";

import { useMemo, useRef } from "react";
import type { StrategicAssessment, BoardState, DisciplineViolation } from "@/lib/types";
import { useMagicCard } from "@/hooks/useMagicCard";
import type { JourneyYearData } from "@/lib/engine/journey-data";
import { InteractiveMap, type StateAllocatorData } from "@/components/journey/InteractiveMap";
import { AnimatedCounter } from "@/components/shared/AnimatedCounter";
import { detectCreepShifts } from "@/lib/engine/advisor-creep";
import { formatSpeciesName } from "@/lib/utils";
import { STATES_MAP } from "@/lib/constants/states";
import { useAppStore, useWizardStore } from "@/lib/store";
import { computeCapitalSummary, computeBurnRateMatrix } from "@/lib/engine/capital-allocator";
import { computeMonteCarloOdds } from "@/lib/engine/draw-odds";
import { MAP_LEGEND } from "./action-colors";
import {
  Lock,
  Unlock,
  Layers,
  FileText,
  TrendingUp,
  Crosshair,
  Dice5,
  ShieldCheck,
  Maximize2,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Map Tailwind icon-color classes → RGB strings for glow effects */
const ICON_COLOR_RGB: Record<string, string> = {
  "text-red-400":     "248, 113, 113",
  "text-chart-2":     "234, 160, 0",    // oklch(0.70 0.15 55) ≈ warm amber
  "text-blue-400":    "96, 165, 250",
  "text-amber-400":   "251, 191, 36",
  "text-chart-3":     "99, 102, 241",    // oklch(0.55 0.15 260) ≈ indigo
  "text-chart-4":     "239, 118, 46",    // oklch(0.65 0.20 30) ≈ orange
  "text-purple-400":  "192, 132, 252",
  "text-emerald-400": "52, 211, 153",
};

function resolveGlowColor(iconColor: string): string {
  return ICON_COLOR_RGB[iconColor] ?? "34, 197, 94";
}

interface DashboardCardProps {
  assessment: StrategicAssessment;
  boardState: BoardState;
  violations: DisciplineViolation[];
  yearData: JourneyYearData | null;
  selectedYear: number;
  onMapExpand: () => void;
  onStateClick: (stateId: string) => void;
}

export function DashboardCard({
  assessment,
  boardState,
  violations,
  yearData,
  selectedYear,
  onMapExpand,
  onStateClick,
}: DashboardCardProps) {
  const { financialSummary, roadmap, stateRecommendations } = assessment;
  const userPoints = useAppStore((s) => s.userPoints);
  const homeState = useWizardStore((s) => s.homeState);
  const pointYearBudget = useWizardStore((s) => s.pointYearBudget);
  const huntYearBudget = useWizardStore((s) => s.huntYearBudget);

  const currentYear = new Date().getFullYear();
  const yearData_ = roadmap.find((yr) => yr.year === selectedYear);

  // ── Capital classification ──
  const capitalSummary = useMemo(
    () => computeCapitalSummary(assessment, homeState),
    [assessment, homeState],
  );

  // ── Portfolio value: total preference points across all states ──
  const portfolioValue = useMemo(() => {
    return userPoints.reduce((sum, p) => sum + p.points, 0);
  }, [userPoints]);

  // ── Active F&G applications: deadlines remaining this calendar year ──
  const activeApps = useMemo(() => {
    if (!yearData_) return { count: 0, nextDeadline: "" };
    const apps = yearData_.actions.filter(
      (a) => a.type === "apply" || a.type === "buy_points",
    );
    // Find the nearest upcoming deadline
    const todayStr = new Date().toISOString().slice(0, 10);
    let nearest = "";
    for (const a of apps) {
      const state = STATES_MAP[a.stateId];
      if (state?.applicationDeadlines) {
        for (const dl of Object.values(state.applicationDeadlines)) {
          const close = dl.close;
          if (close > todayStr) {
            if (!nearest || close < nearest) nearest = close;
          }
        }
      }
    }
    return { count: apps.length, nextDeadline: nearest };
  }, [yearData_]);

  // ── Creep Velocity: portfolio-wide inflation rate ──
  const creepShifts = useMemo(
    () => detectCreepShifts(assessment, userPoints),
    [assessment, userPoints],
  );
  const burnMatrix = useMemo(
    () => computeBurnRateMatrix(assessment, {}),
    [assessment],
  );
  const avgPCV = useMemo(() => {
    if (burnMatrix.length === 0) return 0;
    return burnMatrix.reduce((s, b) => s + b.pcv, 0) / burnMatrix.length;
  }, [burnMatrix]);

  // ── Next Milestone: nearest projected "burn" (hunt) ──
  const nextMilestone = useMemo(() => {
    for (const yr of roadmap) {
      if (yr.year < selectedYear) continue;
      const hunt = yr.actions.find((a) => a.type === "hunt");
      if (hunt) {
        return {
          year: yr.year,
          species: formatSpeciesName(hunt.speciesId),
          stateAbbr: STATES_MAP[hunt.stateId]?.abbreviation ?? hunt.stateId,
        };
      }
    }
    return null;
  }, [roadmap, selectedYear]);

  // ── Draw Probability: cumulative odds of drawing ≥1 tag this year ──
  const drawProbability = useMemo(() => {
    if (!yearData_) return 0;
    const drawActions = yearData_.actions.filter((a) => a.type === "apply");
    if (drawActions.length === 0) return 0;
    // P(at least one) = 1 - P(none)
    let pNone = 1;
    for (const a of drawActions) {
      const odds = a.estimatedDrawOdds ?? 0.15;
      pNone *= 1 - odds;
    }
    return Math.round((1 - pNone) * 100);
  }, [yearData_]);

  // ── Budget Discipline: ON TRACK or BLEEDING ──
  const budgetDiscipline = useMemo(() => {
    const yearCost = yearData_
      ? yearData_.actions.reduce((s, a) => s + a.cost, 0)
      : 0;
    // Use wizard budget or fall back to financial summary
    const budgetCeiling = pointYearBudget || financialSummary.annualSubscription * 1.2;
    const ratio = budgetCeiling > 0 ? yearCost / budgetCeiling : 0;

    if (ratio <= 0.9) return { status: "On Track", color: "text-emerald-400", ratio };
    if (ratio <= 1.1) return { status: "At Limit", color: "text-amber-400", ratio };
    return { status: "Bleeding", color: "text-red-400", ratio };
  }, [yearData_, pointYearBudget, financialSummary]);

  // ── Deltas: year-over-year comparison ──
  // ── Allocator data for map hover tooltips ──
  const mapAllocatorData = useMemo<Record<string, StateAllocatorData>>(() => {
    const result: Record<string, StateAllocatorData> = {};
    for (const rec of stateRecommendations) {
      const pts = userPoints
        .filter((p) => p.stateId === rec.stateId)
        .reduce((s, p) => s + p.points, 0);
      const sunk = capitalSummary.byState.find((s) => s.stateId === rec.stateId)?.sunk ?? 0;
      // Find earliest hunt year for this state
      let targetDrawYear: number | null = null;
      for (const yr of roadmap) {
        const hunt = yr.actions.find((a) => a.stateId === rec.stateId && a.type === "hunt");
        if (hunt) { targetDrawYear = yr.year; break; }
      }
      result[rec.stateId] = { points: pts, sunkCost: sunk, targetDrawYear };
    }
    return result;
  }, [stateRecommendations, userPoints, capitalSummary, roadmap]);

  const prevYear = roadmap.find((yr) => yr.year === selectedYear - 1);
  const prevYearCost = prevYear
    ? prevYear.actions.reduce((s, a) => s + a.cost, 0)
    : 0;
  const currentYearCost = yearData_
    ? yearData_.actions.reduce((s, a) => s + a.cost, 0)
    : 0;
  const costDelta = currentYearCost - prevYearCost;

  // ── Is this a burn (hunt) year? ──
  const isBurnYear = yearData_?.actions.some((a) => a.type === "hunt") ?? false;

  return (
    <div className={cn(
      "magic-card magic-card--glow grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-0 rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm",
      isBurnYear && "glow-burn-year",
    )}>
      {/* Left: 2x4 Allocator KPI Grid */}
      <div className="p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* 1. Sunk Capital */}
          <KPITile
            icon={Lock}
            iconColor="text-red-400"
            label="Sunk Capital"
            sublabel="Non-refundable"
            glowClass="glow-danger"
          >
            <AnimatedCounter value={capitalSummary.sunkCapital} prefix="$" />
          </KPITile>

          {/* 2. Floated Capital */}
          <KPITile
            icon={Unlock}
            iconColor="text-chart-2"
            label="Floated Capital"
            sublabel="Recoverable"
            glowClass="glow-success"
          >
            <AnimatedCounter value={capitalSummary.floatedCapital} prefix="$" />
          </KPITile>

          {/* 3. Portfolio Value */}
          <KPITile
            icon={Layers}
            iconColor="text-blue-400"
            label="Portfolio Value"
            sublabel={`${stateRecommendations.length} states`}
            glowClass="glow-equity"
          >
            <AnimatedCounter value={portfolioValue} suffix=" pts" />
          </KPITile>

          {/* 4. Active F&G Apps — hidden on mobile for condensed 2×2 */}
          <KPITile
            icon={FileText}
            iconColor="text-amber-400"
            label="Active F&G Apps"
            sublabel={activeApps.nextDeadline ? `Next: ${formatShortDate(activeApps.nextDeadline)}` : selectedYear.toString()}
            className="hidden md:flex"
          >
            <AnimatedCounter value={activeApps.count} padStart={2} />
          </KPITile>

          {/* 5. Creep Velocity — hidden on mobile for condensed 2×2 */}
          <KPITile
            icon={TrendingUp}
            iconColor={avgPCV >= 1.0 ? "text-red-400" : avgPCV > 0.5 ? "text-amber-400" : "text-emerald-400"}
            label="Creep Velocity"
            sublabel={avgPCV >= 1.0 ? "Dead asset risk" : "Portfolio avg"}
            delta={avgPCV > 0 ? { direction: "up" as const, label: `${avgPCV.toFixed(1)} pts/yr` } : undefined}
            glowClass={avgPCV >= 1.0 ? "glow-danger" : undefined}
            className="hidden md:flex"
          >
            <span className={cn(avgPCV >= 1.0 && "text-red-400")}>
              {avgPCV >= 1.0 && "▲ "}
              <AnimatedCounter value={parseFloat(avgPCV.toFixed(1))} decimals={1} />
            </span>
          </KPITile>

          {/* 6. Next Milestone */}
          <KPITile
            icon={Crosshair}
            iconColor="text-chart-3"
            label="Next Milestone"
            sublabel={nextMilestone ? `${nextMilestone.species} · ${nextMilestone.stateAbbr}` : "No hunts yet"}
            glowClass={isBurnYear ? "glow-success" : undefined}
          >
            {nextMilestone ? (
              <AnimatedCounter value={nextMilestone.year} className="text-chart-3" locale={false} />
            ) : (
              <span className="font-financial text-chart-3">—</span>
            )}
          </KPITile>

          {/* 7. Draw Probability — hidden on mobile for condensed 2×2 */}
          <KPITile
            icon={Dice5}
            iconColor="text-purple-400"
            label="Draw Probability"
            sublabel={`${selectedYear} cumulative`}
            className="hidden md:flex"
          >
            <AnimatedCounter
              value={drawProbability}
              suffix="%"
              className={cn(
                drawProbability >= 50 ? "text-emerald-400" : drawProbability >= 25 ? "text-amber-400" : "text-red-400",
              )}
            />
          </KPITile>

          {/* 8. Budget Discipline — hidden on mobile for condensed 2×2 */}
          <KPITile
            icon={ShieldCheck}
            iconColor={budgetDiscipline.color}
            label="Budget Discipline"
            sublabel={`${Math.round(budgetDiscipline.ratio * 100)}% of cap`}
            delta={costDelta !== 0 ? {
              direction: costDelta > 0 ? "up" as const : "down" as const,
              label: `$${Math.abs(costDelta).toLocaleString()} vs ${selectedYear - 1}`,
            } : undefined}
            className="hidden md:flex"
          >
            <span className={cn("font-financial", budgetDiscipline.color)}>{budgetDiscipline.status}</span>
          </KPITile>
        </div>
      </div>

      {/* Right: Mini Map — hidden on mobile (available via SegmentedToggle) */}
      <div className="hidden lg:block lg:border-l border-border/50 bg-secondary/50 relative">
        <div className="p-4">
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium">
                Hunt Year
              </p>
              <p className="text-xl font-bold">{selectedYear}</p>
            </div>
            <button
              onClick={onMapExpand}
              className="w-8 h-8 rounded-lg bg-background/60 border border-border/50 flex items-center justify-center hover:bg-background/80 transition-colors cursor-pointer"
              title="Expand map"
            >
              <Maximize2 className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div className="rounded-lg overflow-hidden bg-background/60 border border-border/40 shadow-inner">
            <InteractiveMap
              yearData={yearData}
              onStateClick={onStateClick}
              selectedYear={selectedYear}
              allocatorData={mapAllocatorData}
            />
          </div>
          {/* Legend — shared MAP_LEGEND with hover tooltips */}
          <div className="flex gap-3 mt-2.5 text-[9px] text-muted-foreground/60 uppercase tracking-wider">
            {MAP_LEGEND.map((item) => (
              <span key={item.label} className="flex items-center gap-1.5 group relative cursor-default">
                <span className={cn("w-2 h-2 rounded-sm", item.bg)} />
                {item.label}
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded-md bg-card border border-border/60 text-[10px] normal-case tracking-normal text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none shadow-lg">
                  {item.tooltip}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Helper: short date formatting ─────────────────────────── */

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ─── KPI Tile ────────────────────────────────────────────────
 * Pure-number micro-card with icon, 3-word label, optional delta.
 */

function KPITile({
  icon: Icon,
  iconColor,
  label,
  sublabel,
  delta,
  glowClass,
  className,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  label: string;
  sublabel: string;
  delta?: { direction: "up" | "down" | "flat"; label: string };
  glowClass?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const tileRef = useRef<HTMLDivElement>(null);
  useMagicCard(tileRef);

  return (
    <div
      ref={tileRef}
      data-glow-color={resolveGlowColor(iconColor)}
      className={cn(
        "magic-card magic-card--glow flex flex-col justify-between p-3 rounded-lg bg-secondary/40 border border-border/40 min-h-[100px] transition-all duration-300",
        "hover:border-border/60 hover:bg-secondary/50",
        glowClass,
        className,
      )}
    >
      {/* Header: icon + label */}
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={cn("w-3.5 h-3.5", iconColor)} />
        <p className="label-uppercase">{label}</p>
      </div>

      {/* Value — stark white, monospace */}
      <p className="text-xl font-bold tracking-tight text-foreground mt-auto">
        {children}
      </p>

      {/* Sub-label + optional delta */}
      <div className="flex items-center justify-between mt-1">
        <p className="text-[9px] text-muted-foreground/50 truncate">{sublabel}</p>
        {delta && (
          <span className={cn(
            "flex items-center gap-0.5 text-[9px] font-medium font-financial",
            delta.direction === "up" ? "text-red-400" : delta.direction === "down" ? "text-emerald-400" : "text-muted-foreground",
          )}>
            {delta.direction === "up" ? <ArrowUp className="w-2.5 h-2.5" /> :
             delta.direction === "down" ? <ArrowDown className="w-2.5 h-2.5" /> :
             <Minus className="w-2.5 h-2.5" />}
            {delta.label}
          </span>
        )}
      </div>
    </div>
  );
}
