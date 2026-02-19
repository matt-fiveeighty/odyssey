"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight,
  Trophy,
  Mountain,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Timer,
  Zap,
  DollarSign,
  Shuffle,
  AlertTriangle,
  ExternalLink,
  Calendar,
  Plus,
  Check,
  Clock,
} from "lucide-react";
import { STATES_MAP } from "@/lib/constants/states";
import { SPECIES_MAP } from "@/lib/constants/species";
import { STATE_VISUALS } from "@/lib/constants/state-images";
import { SpeciesAvatar } from "@/components/shared/SpeciesAvatar";
import { resolveFees } from "@/lib/engine/fee-resolver";
import { getEstimatedTagCost } from "@/lib/engine/roi-calculator";
import { DataSourceBadge } from "@/components/shared/DataSourceBadge";
import type { OpportunityResult, OpportunityTier, FeeLineItem } from "@/lib/types";

interface OpportunityResultCardProps {
  result: OpportunityResult;
  rank: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onAddToGoals: (result: OpportunityResult) => void;
  isAlreadyGoal: boolean;
}

const TIER_STYLES: Record<
  OpportunityTier,
  { label: string; color: string }
> = {
  excellent: {
    label: "Excellent",
    color: "bg-success/15 text-success border-success/30",
  },
  good: {
    label: "Good",
    color: "bg-info/15 text-info border-info/30",
  },
  moderate: {
    label: "Moderate",
    color: "bg-warning/15 text-warning border-warning/30",
  },
  long_term: {
    label: "Long-Term",
    color: "bg-premium/15 text-premium border-premium/30",
  },
};

