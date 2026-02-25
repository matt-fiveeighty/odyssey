"use client";

import { useMemo } from "react";
import {
  DollarSign,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  Shield,
  TrendingUp,
  Calendar,
  Target,
  Gauge,
  FileText,
  Scale,
} from "lucide-react";
import { useAppStore, useWizardStore, useRoadmapStore } from "@/lib/store";
import { computeCapitalSummary } from "@/lib/engine/capital-allocator";
import { computeBurnRateMatrix } from "@/lib/engine/capital-allocator";
import {
  calculatePortfolioHealthScore,
  type PortfolioHealthResult,
} from "@/lib/engine/portfolio-health";
import { computeStrategyMetrics } from "@/lib/engine/strategy-metrics";
import { formatSpeciesName } from "@/lib/utils";

// ============================================================================
// KPI Bucket Type
// ============================================================================

interface KPIBucket {
  id: string;
  label: string;
  subLabel: string;           // 3-word sub-label
  value: string;              // Formatted display value
  rawValue: number;           // For delta calculation
  delta?: number | null;      // Change since last session (null = no history)
  deltaLabel?: string;        // "+$120" or "-2.3%"
  trend?: "up" | "down" | "flat";
  icon: React.ReactNode;
  color: string;              // Tailwind text color class
  bgColor: string;            // Tailwind bg color class
  href?: string;              // Link to detail page
}

// ============================================================================
// KPI Grid Component
// ============================================================================

