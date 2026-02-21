"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  RefreshCw,
  Check,
  X,
  Clock,
  TrendingUp,
  ArrowRight,
  AlertTriangle,
  Target,
  Zap,
  MapPin,
  Crosshair,
} from "lucide-react";
import Link from "next/link";
import { useAppStore, useRoadmapStore } from "@/lib/store";
import { STATES_MAP } from "@/lib/constants/states";
import { STATE_VISUALS } from "@/lib/constants/state-images";
import { SpeciesAvatar } from "@/components/shared/SpeciesAvatar";
import { formatSpeciesName } from "@/lib/utils";
import {
  estimateCreepRate,
  yearsToDrawWithCreep,
  drawConfidenceBand,
} from "@/lib/engine/point-creep";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DrawStatus = "drew" | "didnt_draw" | "awaiting" | "not_applied";

interface StateDrawSummary {
  stateId: string;
  species: { speciesId: string; status: DrawStatus; milestoneId: string }[];
}

interface RebalanceOption {
  label: string;
  description: string;
  icon: React.ReactNode;
  actionLabel: string;
  actionHref: string;
  accent: string; // tailwind color class
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveDrawStatus(
  m: { completed: boolean; drawOutcome?: "drew" | "didnt_draw" | null; drawResultDate?: string },
): DrawStatus {
  if (m.drawOutcome === "drew") return "drew";
  if (m.drawOutcome === "didnt_draw") return "didnt_draw";
  if (m.completed && m.drawResultDate) {
    const resultsDate = new Date(m.drawResultDate);
    return resultsDate <= new Date() ? "awaiting" : "awaiting";
  }
  if (m.completed) return "awaiting";
  return "not_applied";
}

function statusLabel(s: DrawStatus) {
  switch (s) {
    case "drew": return "Drew";
    case "didnt_draw": return "Didn't Draw";
    case "awaiting": return "Awaiting";
    case "not_applied": return "Not Applied";
  }
}

function statusColor(s: DrawStatus) {
  switch (s) {
    case "drew": return "bg-chart-2/15 text-chart-2";
    case "didnt_draw": return "bg-secondary text-muted-foreground";
    case "awaiting": return "bg-chart-4/15 text-chart-4";
    case "not_applied": return "bg-muted text-muted-foreground/60";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RebalancePage() {
  const { milestones, userPoints } = useAppStore();
  const activeAssessment = useRoadmapStore((s) => s.activeAssessment);

  const currentYear = new Date().getFullYear();

  // Gather this year's apply milestones
  const applyMilestones = useMemo(
    () => milestones.filter((m) => m.type === "apply" && m.year === currentYear),
    [milestones, currentYear],
  );

  // Group by state
  const stateDrawSummaries = useMemo(() => {
    const map = new Map<string, StateDrawSummary>();
    for (const m of applyMilestones) {
      if (!map.has(m.stateId)) {
        map.set(m.stateId, { stateId: m.stateId, species: [] });
      }
      map.get(m.stateId)!.species.push({
        speciesId: m.speciesId,
        status: resolveDrawStatus(m),
        milestoneId: m.id,
      });
    }
    return [...map.values()];
  }, [applyMilestones]);

  // Aggregate counts
  const drew = applyMilestones.filter((m) => m.drawOutcome === "drew").length;
  const didntDraw = applyMilestones.filter((m) => m.drawOutcome === "didnt_draw").length;
  const awaiting = applyMilestones.filter(
    (m) => m.completed && !m.drawOutcome,
  ).length;
  const notApplied = applyMilestones.filter((m) => !m.completed).length;
  const hasOutcomes = drew + didntDraw > 0;

  // Unrecorded results (completed + drawResultDate in the past + no outcome)
  const unrecorded = useMemo(
    () =>
      applyMilestones.filter(
        (m) =>
          m.completed &&
          !m.drawOutcome &&
          m.drawResultDate &&
          new Date(m.drawResultDate) <= new Date(),
      ),
    [applyMilestones],
  );

  // Build rebalance options for "didn't draw" species
  const rebalanceCards = useMemo(() => {
    if (!activeAssessment) return [];

    const cards: {
      stateId: string;
      speciesId: string;
      options: RebalanceOption[];
      userPts: number;
      creepRate: number;
      yearsToDraw: number;
    }[] = [];

    for (const summary of stateDrawSummaries) {
      const didntDrawSpecies = summary.species.filter(
        (s) => s.status === "didnt_draw",
      );
      for (const sp of didntDrawSpecies) {
        const stateRec = activeAssessment.stateRecommendations.find(
          (r) => r.stateId === summary.stateId,
        );
        const topUnit = stateRec?.bestUnits.sort(
          (a, b) => b.trophyRating - a.trophyRating,
        )[0];

        const trophyRating = topUnit?.trophyRating ?? 5;
        const creepRate = estimateCreepRate(trophyRating);
        const ptsRequired = topUnit?.drawConfidence?.expected ?? Math.round(trophyRating * 1.5);
        const userPtsEntry = userPoints.find(
          (p) => p.stateId === summary.stateId && p.speciesId === sp.speciesId,
        );
        const userPts = userPtsEntry?.points ?? 0;
        const yearsToDraw = yearsToDrawWithCreep(userPts, ptsRequired, creepRate);

        const options: RebalanceOption[] = [];

        // Option 1: Stay the course
        const band = drawConfidenceBand(userPts, ptsRequired, creepRate);
        options.push({
          label: "Stay the Course",
          description:
            yearsToDraw < 30
              ? `Keep building points. At current pace you'll draw in ~${yearsToDraw} year${yearsToDraw !== 1 ? "s" : ""} (optimistic: ${band.optimistic}, pessimistic: ${band.pessimistic}).`
              : `Point requirements are creeping faster than you can accumulate. Consider alternative strategies.`,
          icon: <Clock className="w-4 h-4" />,
          actionLabel: "View Points",
          actionHref: "/points",
          accent: yearsToDraw < 10 ? "border-chart-2/20" : "border-chart-4/20",
        });

        // Option 2: Burn consolation — suggest lower-tier unit in same state
        const consolationUnit = stateRec?.bestUnits.find(
          (u) => u.trophyRating < trophyRating && u.trophyRating >= 3,
        );
        if (consolationUnit) {
          options.push({
            label: "Burn Consolation Tag",
            description: `Apply for ${consolationUnit.unitName || consolationUnit.unitCode} (trophy ${consolationUnit.trophyRating}/10). Lower bar, real hunt. Draw in ~${consolationUnit.drawConfidence?.expected ?? "2-3"} years.`,
            icon: <Zap className="w-4 h-4" />,
            actionLabel: "Explore Units",
            actionHref: "/units",
            accent: "border-primary/20",
          });
        }

        // Option 3: Pivot state — find same species in other recommended states
        const altStates = activeAssessment.stateRecommendations.filter(
          (r) =>
            r.stateId !== summary.stateId &&
            r.bestUnits.some(
              (u) =>
                activeAssessment.stateRecommendations
                  .find((sr) => sr.stateId === r.stateId)
                  ?.bestUnits.length ?? 0 > 0,
            ),
        );
        // Find states that have the same species
        const alsoConsidered = activeAssessment.alsoConsidered ?? [];
        const altWithSpecies = [
          ...altStates.map((r) => r.stateId),
          ...alsoConsidered
            .filter((ac) => ac.speciesAvailable.includes(sp.speciesId))
            .map((ac) => ac.stateId),
        ];
        const uniqueAlts = [...new Set(altWithSpecies)].filter(
          (id) => id !== summary.stateId,
        );

        if (uniqueAlts.length > 0) {
          const altNames = uniqueAlts
            .slice(0, 3)
            .map((id) => STATES_MAP[id]?.abbreviation ?? id)
            .join(", ");
          options.push({
            label: "Pivot to Another State",
            description: `${formatSpeciesName(sp.speciesId)} is also available in ${altNames}. Different point systems may offer faster draw timelines.`,
            icon: <MapPin className="w-4 h-4" />,
            actionLabel: "Rebuild Plan",
            actionHref: "/plan-builder",
            accent: "border-chart-5/20",
          });
        }

        cards.push({
          stateId: summary.stateId,
          speciesId: sp.speciesId,
          options,
          userPts,
          creepRate,
          yearsToDraw,
        });
      }
    }

    return cards;
  }, [stateDrawSummaries, activeAssessment, userPoints]);

  // -----------------------------------------------------------------------
  // Empty state — no milestones at all
  // -----------------------------------------------------------------------

  if (applyMilestones.length === 0) {
    return (
      <div className="p-6 fade-in-up">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Rebalance</h1>
        <p className="text-sm text-muted-foreground mb-8">
          After you apply and draw results come in, this page shows what changed
          and how to adjust your strategy.
        </p>
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <RefreshCw className="w-10 h-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            No applications recorded for {currentYear}. Complete the
            consultation and start tracking milestones to unlock rebalance
            insights.
          </p>
          <Link href="/plan-builder">
            <Button className="gap-2">
              <Target className="w-4 h-4" />
              Build Your Strategy
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Main view
  // -----------------------------------------------------------------------

  return (
    <div className="p-6 space-y-6 fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rebalance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {currentYear} draw results and strategy adjustments
          </p>
        </div>
        <Link href="/plan-builder">
          <Button variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Rebuild Strategy
          </Button>
        </Link>
      </div>

      {/* ================================================================ */}
      {/* OUTCOME SUMMARY                                                  */}
      {/* ================================================================ */}
      <Card className="bg-card border-border overflow-hidden">
        <div
          className={`h-1 bg-gradient-to-r ${hasOutcomes ? "from-chart-2 via-chart-4 to-secondary" : "from-chart-4 to-secondary"}`}
        />
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <Crosshair className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">
              {currentYear} Draw Summary
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: "Drew", count: drew, color: "text-chart-2", bg: "bg-chart-2/15" },
              { label: "Didn't Draw", count: didntDraw, color: "text-muted-foreground", bg: "bg-secondary" },
              { label: "Awaiting", count: awaiting, color: "text-chart-4", bg: "bg-chart-4/15" },
              { label: "Not Applied", count: notApplied, color: "text-muted-foreground/60", bg: "bg-muted" },
            ].map((item) => (
              <div key={item.label} className={`rounded-xl p-3 ${item.bg}`}>
                <p className={`text-2xl font-bold ${item.color}`}>{item.count}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {item.label}
                </p>
              </div>
            ))}
          </div>

          {hasOutcomes && (
            <p className="text-sm text-muted-foreground">
              You applied to {applyMilestones.length} draw
              {applyMilestones.length > 1 ? "s" : ""} in {currentYear}. Drew{" "}
              {drew}, didn&apos;t draw {didntDraw}
              {awaiting > 0 ? `, ${awaiting} still awaiting results` : ""}.
              {didntDraw > 0 && " See rebalance options below."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* UNRECORDED RESULTS ALERT                                         */}
      {/* ================================================================ */}
      {unrecorded.length > 0 && (
        <div className="p-4 rounded-xl border border-chart-4/30 bg-chart-4/5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-chart-4 shrink-0" />
            <span className="text-sm font-semibold text-chart-4">
              {unrecorded.length} draw result
              {unrecorded.length > 1 ? "s" : ""} ready to record
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Results have been posted for these draws. Record your outcomes to
            unlock rebalance recommendations.
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {unrecorded.map((m) => {
              const state = STATES_MAP[m.stateId];
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-chart-4/10 text-xs"
                >
                  {state && (
                    <span
                      className="w-5 h-5 rounded flex items-center justify-center text-[7px] font-bold text-white"
                      style={{ backgroundColor: state.color }}
                    >
                      {state.abbreviation}
                    </span>
                  )}
                  <SpeciesAvatar speciesId={m.speciesId} size={14} />
                  <span className="font-medium">
                    {formatSpeciesName(m.speciesId)}
                  </span>
                </div>
              );
            })}
          </div>
          <Link href="/goals">
            <Button size="sm" variant="outline" className="gap-2">
              Record Results <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* ================================================================ */}
      {/* STATE-BY-STATE BREAKDOWN                                         */}
      {/* ================================================================ */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wider">
          State-by-State Results
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {stateDrawSummaries.map((summary) => {
            const state = STATES_MAP[summary.stateId];
            const vis = STATE_VISUALS[summary.stateId];
            if (!state) return null;
            const drewCount = summary.species.filter(
              (s) => s.status === "drew",
            ).length;
            const didntCount = summary.species.filter(
              (s) => s.status === "didnt_draw",
            ).length;

            return (
              <Card
                key={summary.stateId}
                className={`bg-card border-border overflow-hidden ${drewCount > 0 && didntCount === 0 ? "border-chart-2/20" : didntCount > 0 ? "border-chart-4/20" : ""}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0 bg-gradient-to-br ${vis?.gradient ?? "from-slate-700 to-slate-900"}`}
                    >
                      {state.abbreviation}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{state.name}</p>
                      <div className="flex gap-1.5 mt-0.5">
                        {drewCount > 0 && (
                          <Badge className="bg-chart-2/15 text-chart-2 border-0 text-[10px] px-1.5 py-0">
                            <Check className="w-3 h-3 mr-0.5" />
                            {drewCount} drew
                          </Badge>
                        )}
                        {didntCount > 0 && (
                          <Badge className="bg-secondary text-muted-foreground border-0 text-[10px] px-1.5 py-0">
                            <X className="w-3 h-3 mr-0.5" />
                            {didntCount} didn&apos;t
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {summary.species.map((sp) => (
                      <div
                        key={sp.speciesId}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-secondary/30"
                      >
                        <SpeciesAvatar speciesId={sp.speciesId} size={18} />
                        <span className="text-xs font-medium flex-1">
                          {formatSpeciesName(sp.speciesId)}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-medium ${statusColor(sp.status)}`}
                        >
                          {statusLabel(sp.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ================================================================ */}
      {/* REBALANCE OPTIONS                                                */}
      {/* ================================================================ */}
      {rebalanceCards.length > 0 && (
        <div className="space-y-4">
          <Separator />
          <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wider">
            Rebalance Options
          </h2>
          <p className="text-sm text-muted-foreground">
            You didn&apos;t draw {rebalanceCards.length} tag
            {rebalanceCards.length > 1 ? "s" : ""}. Here are your options for
            each:
          </p>
          <div className="space-y-5">
            {rebalanceCards.map((card) => {
              const state = STATES_MAP[card.stateId];
              if (!state) return null;
              return (
                <Card
                  key={`${card.stateId}-${card.speciesId}`}
                  className="bg-card border-border"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <SpeciesAvatar speciesId={card.speciesId} size={28} />
                      <div>
                        <CardTitle className="text-base">
                          {state.name} {formatSpeciesName(card.speciesId)}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {card.userPts > 0
                            ? `${card.userPts} pts · creep +${card.creepRate.toFixed(1)}/yr · ~${card.yearsToDraw < 30 ? `${card.yearsToDraw} yrs to draw` : "30+ yrs"}`
                            : `Creep rate +${card.creepRate.toFixed(1)}/yr`}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {card.options.map((opt) => (
                      <div
                        key={opt.label}
                        className={`p-3 rounded-xl border ${opt.accent} bg-secondary/20`}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          {opt.icon}
                          <span className="text-sm font-semibold">
                            {opt.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {opt.description}
                        </p>
                        <Link href={opt.actionHref}>
                          <Button size="sm" variant="ghost" className="gap-1.5 text-xs h-7 px-2">
                            {opt.actionLabel}
                            <ArrowRight className="w-3 h-3" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* DREW TAGS — What's Next                                          */}
      {/* ================================================================ */}
      {drew > 0 && (
        <div className="space-y-4">
          <Separator />
          <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wider">
            Tags You Drew
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {applyMilestones
              .filter((m) => m.drawOutcome === "drew")
              .map((m) => {
                const state = STATES_MAP[m.stateId];
                return (
                  <Card
                    key={m.id}
                    className="bg-card border-chart-2/20 overflow-hidden"
                  >
                    <div className="h-1 bg-chart-2" />
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <SpeciesAvatar speciesId={m.speciesId} size={28} />
                        <div className="flex-1">
                          <p className="text-sm font-semibold">
                            {state?.name} {formatSpeciesName(m.speciesId)}
                          </p>
                          <p className="text-xs text-chart-2 font-medium">
                            Tag in hand
                          </p>
                        </div>
                        <Link href="/goals">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs h-7"
                          >
                            Plan Hunt
                            <ArrowRight className="w-3 h-3" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </div>
      )}

      {/* Bottom CTA */}
      <div className="pt-4 flex justify-center">
        <Link href="/plan-builder">
          <Button className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Rebuild Full Strategy
          </Button>
        </Link>
      </div>
    </div>
  );
}