function getDeadlineStatus(deadline?: { open: string; close: string }): {
  label: string;
  color: string;
} | null {
  if (!deadline) return null;
  const now = new Date();
  const open = new Date(deadline.open);
  const close = new Date(deadline.close);

  if (now < open) {
    return {
      label: `Opens ${open.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      color: "text-muted-foreground bg-secondary/50",
    };
  }
  if (now >= open && now <= close) {
    const daysLeft = Math.ceil((close.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return {
      label: daysLeft <= 14 ? `${daysLeft}d left` : `Open — closes ${close.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      color: daysLeft <= 14 ? "text-warning bg-warning/10 font-semibold" : "text-success bg-success/10",
    };
  }
  return {
    label: `Closed — reopens ${open.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`,
    color: "text-muted-foreground/60 bg-secondary/30",
  };
}

function computeFirstYearCost(
  result: OpportunityResult,
): { total: number; items: { label: string; amount: number }[]; isHuntYear: boolean } | null {
  const state = STATES_MAP[result.stateId];
  if (!state) return null;

  // Use NR fees as default (most users are NR)
  const fees = resolveFees(state, "");
  const items: { label: string; amount: number }[] = [];
  const isDrawableNow = result.yearsToUnlock === 0;

  if (fees.qualifyingLicense > 0) {
    const licenseName = fees.feeSchedule.find((f: FeeLineItem) => f.name.includes("License"))?.name ?? "License";
    items.push({ label: licenseName, amount: fees.qualifyingLicense });
  }
  if (fees.appFee > 0) {
    items.push({ label: "Application Fee", amount: fees.appFee });
  }

  const pointCost = fees.pointCost[result.speciesId] ?? 0;
  if (pointCost > 0 && !isDrawableNow) {
    items.push({ label: "Preference Point", amount: pointCost });
  }

  // Only show tag cost if drawable now (buy-a-tag-and-go or random draw)
  if (isDrawableNow) {
    const tagCost = getEstimatedTagCost(result.stateId, result.speciesId);
    if (tagCost > 0) {
      items.push({ label: "Tag (estimated)", amount: tagCost });
    }
  }

  const total = items.reduce((s, i) => s + i.amount, 0);
  return { total, items, isHuntYear: isDrawableNow };
}

export function OpportunityResultCard({
  result,
  rank,
  isExpanded,
  onToggleExpand,
  onAddToGoals,
  isAlreadyGoal,
}: OpportunityResultCardProps) {
  const state = STATES_MAP[result.stateId];
  const species = SPECIES_MAP[result.speciesId];
  const vis = STATE_VISUALS[result.stateId];
  const tierStyle = TIER_STYLES[result.tier];
  const deadlineStatus = getDeadlineStatus(result.applicationDeadline);
  const firstYearCost = isExpanded ? computeFirstYearCost(result) : null;

  return (
    <Card
      className={`bg-card border-border transition-all ${rank === 0 ? "ring-1 ring-primary/30" : ""}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Rank badge */}
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
              rank === 0
                ? "bg-primary text-primary-foreground"
                : rank <= 2
                  ? "bg-primary/15 text-primary"
                  : "bg-secondary text-muted-foreground"
            }`}
          >
            #{rank + 1}
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-center gap-2 flex-wrap">
              <SpeciesAvatar speciesId={result.speciesId} size={20} />
              <h3 className="font-semibold text-sm">
                {species?.name ?? result.speciesId}
              </h3>
              {state && (
                <div
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold text-white shrink-0 bg-gradient-to-br ${vis?.gradient ?? "from-slate-700 to-slate-900"}`}
                >
                  {state.abbreviation}
                </div>
              )}
              {result.isOnceInALifetime && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/15 text-warning font-semibold flex items-center gap-0.5">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  OIAL
                </span>
              )}
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ml-auto ${tierStyle.color}`}
              >
                {tierStyle.label}
              </span>
            </div>

            {/* Top reason callout */}
            <div className="mt-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
              <div className="flex items-start gap-2">
                <Zap className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-primary">
                  {result.topReason}
                </p>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {/* Your points vs required */}
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${
                  result.yearsToUnlock === 0
                    ? "bg-success/10 text-success font-semibold"
                    : result.yearsToUnlock <= 3
                      ? "bg-info/10 text-info"
                      : "bg-secondary/50 text-muted-foreground"
                }`}
              >
                <Timer className="w-3 h-3" />
                {result.pointSystem === "random"
                  ? "Random"
                  : result.yearsToUnlock === 0
                    ? result.pointsRequired === 0
                      ? "No pts needed"
                      : `${result.userPoints}/${result.pointsRequired} pts`
                    : `${result.userPoints}/${result.pointsRequired} pts · ~${result.yearsToUnlock}yr`}
              </div>

              {/* Draw system */}
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-secondary/50 text-muted-foreground">
                <Shuffle className="w-3 h-3" />
                {result.pointSystemLabel}
              </div>

              {/* Annual cost */}
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${
                  result.annualPointCost === 0
                    ? "bg-success/10 text-success font-semibold"
                    : "bg-secondary/50 text-muted-foreground"
                }`}
              >
                <DollarSign className="w-3 h-3" />
                {result.annualPointCost === 0
                  ? "Free"
                  : `$${result.annualPointCost}/yr`}
              </div>

              {/* Deadline status badge */}
              {deadlineStatus && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${deadlineStatus.color}`}>
                  <Calendar className="w-3 h-3" />
                  {deadlineStatus.label}
                </div>
              )}

              {/* Success rate (only if unit data) */}
              {result.bestUnit && (
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${
                    result.bestUnit.successRate >= 0.25
                      ? "bg-success/10 text-success font-semibold"
                      : "bg-secondary/50 text-muted-foreground"
                  }`}
                >
                  <TrendingUp className="w-3 h-3" />
                  {Math.round(result.bestUnit.successRate * 100)}%
                </div>
              )}

              {/* Trophy (only if unit data) */}
              {result.bestUnit && result.bestUnit.trophyRating >= 6 && (
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${
                    result.bestUnit.trophyRating >= 7
                      ? "bg-warning/10 text-warning font-semibold"
                      : "bg-secondary/50 text-muted-foreground"
                  }`}
                >
                  <Trophy className="w-3 h-3" />
                  {result.bestUnit.trophyRating}/10
                </div>
              )}

              {/* Public land (only if unit data) */}
              {result.bestUnit && result.bestUnit.publicLandPct >= 0.4 && (
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${
                    result.bestUnit.publicLandPct >= 0.5
                      ? "bg-info/10 text-info font-semibold"
                      : "bg-secondary/50 text-muted-foreground"
                  }`}
                >
                  <Mountain className="w-3 h-3" />
                  {Math.round(result.bestUnit.publicLandPct * 100)}% public
                </div>
              )}
            </div>

            {/* No unit data indicator */}
            {!result.hasUnitData && (
              <p className="text-[10px] text-muted-foreground/60 mt-1.5 italic">
                Detailed unit data coming soon
              </p>
            )}

            {/* ============================================================ */}
            {/* EXPANDED: Action Hub */}
            {/* ============================================================ */}
            {isExpanded && (
              <div className="mt-3 space-y-3 fade-in-up">
                {/* Unit detail preview */}
                {result.hasUnitData && result.bestUnit && (
                  <div className="p-2 rounded-lg bg-secondary/30 border border-border">
                    <p className="text-[10px] font-semibold text-muted-foreground mb-1">
                      Top Unit: {result.bestUnit.unitCode}{" "}
                      {result.bestUnit.unitName !== result.bestUnit.unitCode &&
                        `(${result.bestUnit.unitName})`}
                    </p>
                    <div className="flex gap-3 text-[10px] text-muted-foreground">
                      <span>
                        {Math.round(result.bestUnit.successRate * 100)}% success
                      </span>
                      <span>Trophy {result.bestUnit.trophyRating}/10</span>
                      <span>
                        {Math.round(result.bestUnit.publicLandPct * 100)}% public
                      </span>
                      <span>{result.bestUnit.pressureLevel} pressure</span>
                    </div>
                    {result.unitCount > 1 && (
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        +{result.unitCount - 1} more unit
                        {result.unitCount - 1 > 1 ? "s" : ""} with data
                      </p>
                    )}
                  </div>
                )}

                {/* Cost breakdown */}
                {firstYearCost && firstYearCost.items.length > 0 && (
                  <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                    <p className="text-[10px] font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {firstYearCost.isHuntYear ? "Year 1 — Draw & Hunt (NR)" : "Year 1 — Build Points (NR)"}
                    </p>
                    <div className="space-y-1">
                      {firstYearCost.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-medium font-mono">${item.amount.toLocaleString()}</span>
                        </div>
                      ))}
                      <Separator className="my-1.5" />
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span>Total Year 1</span>
                        <span className="text-primary font-mono">${firstYearCost.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Data source citation */}
                <DataSourceBadge stateId={result.stateId} dataType="Fee Schedule" />

                {/* Application timeline */}
                {result.applicationDeadline && (
                  <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                    <p className="text-[10px] font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Application Timeline
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div>
                        <span className="text-[10px] text-muted-foreground/60 block">Opens</span>
                        <span className="font-medium">
                          {new Date(result.applicationDeadline.open).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                      <ArrowRight className="w-3 h-3 text-muted-foreground/40" />
                      <div>
                        <span className="text-[10px] text-muted-foreground/60 block">Closes</span>
                        <span className="font-medium">
                          {new Date(result.applicationDeadline.close).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                      {state?.drawResultDates?.[result.speciesId] && (
                        <>
                          <ArrowRight className="w-3 h-3 text-muted-foreground/40" />
                          <div>
                            <span className="text-[10px] text-muted-foreground/60 block">Results</span>
                            <span className="font-medium">
                              {new Date(state.drawResultDates[result.speciesId]).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Why bullets (all of them when expanded) */}
                {result.whyBullets.length > 0 && (
                  <div className="space-y-1">
                    {result.whyBullets.map((bullet, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-1.5 text-[11px] text-muted-foreground"
                      >
                        <ArrowRight className="w-3 h-3 text-primary/60 shrink-0 mt-0.5" />
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-2 pt-1">
                  {isAlreadyGoal ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/10 text-success text-xs font-medium">
                      <Check className="w-3.5 h-3.5" />
                      Added to Goals
                    </div>
                  ) : (
                    <Button
                      onClick={() => onAddToGoals(result)}
                      size="sm"
                      className="gap-1.5 text-xs h-8"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add to Goals
                    </Button>
                  )}
                  {state && (
                    <a
                      href={state.buyPointsUrl || state.fgUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors h-8"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {state.name} F&G
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Collapsed: show first 2 bullets + expand toggle */}
            {!isExpanded && result.whyBullets.length > 0 && (
              <div className="mt-2 space-y-1">
                {result.whyBullets.slice(0, 2).map((bullet, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-1.5 text-[11px] text-muted-foreground"
                  >
                    <ArrowRight className="w-3 h-3 text-primary/60 shrink-0 mt-0.5" />
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Expand toggle */}
            <button
              onClick={onToggleExpand}
              className="flex items-center gap-1 text-[10px] text-primary mt-1.5 hover:underline"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3 h-3" /> Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  {result.hasUnitData ? "Details & actions" : "Cost breakdown & actions"}
                </>
              )}
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
