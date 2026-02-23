"use client";

import { useState, useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, ExternalLink, Download, Star, Check, Trophy, X, History, ChevronDown, DollarSign, Info } from "lucide-react";
import { STATES, STATES_MAP } from "@/lib/constants/states";
import { useAppStore, useWizardStore } from "@/lib/store";
import { formatSpeciesName } from "@/lib/utils";
import { SpeciesAvatar } from "@/components/shared/SpeciesAvatar";
import { StateOutline } from "@/components/shared/StateOutline";
import { exportDeadline } from "@/lib/calendar-export";
import { resolveFees } from "@/lib/engine/fee-resolver";
import { DataSourceInline } from "@/components/shared/DataSourceBadge";

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
  const homeState = useWizardStore((s) => s.homeState);

  const now = new Date();
  const monthRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [collapsedStates, setCollapsedStates] = useState<Set<string>>(new Set());

  function toggleCollapse(key: string) {
    setCollapsedStates((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

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
    if (days <= 3) return "text-destructive";
    if (days <= 7) return "text-chart-4";
    if (days <= 14) return "text-warning";
    return "text-muted-foreground";
  }

  function urgencyBorder(days: number) {
    if (days <= 3) return "border-destructive/30";
    if (days <= 7) return "border-chart-4/30";
    if (days <= 14) return "border-warning/30";
    return "";
  }

  function scrollToMonth(key: string) {
    monthRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /** Build TLDR for a state */
  function stateTldr(stateId: string): string | null {
    const state = STATES_MAP[stateId];
    if (!state) return null;
    const approach = state.applicationApproach === "per_unit"
      ? "Apply per unit"
      : state.applicationApproach === "per_region"
        ? "Apply by region"
        : "Apply statewide";
    const system = state.pointSystem === "preference"
      ? "Preference points (highest points draw first)"
      : state.pointSystem === "bonus"
        ? "Bonus points (more points = better odds, not guaranteed)"
        : state.pointSystem === "hybrid"
          ? `Hybrid (${state.pointSystemDetails.preferencePct ?? 75}% preference, ${state.pointSystemDetails.randomPct ?? 25}% random)`
          : state.pointSystem === "random"
            ? "Random draw (no point advantage)"
            : "Lottery system";
    const ql = (() => {
      const fees = resolveFees(state, homeState);
      return fees.qualifyingLicense > 0
        ? ` Qualifying license: $${Math.round(fees.qualifyingLicense)}.`
        : "";
    })();
    return `${approach}. ${system}.${ql}`;
  }

  /** Species cost string */
  function speciesCost(stateId: string, speciesId: string): string | null {
    const state = STATES_MAP[stateId];
    if (!state) return null;
    const fees = resolveFees(state, homeState);
    const ptCost = fees.pointCost[speciesId] ?? 0;
    const tagCost = state.tagCosts[speciesId] ?? 0;
    const parts: string[] = [];
    if (ptCost > 0) parts.push(`$${Math.round(ptCost)} point`);
    else parts.push("Free point");
    if (tagCost > 0) parts.push(`$${Math.round(tagCost)} tag if drawn`);
    return parts.join(" + ");
  }

  return (
    <div className="p-6 fade-in-up">
      <div className="mb-6">
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Deadlines
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Application deadlines across all states. Your species and states are highlighted.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_140px] gap-6">
        {/* Main content */}
        <div className="space-y-6">
          {monthKeys.map((monthKey) => {
            const deadlines = deadlinesByMonth[monthKey];
            const [year, month] = monthKey.split("-");
            const monthName = new Date(Number(year), Number(month) - 1).toLocaleString("en-US", {
              month: "long",
              year: "numeric",
            });

            // Split into relevant (featured) and other
            const relevant = deadlines.filter(isRelevant);
            const other = deadlines.filter((d) => !isRelevant(d));

            // Group by state
            function groupByState(items: Deadline[]): Record<string, Deadline[]> {
              const groups: Record<string, Deadline[]> = {};
              for (const d of items) {
                if (!groups[d.stateId]) groups[d.stateId] = [];
                groups[d.stateId].push(d);
              }
              return groups;
            }

            const relevantByState = groupByState(relevant);
            const otherByState = groupByState(other);

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
                    {relevant.length > 0 && ` (${relevant.length} yours)`}
                  </span>
                </div>

                {/* Relevant deadlines — collapsible state sections */}
                {Object.entries(relevantByState).map(([stateId, stateDeadlines]) => {
                  const s = STATES_MAP[stateId];
                  const collapseKey = `${monthKey}-rel-${stateId}`;
                  const isCollapsed = collapsedStates.has(collapseKey);
                  const tldr = stateTldr(stateId);
                  const soonest = Math.min(...stateDeadlines.map((d) => daysUntil(d.closeDate)));

                  return (
                    <div key={`rel-${stateId}`} className="mb-3">
                      {/* Collapsible state header */}
                      <button
                        onClick={() => toggleCollapse(collapseKey)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors mb-2"
                      >
                        <StateOutline stateId={stateId} size={20} strokeColor="currentColor" strokeWidth={2} className="text-primary shrink-0" />
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{s?.name}</span>
                            <Star className="w-3 h-3 text-primary shrink-0" />
                            <span className="text-[10px] text-muted-foreground">
                              {stateDeadlines.length} species
                            </span>
                          </div>
                          {tldr && (
                            <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">{tldr}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs font-bold ${urgencyClass(soonest)}`}>
                            {soonest}d
                          </span>
                          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isCollapsed ? "" : "rotate-180"}`} />
                        </div>
                      </button>

                      {/* Expanded species list */}
                      {!isCollapsed && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-3">
                          {stateDeadlines.map((d, i) => {
                            const days = daysUntil(d.closeDate);
                            const state = STATES_MAP[d.stateId];
                            const cost = speciesCost(d.stateId, d.species);

                            return (
                              <div
                                key={`${d.stateId}-${d.species}-${i}`}
                                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-primary/15 bg-card ${urgencyBorder(days)}`}
                              >
                                <SpeciesAvatar speciesId={d.species} size={24} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-semibold truncate">
                                      {formatSpeciesName(d.species)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-muted-foreground">
                                      Closes {formatShort(d.closeDate)}
                                    </span>
                                    {cost && (
                                      <span className="text-[10px] text-muted-foreground/60">
                                        {cost}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={`text-sm font-bold tabular-nums ${urgencyClass(days)}`}>
                                    {days}d
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      exportDeadline({
                                        stateName: d.stateName,
                                        species: formatSpeciesName(d.species),
                                        openDate: d.openDate,
                                        closeDate: d.closeDate,
                                        url: state?.buyPointsUrl,
                                      });
                                    }}
                                    className="p-1 rounded hover:bg-secondary transition-colors cursor-pointer"
                                    title="Export to calendar (.ics)"
                                  >
                                    <Download className="w-3 h-3 text-muted-foreground" />
                                  </button>
                                  {state && (
                                    <a
                                      href={state.buyPointsUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 rounded hover:bg-primary/10 transition-colors"
                                      aria-label={`Apply at ${d.stateName} Fish & Game`}
                                    >
                                      <ExternalLink className="w-3 h-3 text-primary" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          <div className="col-span-full mt-1">
                            <DataSourceInline stateId={stateId} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Other deadlines — condensed collapsible state groups */}
                {Object.entries(otherByState).map(([stateId, stateDeadlines]) => {
                  const s = STATES_MAP[stateId];
                  const collapseKey = `${monthKey}-other-${stateId}`;
                  const isCollapsed = !collapsedStates.has(collapseKey); // collapsed by default for non-relevant
                  const soonest = Math.min(...stateDeadlines.map((d) => daysUntil(d.closeDate)));

                  return (
                    <div key={`other-${stateId}`} className="mb-2">
                      <button
                        onClick={() => toggleCollapse(collapseKey)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-secondary/50 transition-colors"
                      >
                        <Badge
                          className="text-[9px] font-bold px-1.5 py-0"
                          style={{ backgroundColor: stateDeadlines[0].color, color: "white" }}
                        >
                          {stateId}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex-1 text-left">{s?.name}</span>
                        <span className="text-[10px] text-muted-foreground/50">
                          {stateDeadlines.length} species
                        </span>
                        <span className={`text-[10px] font-medium ${urgencyClass(soonest)}`}>
                          {soonest}d
                        </span>
                        <ChevronDown className={`w-3 h-3 text-muted-foreground/50 transition-transform ${isCollapsed ? "" : "rotate-180"}`} />
                      </button>

                      {!isCollapsed && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5 mt-1.5 ml-3">
                          {stateDeadlines.map((d, i) => {
                            const days = daysUntil(d.closeDate);
                            const state = STATES_MAP[d.stateId];
                            const cost = speciesCost(d.stateId, d.species);

                            return (
                              <div
                                key={`${d.stateId}-${d.species}-other-${i}`}
                                className={`flex items-center justify-between px-2 py-1.5 rounded-md border border-border/50 bg-card ${urgencyBorder(days)}`}
                              >
                                <div className="min-w-0">
                                  <span className="text-[11px] font-medium truncate block">
                                    {formatSpeciesName(d.species)}
                                  </span>
                                  <span className="text-[9px] text-muted-foreground/60">
                                    {formatShort(d.closeDate)}
                                    {cost && ` \u00b7 ${cost}`}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0 ml-1">
                                  <span className={`text-[10px] font-medium ${urgencyClass(days)}`}>
                                    {days}d
                                  </span>
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
                                    className="p-0.5 rounded hover:bg-secondary transition-colors cursor-pointer"
                                    title="Export to calendar (.ics)"
                                  >
                                    <Download className="w-2.5 h-2.5 text-muted-foreground" />
                                  </button>
                                  {state && (
                                    <a
                                      href={state.buyPointsUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-0.5 rounded hover:bg-secondary transition-colors"
                                    >
                                      <ExternalLink className="w-2.5 h-2.5 text-muted-foreground" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Completed Actions — past deadlines the user acted on */}
        {(() => {
          const completedActions = milestones.filter(
            (m) => (m.type === "apply" || m.type === "buy_points") && (m.completed || m.drawOutcome)
          );
          if (completedActions.length === 0) return null;

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
                                ${Math.round(m.totalCost).toLocaleString()}
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
