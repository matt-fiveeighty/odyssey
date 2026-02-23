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
} from "lucide-react";
import { STATES, STATES_MAP } from "@/lib/constants/states";
import { STATE_VISUALS } from "@/lib/constants/state-images";
import { SPECIES_IMAGES } from "@/lib/constants/species-images";
import { useAppStore, useWizardStore } from "@/lib/store";
import { formatSpeciesName } from "@/lib/utils";
import { SpeciesAvatar } from "@/components/shared/SpeciesAvatar";
import { StateOutline } from "@/components/shared/StateOutline";
import { exportDeadline } from "@/lib/calendar-export";
import { resolveFees } from "@/lib/engine/fee-resolver";

/** Short date: "Apr 7" */
function formatShort(dateStr: string): string {
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

  // Group others by month
  const otherByMonth = useMemo(() => {
    const groups: Record<string, Deadline[]> = {};
    for (const d of otherDeadlines) {
      const date = new Date(d.closeDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    }
    return groups;
  }, [otherDeadlines]);

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

  function speciesCost(stateId: string, speciesId: string): string | null {
    const state = STATES_MAP[stateId];
    if (!state) return null;
    const fees = resolveFees(state, homeState);
    const ptCost = fees.pointCost[speciesId] ?? 0;
    const tagCost = state.tagCosts[speciesId] ?? 0;
    const parts: string[] = [];
    if (ptCost > 0) parts.push(`$${Math.round(ptCost)}/pt`);
    if (tagCost > 0) parts.push(`$${Math.round(tagCost)} tag`);
    return parts.length > 0 ? parts.join(" · ") : null;
  }

  // ── Card Component ────────────────────────────────────────────────
  function DeadlineCard({
    d,
    featured,
  }: {
    d: Deadline;
    featured?: boolean;
  }) {
    const days = daysUntil(d.closeDate);
    const state = STATES_MAP[d.stateId];
    const vis = STATE_VISUALS[d.stateId];
    const cost = speciesCost(d.stateId, d.species);
    const speciesImg = SPECIES_IMAGES[d.species];

    return (
      <div
        className={`relative overflow-hidden rounded-xl border bg-card group transition-all duration-200 hover:shadow-lg hover:border-primary/30 ${
          featured ? "border-primary/20" : "border-border/50"
        }`}
      >
        {/* Species image header */}
        <div className="relative h-20 overflow-hidden">
          {speciesImg ? (
            <Image
              src={speciesImg.src}
              alt={speciesImg.alt}
              fill
              className="object-cover opacity-50 group-hover:opacity-65 transition-opacity duration-300"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          ) : (
            <div
              className={`absolute inset-0 bg-gradient-to-br ${vis?.gradient ?? "from-slate-800 to-slate-900"} opacity-40`}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />

          {/* Urgency badge */}
          <div
            className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-card/80 backdrop-blur-sm ${urgencyColor(days)}`}
          >
            {days}d
          </div>

          {/* State pill */}
          <div className="absolute top-2 left-2">
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold text-white bg-gradient-to-r ${vis?.gradient ?? "from-slate-700 to-slate-900"} shadow-sm`}
            >
              <StateOutline
                stateId={d.stateId}
                size={12}
                strokeColor="white"
                strokeWidth={3}
                fillColor="rgba(255,255,255,0.2)"
              />
              {state?.abbreviation ?? d.stateId}
            </div>
          </div>
        </div>

        <div className="p-3 space-y-1.5">
          {/* Species name */}
          <div className="flex items-center gap-2">
            <SpeciesAvatar speciesId={d.species} size={20} />
            <span className="text-xs font-semibold truncate">
              {formatSpeciesName(d.species)}
            </span>
          </div>

          {/* Date range */}
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Clock className="w-3 h-3 shrink-0" />
            <span>
              {formatShort(d.openDate)} &rarr; {formatShort(d.closeDate)}
            </span>
          </div>

          {/* Cost + draw timing */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground/70">
            {cost && <span className="font-medium">{cost}</span>}
            {d.drawResultDate && (
              <span>Results ~{formatShort(d.drawResultDate)}</span>
            )}
          </div>

          {/* Action links */}
          <div className="flex items-center gap-3 pt-1.5 border-t border-border/30">
            {state && (
              <a
                href={state.buyPointsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-primary font-medium hover:underline"
              >
                Apply at F&G <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
            <button
              onClick={() =>
                exportDeadline({
                  stateName: d.stateName,
                  species: formatSpeciesName(d.species),
                  openDate: d.openDate,
                  closeDate: d.closeDate,
                  url: state?.buyPointsUrl,
                })
              }
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Download className="w-2.5 h-2.5" /> .ics
            </button>
          </div>
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
    <div className="p-4 md:p-6 space-y-6 fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold tracking-tight">Deadlines</h1>
        <span className="text-xs text-muted-foreground hidden sm:inline">
          &mdash; {allDeadlines.length} upcoming across all states
        </span>
      </div>

      {/* ── Your Deadlines (featured grid) ──────────────────────────── */}
      {yourDeadlines.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Your Deadlines</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {yourDeadlines.length}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {yourDeadlines.map((d, i) => (
              <DeadlineCard
                key={`your-${d.stateId}-${d.species}-${i}`}
                d={d}
                featured
              />
            ))}
          </div>
        </section>
      )}

      {/* ── All Other Deadlines by Month ────────────────────────────── */}
      {Object.entries(otherByMonth).map(([monthKey, deadlines]) => {
        const [year, month] = monthKey.split("-");
        const monthName = new Date(
          Number(year),
          Number(month) - 1,
        ).toLocaleString("en-US", { month: "long", year: "numeric" });

        return (
          <section key={monthKey}>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {monthName}
              </h2>
              <span className="text-[10px] text-muted-foreground/50">
                {deadlines.length} deadline{deadlines.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {deadlines.map((d, i) => (
                <DeadlineCard
                  key={`${monthKey}-${d.stateId}-${d.species}-${i}`}
                  d={d}
                />
              ))}
            </div>
          </section>
        );
      })}

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
                  <SpeciesAvatar speciesId={m.speciesId} size={20} />
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
