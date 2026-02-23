"use client";

import { useMemo } from "react";
import Image from "next/image";
import {
  Calendar,
  ExternalLink,
  Download,
  Star,
  Clock,
  History,
  Check,
  Trophy,
  X,
  Sparkles,
  MapPin,
  DollarSign,
  Target,
} from "lucide-react";
import { STATES, STATES_MAP } from "@/lib/constants/states";
import { STATE_VISUALS } from "@/lib/constants/state-images";
import { SPECIES_IMAGES } from "@/lib/constants/species-images";
import { useAppStore, useWizardStore } from "@/lib/store";
import { formatSpeciesName } from "@/lib/utils";
import { StateOutline } from "@/components/shared/StateOutline";
import { DataSourceInline } from "@/components/shared/DataSourceBadge";
import { exportDeadline } from "@/lib/calendar-export";
import { resolveFees } from "@/lib/engine/fee-resolver";

/** NAM date: "April 7, 2026" */
function formatNAM(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Compact date for tight spaces: "Apr 7" */
function formatCompact(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

type Deadline = {
  stateId: string;
  stateName: string;
  species: string;
  openDate: string;
  closeDate: string;
  color: string;
  buyPointsUrl: string;
  drawResultDate?: string;
};

/** Group deadlines by state for the row-based layout */
type StateDeadlineGroup = {
  stateId: string;
  deadlines: Deadline[];
  earliestClose: string;
};

export default function DeadlinesPage() {
  const { userGoals, userPoints, confirmedAssessment, milestones } =
    useAppStore();
  const wizardSpecies = useWizardStore((s) => s.species);
  const homeState = useWizardStore((s) => s.homeState);
  const now = new Date();

  // ── Build all upcoming deadlines ──────────────────────────────────
  const allDeadlines = useMemo(() => {
    return STATES.flatMap((s) => {
      const deadlines: Deadline[] = [];
      Object.entries(s.applicationDeadlines).forEach(([species, dates]) => {
        if (dates?.close && new Date(dates.close) > now) {
          deadlines.push({
            stateId: s.id,
            stateName: s.name,
            species,
            openDate: dates.open,
            closeDate: dates.close,
            color: s.color,
            buyPointsUrl: s.buyPointsUrl,
            drawResultDate: s.drawResultDates?.[species],
          });
        }
      });
      return deadlines;
    }).sort((a, b) => a.closeDate.localeCompare(b.closeDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Invested states & species (for highlighting "yours") ──────────
  const investedStates = useMemo(() => {
    const set = new Set<string>();
    userPoints.forEach((p) => set.add(p.stateId));
    userGoals.forEach((g) => set.add(g.stateId));
    confirmedAssessment?.stateRecommendations.forEach((r) =>
      set.add(r.stateId),
    );
    return set;
  }, [userPoints, userGoals, confirmedAssessment]);

  const investedSpecies = useMemo(() => {
    const set = new Set<string>();
    wizardSpecies.forEach((sp) => set.add(sp));
    userGoals.forEach((g) => set.add(g.speciesId));
    userPoints.forEach((p) => set.add(p.speciesId));
    return set;
  }, [wizardSpecies, userGoals, userPoints]);

  const isRelevant = (d: Deadline) =>
    investedStates.has(d.stateId) && investedSpecies.has(d.species);

  const yourDeadlines = allDeadlines.filter(isRelevant);
  const otherDeadlines = allDeadlines.filter((d) => !isRelevant(d));

  // Group by state for the row layout
  function groupByState(deadlines: Deadline[]): StateDeadlineGroup[] {
    const map = new Map<string, Deadline[]>();
    for (const d of deadlines) {
      const existing = map.get(d.stateId) ?? [];
      existing.push(d);
      map.set(d.stateId, existing);
    }
    return Array.from(map.entries())
      .map(([stateId, dls]) => ({
        stateId,
        deadlines: dls.sort((a, b) => a.closeDate.localeCompare(b.closeDate)),
        earliestClose: dls.reduce(
          (min, d) => (d.closeDate < min ? d.closeDate : min),
          dls[0].closeDate,
        ),
      }))
      .sort((a, b) => a.earliestClose.localeCompare(b.earliestClose));
  }

  const yourByState = groupByState(yourDeadlines);
  const otherByState = groupByState(otherDeadlines);

  // ── Helpers ───────────────────────────────────────────────────────
  function daysUntil(dateStr: string) {
    return Math.ceil(
      (new Date(dateStr).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  function urgencyColor(days: number) {
    if (days <= 3) return "text-destructive";
    if (days <= 7) return "text-chart-4";
    if (days <= 14) return "text-warning";
    return "text-muted-foreground";
  }

  function urgencyBg(days: number) {
    if (days <= 3) return "bg-destructive/10 border-destructive/20";
    if (days <= 7) return "bg-chart-4/10 border-chart-4/20";
    if (days <= 14) return "bg-warning/10 border-warning/20";
    return "bg-muted/30 border-border/30";
  }

  // Get recommended units for a state/species from the assessment
  function getRecoUnits(stateId: string, speciesId: string): string[] {
    const rec = confirmedAssessment?.stateRecommendations.find(
      (r) => r.stateId === stateId,
    );
    if (!rec?.bestUnits) return [];
    return rec.bestUnits
      .filter((u) => {
        // If unit has species context, filter by it; otherwise include all
        return true;
      })
      .slice(0, 3)
      .map((u) => u.unitCode);
  }

  // ── State Card Component (compact for 2-wide grid) ─────────────
  function StateDeadlineCard({
    group,
    featured,
  }: {
    group: StateDeadlineGroup;
    featured?: boolean;
  }) {
    const state = STATES_MAP[group.stateId];
    if (!state) return null;

    const vis = STATE_VISUALS[group.stateId];
    const fees = resolveFees(state, homeState);
    const earliestDays = daysUntil(group.earliestClose);
    const appApproach = state.applicationApproach;

    const drawResultSample = group.deadlines.find(
      (d) => d.drawResultDate,
    )?.drawResultDate;

    return (
      <div
        className={`rounded-xl border overflow-hidden transition-all ${
          featured
            ? "border-primary/20 bg-card"
            : "border-border/40 bg-card/60"
        }`}
      >
        {/* ── State header bar ─────────────────────────────────── */}
        <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border/30">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br ${vis?.gradient ?? "from-slate-700 to-slate-900"}`}
          >
            <StateOutline
              stateId={group.stateId}
              size={18}
              strokeColor="white"
              strokeWidth={2.5}
              fillColor="rgba(255,255,255,0.15)"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold leading-tight truncate">
                {state.name}
              </h3>
              <div
                className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-medium ${urgencyBg(earliestDays)} ${urgencyColor(earliestDays)}`}
              >
                {earliestDays > 0 ? `${earliestDays}d left` : "Passed"}
              </div>
            </div>
            <DataSourceInline stateId={group.stateId} />
          </div>
        </div>

        {/* ── Quick facts row ──────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-[10px] text-muted-foreground border-b border-border/20">
          {fees.qualifyingLicense > 0 && (
            <span>
              <span className="font-medium text-foreground/80">
                ${Math.round(fees.qualifyingLicense)}
              </span>{" "}
              license
            </span>
          )}
          <span>
            <span className="font-medium text-foreground/80">
              ${Math.round(fees.appFee)}
            </span>{" "}
            app fee
          </span>
          <span>
            {state.pointSystem} points
          </span>
          <span>
            {appApproach === "per_unit"
              ? "per unit"
              : appApproach === "per_region"
                ? "per region"
                : "statewide"}
          </span>
          {drawResultSample && (
            <span>
              Results ~{formatCompact(drawResultSample)}
            </span>
          )}
        </div>

        {/* ── Species grid ─────────────────────────────────────── */}
        <div className="p-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {group.deadlines.map((d, i) => {
              const days = daysUntil(d.closeDate);
              const speciesImg = SPECIES_IMAGES[d.species];
              const tagCost = fees.tagCosts[d.species] ?? 0;
              const ptCost = fees.pointCost[d.species] ?? 0;

              return (
                <div
                  key={`${d.species}-${i}`}
                  className="relative rounded-lg overflow-hidden border border-border/30 group/card hover:border-primary/30 transition-all"
                >
                  {/* Background image */}
                  <div className="relative h-16 overflow-hidden">
                    {speciesImg ? (
                      <Image
                        src={speciesImg.src}
                        alt={speciesImg.alt}
                        fill
                        className="object-cover opacity-60 group-hover/card:opacity-75 transition-opacity duration-300"
                        sizes="(max-width: 768px) 50vw, 15vw"
                      />
                    ) : (
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${vis?.gradient ?? "from-slate-800 to-slate-900"} opacity-40`}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
                    <div
                      className={`absolute top-1 right-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-card/80 backdrop-blur-sm ${urgencyColor(days)}`}
                    >
                      {days}d
                    </div>
                  </div>

                  <div className="px-2 py-1.5 space-y-0.5">
                    <p className="text-[10px] font-semibold truncate leading-tight">
                      {formatSpeciesName(d.species)}
                    </p>
                    <p className="text-[9px] text-muted-foreground">
                      {formatCompact(d.openDate)} &rarr; {formatCompact(d.closeDate)}
                    </p>
                    <div className="flex gap-x-2 text-[9px] text-muted-foreground/70">
                      {tagCost > 0 && (
                        <span>${Math.round(tagCost).toLocaleString()} tag</span>
                      )}
                      {ptCost > 0 && (
                        <span>${Math.round(ptCost)}/pt</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Footer links ─────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-3 py-2 border-t border-border/20">
          <a
            href={state.buyPointsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-primary font-medium hover:underline"
          >
            Apply at F&G <ExternalLink className="w-2.5 h-2.5" />
          </a>
          <button
            onClick={() => {
              for (const d of group.deadlines) {
                exportDeadline({
                  stateName: d.stateName,
                  species: formatSpeciesName(d.species),
                  openDate: d.openDate,
                  closeDate: d.closeDate,
                  url: state.buyPointsUrl,
                });
              }
            }}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Download className="w-2.5 h-2.5" /> .ics
          </button>
        </div>
      </div>
    );
  }

  // ── Completed actions (milestones the user already acted on) ──────
  const completedActions = milestones.filter(
    (m) =>
      (m.type === "apply" || m.type === "buy_points") &&
      (m.completed || m.drawOutcome),
  );

  const completedByState = useMemo(() => {
    const map: Record<string, typeof completedActions> = {};
    for (const m of completedActions) {
      if (!map[m.stateId]) map[m.stateId] = [];
      map[m.stateId].push(m);
    }
    return map;
  }, [completedActions]);

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-5 fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold tracking-tight">Deadlines</h1>
        <span className="text-xs text-muted-foreground hidden sm:inline">
          &mdash; {allDeadlines.length} upcoming across all states
        </span>
      </div>

      {/* ── Your Deadlines ──────────────────────────────────────────── */}
      {yourByState.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Your Deadlines</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {yourDeadlines.length} across {yourByState.length} state
              {yourByState.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {yourByState.map((group) => (
              <StateDeadlineCard
                key={group.stateId}
                group={group}
                featured
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Divider between your and other deadlines ────────────────── */}
      {yourByState.length > 0 && otherByState.length > 0 && (
        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/30" />
          </div>
          <div className="relative flex justify-center">
            <div className="flex items-center gap-2 px-4 py-1.5 bg-background rounded-full border border-border/30">
              <Sparkles className="w-3.5 h-3.5 text-muted-foreground/50" />
              <span className="text-[11px] text-muted-foreground">
                Not on your radar — but if you have extra funds, here are more
                opportunities
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Other Deadlines ─────────────────────────────────────────── */}
      {otherByState.length > 0 && (
        <section className="space-y-3">
          {!yourByState.length && (
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                All Upcoming Deadlines
              </h2>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {otherByState.map((group) => (
              <StateDeadlineCard key={group.stateId} group={group} />
            ))}
          </div>
        </section>
      )}

      {/* ── Your Activity (completed milestones) ────────────────────── */}
      {completedActions.length > 0 && (
        <section className="pt-4 border-t border-border/30">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Your Activity
            </h2>
            <span className="text-[10px] text-muted-foreground/50">
              {completedActions.length} action
              {completedActions.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {Object.entries(completedByState).map(([stateId, stateMs]) => {
              const state = STATES_MAP[stateId];
              if (!state) return null;
              const vis = STATE_VISUALS[stateId];

              return stateMs.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-colors ${
                    m.drawOutcome === "drew"
                      ? "border-primary/20 bg-primary/5"
                      : m.drawOutcome === "didnt_draw"
                        ? "border-chart-4/20 bg-chart-4/5"
                        : "border-chart-2/20 bg-chart-2/5"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center text-[8px] font-bold text-white shrink-0 bg-gradient-to-br ${vis?.gradient ?? "from-slate-700 to-slate-900"}`}
                  >
                    {state.abbreviation}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium">
                      {formatSpeciesName(m.speciesId)}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-2">
                      {m.type === "apply" ? "Applied" : "Bought points"}
                      {m.completedAt && (
                        <>
                          {" "}
                          &middot;{" "}
                          {new Date(m.completedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </>
                      )}
                    </span>
                  </div>
                  {m.drawOutcome === "drew" && (
                    <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
                      <Trophy className="w-2.5 h-2.5" /> Drew!
                    </span>
                  )}
                  {m.drawOutcome === "didnt_draw" && (
                    <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-chart-4/15 text-chart-4 font-medium">
                      <X className="w-2.5 h-2.5" /> Didn&apos;t draw
                    </span>
                  )}
                  {!m.drawOutcome && m.completed && (
                    <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-chart-2/15 text-chart-2 font-medium">
                      <Check className="w-2.5 h-2.5" /> Done
                    </span>
                  )}
                  {m.totalCost > 0 && (
                    <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                      ${Math.round(m.totalCost).toLocaleString()}
                    </span>
                  )}
                </div>
              ));
            })}
          </div>
        </section>
      )}
    </div>
  );
}
