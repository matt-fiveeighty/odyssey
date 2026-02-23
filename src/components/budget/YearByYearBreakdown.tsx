"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, ChevronDown, ChevronUp, Crosshair, DollarSign, Star } from "lucide-react";
import { useAppStore, useWizardStore } from "@/lib/store";
import { STATES_MAP } from "@/lib/constants/states";
import { SPECIES_MAP } from "@/lib/constants/species";
import { STATE_VISUALS } from "@/lib/constants/state-images";
import { SpeciesAvatar } from "@/components/shared/SpeciesAvatar";
import { resolveFees } from "@/lib/engine/fee-resolver";

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => currentYear + i);

export function YearByYearBreakdown() {
  const { milestones, confirmedAssessment } = useAppStore();
  const homeState = useWizardStore((s) => s.homeState);
  const [expandedYear, setExpandedYear] = useState<number | null>(currentYear);

  const yearData = useMemo(() => {
    return YEARS.map((year) => {
      const yearMs = milestones.filter((m) => m.year === year);
      const milestoneCost = yearMs.reduce((s, m) => s + m.totalCost, 0);
      const assessmentCost =
        confirmedAssessment?.roadmap.find((r) => r.year === year)?.estimatedCost ?? 0;
      const totalCost = Math.max(milestoneCost, assessmentCost);
      const isHuntYear =
        confirmedAssessment?.roadmap.find((r) => r.year === year)?.isHuntYear ??
        yearMs.some((m) => m.type === "hunt");

      return { year, milestones: yearMs, totalCost, isHuntYear };
    });
  }, [milestones, confirmedAssessment]);

  const grandTotal = yearData.reduce((s, y) => s + y.totalCost, 0);
  const hasAnyData = yearData.some((y) => y.milestones.length > 0 || y.totalCost > 0);

  if (!hasAnyData) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Year-by-Year Breakdown
        </h2>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10">
          <DollarSign className="w-3.5 h-3.5 text-primary" />
          <span className="text-sm font-bold text-primary">
            ${Math.round(grandTotal).toLocaleString()} total
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {yearData.map(({ year, milestones: ms, totalCost, isHuntYear }) => {
          const isExpanded = expandedYear === year;
          const hasItems = ms.length > 0;
          const isCurrentYear = year === currentYear;

          if (totalCost === 0 && !hasItems) return null;

          return (
            <Card
              key={year}
              className={`bg-card border-border transition-all ${
                isHuntYear ? "ring-1 ring-chart-2/30" : ""
              } ${isCurrentYear ? "border-primary/20" : ""}`}
            >
              <button
                onClick={() => setExpandedYear(isExpanded ? null : year)}
                className="w-full text-left"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-lg font-bold font-mono ${
                          isCurrentYear ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {year}
                      </span>
                      {isHuntYear && (
                        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-chart-2/15 text-chart-2 font-semibold">
                          <Crosshair className="w-3 h-3" />
                          HUNT YEAR
                        </span>
                      )}
                      {hasItems && (
                        <span className="text-[10px] text-muted-foreground">
                          {ms.length} item{ms.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-bold font-mono ${
                          isHuntYear ? "text-chart-2" : "text-foreground"
                        }`}
                      >
                        ${Math.round(totalCost).toLocaleString()}
                      </span>
                      {hasItems &&
                        (isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ))}
                    </div>
                  </div>

                  {/* Collapsed preview: state badges */}
                  {!isExpanded && hasItems && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[...new Set(ms.map((m) => m.stateId))].map((stateId) => {
                        const vis = STATE_VISUALS[stateId];
                        const state = STATES_MAP[stateId];
                        return (
                          <span
                            key={stateId}
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold text-white bg-gradient-to-br ${
                              vis?.gradient ?? "from-slate-700 to-slate-900"
                            }`}
                          >
                            {state?.abbreviation ?? stateId}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </button>

              {/* Expanded: itemized list grouped by state */}
              {isExpanded && hasItems && (
                <CardContent className="px-4 pb-4 pt-0">
                  <div className="border-t border-border pt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[...new Set(ms.map((m) => m.stateId))].map((stateId) => {
                      const stateMs = ms.filter((m) => m.stateId === stateId);
                      const vis = STATE_VISUALS[stateId];
                      const state = STATES_MAP[stateId];
                      const stateTotal = stateMs.reduce((s, m) => s + m.totalCost, 0);
                      return (
                        <div key={stateId} className="p-2.5 rounded-lg bg-secondary/20 border border-border/50 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded font-bold text-white bg-gradient-to-br ${
                                  vis?.gradient ?? "from-slate-700 to-slate-900"
                                }`}
                              >
                                {state?.abbreviation ?? stateId}
                              </span>
                              <span className="text-xs font-semibold">{state?.name ?? stateId}</span>
                            </div>
                            <span className="text-xs font-bold font-mono text-primary">
                              ${Math.round(stateTotal).toLocaleString()}
                            </span>
                          </div>
                          {state?.nicheFacts && state.nicheFacts.length > 0 && (
                            <p className="text-[9px] text-warning/60 flex items-start gap-1">
                              <Star className="w-2.5 h-2.5 shrink-0 mt-px" />
                              {state.nicheFacts[0]}
                            </p>
                          )}
                          {stateMs.map((m) => {
                            const mState = STATES_MAP[m.stateId];
                            const fees = mState ? resolveFees(mState, homeState) : null;
                            const feeParts: string[] = [];
                            if (fees) {
                              if (m.type === "apply" || m.type === "buy_points") {
                                if (fees.qualifyingLicense > 0) feeParts.push(`$${Math.round(fees.qualifyingLicense)} license`);
                                if (m.type === "apply" && fees.appFee > 0) feeParts.push(`$${Math.round(fees.appFee)} app`);
                                if (m.type === "buy_points") {
                                  const pt = fees.pointCost[m.speciesId] ?? 0;
                                  if (pt > 0) feeParts.push(`$${Math.round(pt)} point`);
                                }
                                if (m.type === "apply") {
                                  const tag = fees.tagCosts[m.speciesId] ?? 0;
                                  if (tag > 0) feeParts.push(`if drawn: $${Math.round(tag)} tag`);
                                }
                              }
                            }
                            return (
                            <div
                              key={m.id}
                              className={`py-0.5 ${m.completed ? "opacity-50" : ""}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <SpeciesAvatar speciesId={m.speciesId} size={14} />
                                  <span
                                    className={`text-[11px] truncate ${
                                      m.completed
                                        ? "line-through text-muted-foreground"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    {SPECIES_MAP[m.speciesId]?.name ?? m.speciesId} — {m.title}
                                  </span>
                                  {m.type === "hunt" && (
                                    <Crosshair className="w-3 h-3 text-chart-2 shrink-0" />
                                  )}
                                </div>
                                <span className="text-[11px] font-mono font-medium shrink-0 ml-2">
                                  ${Math.round(m.totalCost).toLocaleString()}
                                </span>
                              </div>
                              {feeParts.length > 0 && (
                                <p className="text-[9px] text-muted-foreground/50 ml-5">{feeParts.join(" · ")}</p>
                              )}
                            </div>
                          );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
