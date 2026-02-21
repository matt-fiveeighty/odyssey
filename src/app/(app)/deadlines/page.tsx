"use client";

import { useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, ExternalLink, Download, Star, Check, Trophy, X, History } from "lucide-react";
import { STATES, STATES_MAP } from "@/lib/constants/states";
import { useAppStore, useWizardStore } from "@/lib/store";
import { formatSpeciesName } from "@/lib/utils";
import { SpeciesAvatar } from "@/components/shared/SpeciesAvatar";
import { exportDeadline } from "@/lib/calendar-export";

/** Format YYYY-MM-DD → "April 7, 2026" (NAM) */
function formatNAM(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Short month label: "Apr 7" */
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
};

export default function DeadlinesPage() {
  const { userGoals, userPoints, confirmedAssessment, milestones } = useAppStore();
  const wizardSpecies = useWizardStore((s) => s.species);

  const now = new Date();
  const monthRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const allDeadlines = useMemo(() => {
    return STATES
      .flatMap((s) => {
        const deadlines: Deadline[] = [];
        Object.entries(s.applicationDeadlines).forEach(([species, dates]) => {
          if (dates?.close) {
            deadlines.push({
              stateId: s.id,
              stateName: s.name,
              species,
              openDate: dates.open,
              closeDate: dates.close,
              color: s.color,
              buyPointsUrl: s.buyPointsUrl,
            });
          }
        });
        return deadlines;
      })
      .filter((d) => new Date(d.closeDate) > now)
      .sort((a, b) => a.closeDate.localeCompare(b.closeDate));
  }, [now]);

  // Build invested states + species sets
  const investedStates = useMemo(() => {
    const set = new Set<string>();
    userPoints.forEach((p) => set.add(p.stateId));
    userGoals.forEach((g) => set.add(g.stateId));
    confirmedAssessment?.stateRecommendations.forEach((r) => set.add(r.stateId));
    return set;
  }, [userPoints, userGoals, confirmedAssessment]);

  const investedSpecies = useMemo(() => {
    const set = new Set<string>();
    wizardSpecies.forEach((sp) => set.add(sp));
    userGoals.forEach((g) => set.add(g.speciesId));
    userPoints.forEach((p) => set.add(p.speciesId));
    return set;
  }, [wizardSpecies, userGoals, userPoints]);

  function isRelevant(d: Deadline) {
    return investedStates.has(d.stateId) && investedSpecies.has(d.species);
  }

  // Group by month
  const deadlinesByMonth = useMemo(() => {
    const groups: Record<string, Deadline[]> = {};
    for (const d of allDeadlines) {
      const date = new Date(d.closeDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    }
    return groups;
  }, [allDeadlines]);

  const monthKeys = Object.keys(deadlinesByMonth);

  function daysUntil(dateStr: string) {
    return Math.ceil((new Date(dateStr).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  function urgencyClass(days: number) {
    if (days <= 3) return "text-red-400";
    if (days <= 7) return "text-orange-400";
    if (days <= 14) return "text-amber-400";
    return "text-muted-foreground";
  }

  function urgencyBorder(days: number) {
    if (days <= 3) return "border-red-500/30";
    if (days <= 7) return "border-orange-500/30";
    if (days <= 14) return "border-amber-500/30";
    return "";
  }

  function scrollToMonth(key: string) {
    monthRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="p-6 fade-in-up">
      <div className="mb-6">
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Deadlines
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Application deadlines across all states. Your species and states are featured.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_140px] gap-6">
        {/* Main content */}
        <div className="space-y-8">
          {monthKeys.map((monthKey) => {
            const deadlines = deadlinesByMonth[monthKey];
            const [year, month] = monthKey.split("-");
            const monthName = new Date(Number(year), Number(month) - 1).toLocaleString("en-US", {
              month: "long",
              year: "numeric",
            });

            // Split into relevant (large) and other (small)
            const relevant = deadlines.filter(isRelevant);
            const other = deadlines.filter((d) => !isRelevant(d));

            // Group other deadlines by state for visual separation
            const otherByState: Record<string, Deadline[]> = {};
            for (const d of other) {
              if (!otherByState[d.stateId]) otherByState[d.stateId] = [];
              otherByState[d.stateId].push(d);
            }
            const otherStateKeys = Object.keys(otherByState);

            // Group relevant deadlines by state too
            const relevantByState: Record<string, Deadline[]> = {};
            for (const d of relevant) {
              if (!relevantByState[d.stateId]) relevantByState[d.stateId] = [];
              relevantByState[d.stateId].push(d);
            }
            const relevantStateKeys = Object.keys(relevantByState);

            return (
              <div
                key={monthKey}
                ref={(el) => { monthRefs.current[monthKey] = el; }}
              >
                <div className="flex items-center gap-2 mb-3 sticky top-0 bg-background/95 backdrop-blur-sm z-10 py-2 -mt-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {monthName}
                  </h2>
                  <span className="text-[10px] text-muted-foreground/50 ml-auto">
                    {deadlines.length} deadline{deadlines.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Relevant deadlines — large cards, grouped by state */}
                {relevantStateKeys.map((stateId) => {
                  const stateDeadlines = relevantByState[stateId];
                  const s = STATES_MAP[stateId];
                  return (
                    <div key={`rel-${stateId}`} className="mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          className="text-[10px] font-bold px-1.5 py-0"
                          style={{ backgroundColor: stateDeadlines[0].color, color: "white" }}
                        >
                          {stateId}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{s?.name}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {stateDeadlines.map((d, i) => {
                          const days = daysUntil(d.closeDate);
                          const state = STATES_MAP[d.stateId];

                          return (
                            <Card
                              key={`${d.stateId}-${d.species}-${i}`}
                              className={`border-primary/25 bg-primary/5 ${urgencyBorder(days)}`}
                            >
                              <CardContent className="p-4 space-y-3">
                                {/* Header: species avatar + name + countdown */}
                                <div className="flex items-center gap-3">
                                  <SpeciesAvatar speciesId={d.species} size={28} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <Star className="w-3 h-3 text-primary shrink-0" />
                                      <span className="text-sm font-semibold truncate">
                                        {formatSpeciesName(d.species)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className={`text-right shrink-0 ${urgencyClass(days)}`}>
                                    <div className="text-lg font-bold leading-tight">{days}d</div>
                                    <div className="text-[9px] opacity-70">remaining</div>
                                  </div>
                                </div>

                                {/* Date range */}
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Clock className="w-3.5 h-3.5 shrink-0" />
                                  <span>{formatNAM(d.openDate)} &ndash; {formatNAM(d.closeDate)}</span>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 pt-1">
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
                                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                                    title="Export to calendar (.ics)"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    .ics
                                  </button>
                                  {state && (
                                    <a
                                      href={state.buyPointsUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                                      aria-label={`Apply at ${d.stateName} Fish & Game`}
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                      Apply
                                    </a>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Other deadlines — compact cards, grouped by state */}
                {otherStateKeys.map((stateId) => {
                  const stateDeadlines = otherByState[stateId];
                  const s = STATES_MAP[stateId];
                  const isInvested = investedStates.has(stateId);
                  return (
                    <div key={`other-${stateId}`} className="mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          className="text-[10px] font-bold px-1.5 py-0"
                          style={{ backgroundColor: stateDeadlines[0].color, color: "white" }}
                        >
                          {stateId}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{s?.name}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {stateDeadlines.map((d, i) => {
                          const days = daysUntil(d.closeDate);
                          const state = STATES_MAP[d.stateId];

                          return (
                            <Card
                              key={`${d.stateId}-${d.species}-other-${i}`}
                              className={`transition-colors ${
                                isInvested ? "border-primary/10 bg-primary/[0.02]" : ""
                              } ${urgencyBorder(days)}`}
                            >
                              <CardContent className="p-2.5 space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-medium truncate flex-1">
                                    {formatSpeciesName(d.species)}
                                  </span>
                                  <span className={`text-[10px] font-medium shrink-0 ${urgencyClass(days)}`}>
                                    {days}d
                                  </span>
                                </div>
                                <div className="text-[10px] text-muted-foreground/70">
                                  Opens {formatShort(d.openDate)} &middot; Closes {formatShort(d.closeDate)}
                                </div>
                                <div className="flex items-center gap-1">
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
                                    className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                                    title="Export to calendar (.ics)"
                                  >
                                    <Download className="w-2.5 h-2.5" />
                                    .ics
                                  </button>
                                  {state && (
                                    <a
                                      href={state.buyPointsUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                    >
                                      <ExternalLink className="w-2.5 h-2.5" />
                                      Apply
                                    </a>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Completed Actions — past deadlines the user acted on */}
        {(() => {
          // Show milestones that match "apply" type and are completed or have draw outcomes
          const completedActions = milestones.filter(
            (m) => (m.type === "apply" || m.type === "buy_points") && (m.completed || m.drawOutcome)
          );
          if (completedActions.length === 0) return null;

          // Group by state
          const byState: Record<string, typeof completedActions> = {};
          for (const m of completedActions) {
            if (!byState[m.stateId]) byState[m.stateId] = [];
            byState[m.stateId].push(m);
          }

          return (
            <div className="pt-4 border-t border-border/30">
              <div className="flex items-center gap-2 mb-4">
                <History className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Your Activity
                </h2>
                <span className="text-[10px] text-muted-foreground/50">
                  {completedActions.length} action{completedActions.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="space-y-3">
                {Object.entries(byState).map(([stateId, stateMs]) => {
                  const state = STATES_MAP[stateId];
                  if (!state) return null;

                  return (
                    <div key={stateId}>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          className="text-[10px] font-bold px-1.5 py-0"
                          style={{ backgroundColor: state.color, color: "white" }}
                        >
                          {state.abbreviation}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{state.name}</span>
                      </div>
                      <div className="space-y-1">
                        {stateMs.map((m) => (
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
                            <SpeciesAvatar speciesId={m.speciesId} size={20} />
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-medium">{formatSpeciesName(m.speciesId)}</span>
                              <span className="text-[10px] text-muted-foreground ml-2">
                                {m.type === "apply" ? "Applied" : "Bought points"}
                                {m.completedAt && (
                                  <> &middot; {new Date(m.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</>
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
                              <span className="text-[10px] text-muted-foreground tabular-nums">
                                ${m.totalCost.toLocaleString()}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-[9px] text-muted-foreground/50 mt-3">
                Based on milestones you&apos;ve marked complete. Record draw results on the Goals page.
              </p>
            </div>
          );
        })()}

        {/* Month quick-jump index — right sidebar */}
        <nav className="hidden lg:block">
          <div className="sticky top-6 space-y-1">
            <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-medium mb-2">
              Jump to
            </p>
            {monthKeys.map((key) => {
              const [year, month] = key.split("-");
              const label = new Date(Number(year), Number(month) - 1).toLocaleString("en-US", {
                month: "short",
              });
              const deadlines = deadlinesByMonth[key];
              const hasRelevant = deadlines.some(isRelevant);

              return (
                <button
                  key={key}
                  onClick={() => scrollToMonth(key)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                    hasRelevant
                      ? "text-primary font-semibold hover:bg-primary/10"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <span>{label} {year}</span>
                  <span className="float-right text-[10px] text-muted-foreground/50">
                    {deadlines.length}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
