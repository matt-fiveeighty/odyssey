"use client";

import { useMemo } from "react";
import type { StrategicAssessment, BoardState, DisciplineViolation, UserPoints } from "@/lib/types";
import type { JourneyYearData } from "@/lib/engine/journey-data";
import { YEAR_TYPE_LABELS, migratePhaseToYearType } from "@/lib/types";
import { InteractiveMap } from "@/components/journey/InteractiveMap";
import { AnimatedCounter } from "@/components/shared/AnimatedCounter";
import { detectCreepShifts } from "@/lib/engine/advisor-creep";
import { formatSpeciesName } from "@/lib/utils";
import { STATES_MAP } from "@/lib/constants/states";
import { useAppStore } from "@/lib/store";
import { MAP_LEGEND } from "./action-colors";
import { Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

  const yearData_ = roadmap.find((yr) => yr.year === selectedYear);
  const ifDrawnSpend = useMemo(() => {
    if (!yearData_) return 0;
    return yearData_.actions.reduce((s, a) => s + a.cost, 0);
  }, [yearData_]);

  const speciesCount = useMemo(() => {
    const set = new Set<string>();
    for (const yr of roadmap) for (const a of yr.actions) set.add(a.speciesId);
    return set.size;
  }, [roadmap]);

  // ── Point Creep: detect timeline shifts across the portfolio ──
  const userPoints = useAppStore((s) => s.userPoints);
  const creepShifts = useMemo(
    () => detectCreepShifts(assessment, userPoints),
    [assessment, userPoints],
  );
  const hasCreep = creepShifts.length > 0;
  const creepLines = useMemo(() => {
    if (creepShifts.length === 0) return ["No shifts detected"];
    // Each hunt that's slipping gets its own line
    return creepShifts.slice(0, 3).map((s) => {
      const abbr = STATES_MAP[s.stateId]?.abbreviation ?? s.stateId;
      return `${abbr} ${formatSpeciesName(s.speciesId)} → +${s.shiftYears}yr`;
    });
  }, [creepShifts]);
  // Plain-spoken TLDR: what point creep IS and what it means for YOU
  // (informed by goHunt's definition — more applicants enter the pool each year
  //  than tags available, so the points needed to draw keep climbing)
  const creepNote = hasCreep
    ? "More applicants than tags — points to draw rise each year, pushing your timeline back."
    : "Your points are keeping pace with demand.";

  // ── Portfolio status: phase label for selected year ──
  const yearPhaseLabel = useMemo(() => {
    if (!yearData_) return "Building";
    if (yearData_.phaseLabel) return yearData_.phaseLabel;
    const yt = migratePhaseToYearType(yearData_.phase);
    return yt ? YEAR_TYPE_LABELS[yt] : "Building";
  }, [yearData_]);

  const portfolioStatus = boardState.status;
  const isPortfolioHealthy = portfolioStatus === "on_track" || portfolioStatus === "position_strong";

  // ── Portfolio lines: each action type on its own line ──
  const portfolioLines = useMemo(() => {
    if (!yearData_) return ["No actions planned"];
    const apps = yearData_.actions.filter((a) => a.type === "apply").length;
    const pts = yearData_.actions.filter((a) => a.type === "buy_points").length;
    const hunts = yearData_.actions.filter((a) => a.type === "hunt").length;
    const scouts = yearData_.actions.filter((a) => a.type === "scout").length;
    const lines: string[] = [];
    if (apps > 0) lines.push(`${apps} Draw${apps > 1 ? "s" : ""}`);
    if (pts > 0) lines.push(`${pts} Point Buy${pts > 1 ? "s" : ""}`);
    if (hunts > 0) lines.push(`${hunts} Hunt${hunts > 1 ? "s" : ""}`);
    if (scouts > 0) lines.push(`${scouts} Scout${scouts > 1 ? "s" : ""}`);
    return lines.length > 0 ? lines : ["No actions planned"];
  }, [yearData_]);

  // ── Burn Rate: points needed to draw vs points held ──
  // In hunting, "burn rate" = how many preference points it takes to
  // clear (guarantee) a tag. Low burn = easy draws. High burn = bucket
  // list. Trend matters: stable means you're on pace, creeping means
  // the goal line is moving away from you.
  const burnAnalysis = useMemo(() => {
    // Gather burn-related violations
    const burnRuleIds = [
      "budget_concentration",
      "premium_overload",
      "build_fatigue",
      "cadence_below_target",
      "plateau_detected",
    ];
    const burnViolations = violations.filter((v) =>
      burnRuleIds.includes(v.ruleId),
    );

    // Per-state point holdings — what the user has built so far
    // Each entry gets a trend arrow from creep shifts
    const pointLines: string[] = [];
    for (const pt of userPoints.slice(0, 3)) {
      const abbr = STATES_MAP[pt.stateId]?.abbreviation ?? pt.stateId;
      const species = formatSpeciesName(pt.speciesId);
      // Check if this state/species has a creep shift (burn rate rising)
      const shift = creepShifts.find(
        (s) => s.stateId === pt.stateId && s.speciesId === pt.speciesId,
      );
      const trend = shift ? `↑ +${shift.shiftYears}yr` : "→ stable";
      pointLines.push(`${abbr} ${species}: ${pt.points}pts ${trend}`);
    }

    // Parse cadence from boardState
    const cadenceMatch = boardState.cadence?.match(
      /([\d.]+)\s*hunts?\/yr.*target\s*([\d.]+)/i,
    );
    const actualCadence = cadenceMatch ? parseFloat(cadenceMatch[1]) : 0;
    const targetCadence = cadenceMatch ? parseFloat(cadenceMatch[2]) : 1;

    // How many creep shifts are rising (burn rate creeping)
    const risingCount = creepShifts.length;
    const hasConcern = burnViolations.length > 0 || risingCount > 0;

    // ── Status ── (burn rate trend based)
    let status: string;
    let statusColor: string;

    if (!hasConcern) {
      status = "Stable";
      statusColor = "text-success";
    } else {
      const hasFatigue = burnViolations.some((v) => v.ruleId === "build_fatigue");
      const hasPlateau = burnViolations.some((v) => v.ruleId === "plateau_detected");
      const hasBudgetConc = burnViolations.some((v) => v.ruleId === "budget_concentration");

      if (hasFatigue) {
        status = "Fatigued";
        statusColor = "text-destructive";
      } else if (risingCount >= 2) {
        status = "Creeping";
        statusColor = "text-destructive";
      } else if (risingCount === 1) {
        status = "Drifting";
        statusColor = "text-warning";
      } else if (hasPlateau) {
        status = "Plateauing";
        statusColor = "text-warning";
      } else if (hasBudgetConc) {
        status = "Over-indexed";
        statusColor = "text-warning";
      } else {
        status = "Watch";
        statusColor = "text-warning";
      }
    }

    // ── TLDR note — plain language ──
    let note: string;
    if (!hasConcern) {
      note = "Burn rate = points to draw a tag. Yours are stable — builds are clearing on schedule.";
    } else if (status === "Creeping") {
      note = "Burn rates rising across your portfolio. More hunters in the pool — it takes more points to draw each year.";
    } else if (status === "Drifting") {
      note = "One of your builds is slipping. The points needed to draw are climbing faster than you're earning.";
    } else if (status === "Fatigued") {
      note = "Years of buying points with no tags clearing. Building without burning is expensive patience.";
    } else if (status === "Plateauing") {
      note = "Points past the efficiency threshold. Marginal gains are minimal — consider cashing in.";
    } else if (status === "Over-indexed") {
      note = "Too much budget locked in high-burn-rate draws. Most annual spend may produce no hunt.";
    } else {
      note = "Review point builds and burn rate trends.";
    }

    // ── Detail lines ──
    const lines: string[] = [];

    // Per-state point status with trend arrows
    lines.push(...pointLines);

    // Cadence — hunts clearing vs goal
    if (pointLines.length === 0 && (actualCadence > 0 || targetCadence > 0)) {
      lines.push(`${actualCadence.toFixed(1)} hunts/yr → ${targetCadence} goal`);
    }

    // Violation-specific detail (only if we have room)
    if (lines.length < 3) {
      for (const v of burnViolations.slice(0, 1)) {
        if (v.ruleId === "build_fatigue" && v.affectedYears?.length) {
          lines.push(`${v.affectedYears.length}yr without clearing a tag`);
        }
      }
    }

    if (lines.length === 0) lines.push("No points building yet");

    return { status, statusColor, note, lines };
  }, [violations, boardState.cadence, financialSummary, roadmap, userPoints, creepShifts]);

  // ── Dream hunt: closest hunt action in the roadmap ──
  const dreamHunt = useMemo(() => {
    for (const yr of roadmap) {
      const hunt = yr.actions.find((a) => a.type === "hunt");
      if (hunt) {
        return {
          species: formatSpeciesName(hunt.speciesId),
          state: STATES_MAP[hunt.stateId]?.name ?? hunt.stateId,
          year: yr.year,
        };
      }
    }
    return null;
  }, [roadmap]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-0 rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
      {/* Left: 2 rows of 4 */}
      <div className="p-5">
        {/* Row 1: KPIs — colored label TOP, white value BOTTOM */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <KPITile label="Annual Spend" labelColor="text-primary">
            <AnimatedCounter value={Math.round(financialSummary.annualSubscription)} prefix="$" />
          </KPITile>
          <KPITile label={`(${selectedYear}) If Drawn Spend`} labelColor="text-chart-2">
            <AnimatedCounter value={Math.round(ifDrawnSpend)} prefix="$" />
          </KPITile>
          <KPITile label="States" labelColor="text-chart-5" numeric>
            {String(stateRecommendations.length).padStart(2, "0")}
          </KPITile>
          <KPITile label="Species" labelColor="text-chart-4" numeric>
            {String(speciesCount).padStart(2, "0")}
          </KPITile>
        </div>

        {/* Row 2: Status tiles — grid auto-equalizes height across all 4 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatusTile
            label="Point Creep"
            status={hasCreep ? "Losing Ground" : "On Pace"}
            statusColor={hasCreep ? "text-warning" : "text-success"}
            note={creepNote}
            lines={creepLines}
          />

          <StatusTile
            label="Portfolio"
            status={yearPhaseLabel}
            statusColor={isPortfolioHealthy ? "text-success" : "text-warning"}
            lines={portfolioLines}
          />

          <StatusTile
            label="Burn Rate"
            status={burnAnalysis.status}
            statusColor={burnAnalysis.statusColor}
            note={burnAnalysis.note}
            lines={burnAnalysis.lines}
          />

          <StatusTile
            label="Dream Hunt"
            status={dreamHunt ? `${dreamHunt.year}` : "—"}
            statusColor="text-info"
            lines={dreamHunt
              ? [dreamHunt.species, dreamHunt.state]
              : ["Build points to unlock"]
            }
          />
        </div>
      </div>

      {/* Right: Mini Map */}
      <div className="lg:border-l border-border/50 bg-secondary/50 relative">
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

/* ─── KPI Tile ────────────────────────────────────────────────── */

function KPITile({
  label,
  labelColor,
  numeric,
  children,
}: {
  label: string;
  labelColor: string;
  numeric?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between p-3 rounded-lg bg-secondary/40 border border-border/40 min-h-[88px]">
      <p className={cn("text-[9px] uppercase tracking-wider font-medium", labelColor)}>
        {label}
      </p>
      <p className={cn("text-xl font-bold tracking-tight text-foreground mt-auto", numeric && "tabular-nums")}>
        {children}
      </p>
    </div>
  );
}

/* ─── Status Tile ─────────────────────────────────────────────
 * Auto-expands vertically. Grid equalizes all tiles in the row.
 * - label: muted category (POINT CREEP, PORTFOLIO, etc.)
 * - status: colored verdict (SHIFTING, BUILD YEAR, HEALTHY, 2028)
 * - note: optional TLDR explaining the status
 * - lines: each sentiment on its own line
 */

function StatusTile({
  label,
  status,
  statusColor,
  note,
  lines,
}: {
  label: string;
  status: string;
  statusColor: string;
  note?: string;
  lines: string[];
}) {
  return (
    <div className="flex flex-col p-3 rounded-lg bg-secondary/40 border border-border/40">
      {/* Top: category label + colored status */}
      <p className="text-[8px] uppercase tracking-wider font-medium text-muted-foreground/50 mb-0.5">
        {label}
      </p>
      <p className={cn("text-[10px] uppercase tracking-wider font-bold mb-1.5", statusColor)}>
        {status}
      </p>

      {/* Optional TLDR note */}
      {note && (
        <p className="text-[10px] text-muted-foreground/50 leading-snug mb-1.5 italic">
          {note}
        </p>
      )}

      {/* Stacked lines — each sentiment on its own row */}
      <div className="mt-auto space-y-0.5">
        {lines.map((line, i) => (
          <p key={i} className="text-[11px] text-foreground/80 leading-snug">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