export function KPIGrid() {
  const assessment = useRoadmapStore((s) => s.activeAssessment);
  const mandate = useRoadmapStore((s) => s.portfolioMandate);
  const violations = useRoadmapStore((s) => s.disciplineViolations);
  const milestones = useAppStore((s) => s.milestones);
  const existingPoints = useWizardStore((s) => s.existingPoints);
  const homeState = useWizardStore((s) => s.homeState);

  const buckets = useMemo<KPIBucket[]>(() => {
    if (!assessment) return [];

    // ── Compute engine data ──
    const capitalSummary = computeCapitalSummary(assessment, homeState);
    const burnMatrix = computeBurnRateMatrix(assessment, existingPoints);
    const healthResult = calculatePortfolioHealthScore(assessment, mandate ?? undefined, violations);
    const strategyMetrics = computeStrategyMetrics(assessment, mandate ?? undefined);

    // ── 1. Sunk Capital ──
    const sunkBucket: KPIBucket = {
      id: "sunk-capital",
      label: "Sunk Capital",
      subLabel: "Non-refundable committed",
      value: `$${formatK(capitalSummary.sunkCapital)}`,
      rawValue: capitalSummary.sunkCapital,
      icon: <DollarSign className="h-4 w-4" />,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
      href: "/budget",
    };

    // ── 2. Floated Capital ──
    const floatedBucket: KPIBucket = {
      id: "floated-capital",
      label: "Floated Capital",
      subLabel: "Refundable if unsuccessful",
      value: `$${formatK(capitalSummary.floatedCapital)}`,
      rawValue: capitalSummary.floatedCapital,
      icon: <ArrowDownRight className="h-4 w-4" />,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      href: "/budget",
    };

    // ── 3. Portfolio Value ──
    const portfolioHealth = healthResult.score;
    const portfolioBucket: KPIBucket = {
      id: "portfolio-value",
      label: "Portfolio Health",
      subLabel: "Overall strategy score",
      value: `${portfolioHealth}`,
      rawValue: portfolioHealth,
      icon: <Shield className="h-4 w-4" />,
      color: portfolioHealth >= 70 ? "text-emerald-400" : portfolioHealth >= 40 ? "text-amber-400" : "text-red-400",
      bgColor: portfolioHealth >= 70 ? "bg-emerald-500/10" : portfolioHealth >= 40 ? "bg-amber-500/10" : "bg-red-500/10",
      href: "/roadmap",
    };

    // ── 4. Active F&G Applications ──
    const currentYear = new Date().getFullYear();
    const activeApps = milestones.filter(
      (m) => m.type === "apply" && m.year === currentYear && !m.drawOutcome,
    );
    const appsBucket: KPIBucket = {
      id: "active-apps",
      label: "Active Apps",
      subLabel: "Current year pending",
      value: `${activeApps.length}`,
      rawValue: activeApps.length,
      icon: <FileText className="h-4 w-4" />,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      href: "/rebalance",
    };

    // ── 5. Creep Velocity ──
    const avgPCV = burnMatrix.length > 0
      ? burnMatrix.reduce((sum, b) => sum + b.pcv, 0) / burnMatrix.length
      : 0;
    const deadAssets = burnMatrix.filter((b) => b.isDeadAsset).length;
    const creepBucket: KPIBucket = {
      id: "creep-velocity",
      label: "Creep Velocity",
      subLabel: deadAssets > 0 ? `${deadAssets} dead asset${deadAssets > 1 ? "s" : ""}` : "Points per year",
      value: avgPCV > 0 ? `${avgPCV.toFixed(1)}` : "0.0",
      rawValue: avgPCV,
      trend: avgPCV > 0.5 ? "up" : "flat",
      icon: <TrendingUp className="h-4 w-4" />,
      color: deadAssets > 0 ? "text-red-400" : avgPCV > 0.5 ? "text-amber-400" : "text-emerald-400",
      bgColor: deadAssets > 0 ? "bg-red-500/10" : avgPCV > 0.5 ? "bg-amber-500/10" : "bg-emerald-500/10",
      href: "/calculator",
    };

    // ── 6. Next Milestone ──
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = milestones
      .filter((m) => !m.completed && m.dueDate && m.dueDate >= today)
      .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
    const nextMs = upcoming[0];
    const daysUntil = nextMs?.dueDate
      ? Math.ceil((new Date(nextMs.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;
    const milestoneBucket: KPIBucket = {
      id: "next-milestone",
      label: "Next Milestone",
      subLabel: nextMs
        ? `${nextMs.stateId} ${formatSpeciesName(nextMs.speciesId).split(" ")[0]}`
        : "No upcoming",
      value: daysUntil !== null ? `${daysUntil}d` : "--",
      rawValue: daysUntil ?? 999,
      trend: daysUntil !== null && daysUntil <= 14 ? "up" : "flat",
      icon: <Calendar className="h-4 w-4" />,
      color: daysUntil !== null && daysUntil <= 7
        ? "text-red-400"
        : daysUntil !== null && daysUntil <= 30
          ? "text-amber-400"
          : "text-zinc-400",
      bgColor: daysUntil !== null && daysUntil <= 7
        ? "bg-red-500/10"
        : daysUntil !== null && daysUntil <= 30
          ? "bg-amber-500/10"
          : "bg-zinc-500/10",
      href: "/planner",
    };

    // ── 7. Draw Probability ──
    // Use next high-probability draw year or aggregate stats
    const nextDrawYear = strategyMetrics.nextHighProbabilityDrawYear;
    const yearsUntilDraw = nextDrawYear ? nextDrawYear - currentYear : null;
    const drawBucket: KPIBucket = {
      id: "draw-probability",
      label: "Draw Probability",
      subLabel: nextDrawYear ? `Target year ${nextDrawYear}` : "No draw projected",
      value: yearsUntilDraw !== null ? `${yearsUntilDraw}yr` : "--",
      rawValue: yearsUntilDraw ?? 99,
      icon: <Target className="h-4 w-4" />,
      color: yearsUntilDraw !== null && yearsUntilDraw <= 2
        ? "text-emerald-400"
        : yearsUntilDraw !== null && yearsUntilDraw <= 5
          ? "text-blue-400"
          : "text-zinc-400",
      bgColor: yearsUntilDraw !== null && yearsUntilDraw <= 2
        ? "bg-emerald-500/10"
        : yearsUntilDraw !== null && yearsUntilDraw <= 5
          ? "bg-blue-500/10"
          : "bg-zinc-500/10",
      href: "/calculator",
    };

    // ── 8. Budget Discipline ──
    const disciplineScore = healthResult.breakdown.discipline;
    const budgetPct = healthResult.breakdown.budget;
    const combinedBudgetDiscipline = Math.round((disciplineScore + budgetPct) / 2);
    const disciplineBucket: KPIBucket = {
      id: "budget-discipline",
      label: "Budget Discipline",
      subLabel: violations.length > 0 ? `${violations.length} violation${violations.length > 1 ? "s" : ""}` : "All rules passing",
      value: `${combinedBudgetDiscipline}%`,
      rawValue: combinedBudgetDiscipline,
      icon: <Scale className="h-4 w-4" />,
      color: combinedBudgetDiscipline >= 70
        ? "text-emerald-400"
        : combinedBudgetDiscipline >= 40
          ? "text-amber-400"
          : "text-red-400",
      bgColor: combinedBudgetDiscipline >= 70
        ? "bg-emerald-500/10"
        : combinedBudgetDiscipline >= 40
          ? "bg-amber-500/10"
          : "bg-red-500/10",
      href: "/roadmap",
    };

    return [
      sunkBucket,
      floatedBucket,
      portfolioBucket,
      appsBucket,
      creepBucket,
      milestoneBucket,
      drawBucket,
      disciplineBucket,
    ];
  }, [assessment, mandate, violations, milestones, existingPoints, homeState]);

  if (buckets.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
      {buckets.map((bucket) => (
        <KPIBucketCard key={bucket.id} bucket={bucket} />
      ))}
    </div>
  );
}

// ============================================================================
// Individual Bucket Card
// ============================================================================

function KPIBucketCard({ bucket }: { bucket: KPIBucket }) {
  const Wrapper = bucket.href ? "a" : "div";
  const linkProps = bucket.href ? { href: bucket.href } : {};

  return (
    <Wrapper
      {...linkProps}
      className={`
        group relative rounded-lg border border-zinc-800 p-3
        ${bucket.href ? "cursor-pointer hover:border-zinc-600 transition-colors" : ""}
      `}
    >
      {/* Icon + label */}
      <div className="flex items-center gap-1.5 mb-2">
        <div className={`rounded-md p-1 ${bucket.bgColor}`}>
          <span className={bucket.color}>{bucket.icon}</span>
        </div>
        <span className="label-uppercase leading-tight">
          {bucket.label}
        </span>
      </div>

      {/* Value */}
      <div className={`text-xl font-bold font-financial ${bucket.color} leading-none mb-1`}>
        {bucket.value}
      </div>

      {/* Delta indicator */}
      {bucket.delta !== undefined && bucket.delta !== null && bucket.delta !== 0 && (
        <div className="flex items-center gap-0.5 mb-1">
          {bucket.delta > 0 ? (
            <ArrowUpRight className="h-3 w-3 text-emerald-500" />
          ) : (
            <ArrowDownRight className="h-3 w-3 text-red-500" />
          )}
          <span className={`text-[10px] font-medium font-financial ${bucket.delta > 0 ? "text-emerald-500" : "text-red-500"}`}>
            {bucket.deltaLabel}
          </span>
        </div>
      )}

      {/* Sub-label */}
      <p className="text-[9px] text-muted-foreground/50 leading-tight truncate">
        {bucket.subLabel}
      </p>
    </Wrapper>
  );
}

// ============================================================================
// Compact KPI Strip (for header/nav use)
// ============================================================================

export function KPIStrip() {
  const assessment = useRoadmapStore((s) => s.activeAssessment);
  const homeState = useWizardStore((s) => s.homeState);
  const milestones = useAppStore((s) => s.milestones);

  const data = useMemo(() => {
    if (!assessment) return null;

    const capitalSummary = computeCapitalSummary(assessment, homeState);
    const currentYear = new Date().getFullYear();
    const activeApps = milestones.filter(
      (m) => m.type === "apply" && m.year === currentYear && !m.drawOutcome,
    );

    const today = new Date().toISOString().slice(0, 10);
    const upcoming = milestones
      .filter((m) => !m.completed && m.dueDate && m.dueDate >= today)
      .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
    const nextMs = upcoming[0];
    const daysUntil = nextMs?.dueDate
      ? Math.ceil((new Date(nextMs.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      sunk: capitalSummary.sunkCapital,
      floated: capitalSummary.floatedCapital,
      apps: activeApps.length,
      nextMilestoneDays: daysUntil,
      nextMilestoneLabel: nextMs ? `${nextMs.stateId} ${formatSpeciesName(nextMs.speciesId).split(" ")[0]}` : null,
    };
  }, [assessment, homeState, milestones]);

  if (!data) return null;

  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground/60">
      <span>
        <span className="text-red-400 font-medium font-financial">${formatK(data.sunk)}</span> sunk
      </span>
      <span className="text-border/50">|</span>
      <span>
        <span className="text-amber-400 font-medium font-financial">${formatK(data.floated)}</span> floated
      </span>
      <span className="text-border/50">|</span>
      <span>
        <span className="text-blue-400 font-medium font-financial">{data.apps}</span> apps
      </span>
      {data.nextMilestoneDays !== null && (
        <>
          <span className="text-border/50">|</span>
          <span>
            <span className={`font-medium font-financial ${data.nextMilestoneDays <= 7 ? "text-red-400" : data.nextMilestoneDays <= 30 ? "text-amber-400" : "text-muted-foreground"}`}>
              {data.nextMilestoneDays}d
            </span>
            {" "}to {data.nextMilestoneLabel}
          </span>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

/** Format number to short form: $1,234 → $1.2K, $12,345 → $12.3K */
function formatK(value: number): string {
  if (value >= 10000) return `${(value / 1000).toFixed(1)}K`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
