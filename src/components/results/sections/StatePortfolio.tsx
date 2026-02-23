"use client";

import { useState, useMemo, memo } from "react";
import type { StrategicAssessment, StateRecommendation } from "@/lib/types";
import { AnimatedBar } from "../shared/AnimatedBar";
import { STATES_MAP } from "@/lib/constants/states";
import { STATE_VISUALS } from "@/lib/constants/state-images";
import { SpeciesAvatar } from "@/components/shared/SpeciesAvatar";
import { useWizardStore, useAppStore } from "@/lib/store";
import { DataSourceInline, DataSourceBadge } from "@/components/shared/DataSourceBadge";
import { FreshnessBadge } from "@/components/shared/FreshnessBadge";
import { estimated } from "@/lib/engine/verified-datum";
import { ChevronDown, Target, Mountain, Eye, TrendingUp, Binoculars } from "lucide-react";
import { estimateCreepRate, projectPointCreep, yearsToDrawWithCreep } from "@/lib/engine/point-creep";
import { formatSpeciesName } from "@/lib/utils";
import type { AlsoConsideredState } from "@/lib/types";
import { detectScoutingOpportunities } from "@/lib/engine/scouting-engine";
import type { ScoutingOpportunity } from "@/lib/engine/scouting-engine";

interface StatePortfolioProps {
  assessment: StrategicAssessment;
}

function StateCard({ rec }: { rec: StateRecommendation }) {
  const [expanded, setExpanded] = useState(false);
  const state = STATES_MAP[rec.stateId];
  const vis = STATE_VISUALS[rec.stateId];
  const userSpecies = useWizardStore((s) => s.species);
  const userPoints = useAppStore((s) => s.userPoints);
  if (!state) return null;

  // Find user's actual points for this state (sum across species/point types)
  const stateUserPoints = userPoints.filter((p) => p.stateId === rec.stateId);
  const totalUserPts = stateUserPoints.reduce((sum, p) => sum + p.points, 0);

  const stateSpecies = state.availableSpecies.filter((sp) => userSpecies.includes(sp));

  const roleColors: Record<string, string> = {
    primary: "bg-primary/15 text-primary",
    secondary: "bg-chart-2/15 text-chart-2",
    wildcard: "bg-chart-3/15 text-chart-3",
    long_term: "bg-chart-4/15 text-chart-4",
  };

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-4 hover:bg-secondary/20 transition-colors text-left"
      >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0 bg-gradient-to-br ${vis?.gradient ?? "from-slate-700 to-slate-900"}`}>
          {state.abbreviation}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold">{state.name}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${roleColors[rec.role] ?? "bg-secondary text-muted-foreground"}`}>
              {rec.roleDescription}
            </span>
            <span className="text-xs text-muted-foreground ml-auto inline-flex items-center gap-1">
              ${rec.annualCost}/yr
              <FreshnessBadge datum={estimated(rec.annualCost, "State fee schedule")} showLabel={false} />
            </span>
          </div>
          {stateSpecies.length > 0 && (
            <div className="flex gap-1 mb-1">
              {stateSpecies.map((sp) => (
                <SpeciesAvatar key={sp} speciesId={sp} size={18} />
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground line-clamp-2">{rec.reason}</p>
          <DataSourceBadge stateId={rec.stateId} showLastUpdated />
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 mt-1 ${expanded ? "rotate-180" : ""}`} />
      </button>

      <div className={`transition-all duration-300 ease-out overflow-hidden ${expanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="p-4 pt-0 space-y-4 border-t border-border/50">
          {/* Score breakdown */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Score Breakdown</p>
            <div className="space-y-1.5">
              {rec.scoreBreakdown.factors.map((f, fi) => (
                <AnimatedBar
                  key={fi}
                  value={f.score}
                  maxValue={f.maxScore}
                  label={f.label}
                  sublabel={f.explanation}
                  delay={fi * 80}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2 pt-2 border-t border-border/30">
              <span className="text-[10px] font-semibold">Total Score</span>
              <span className="text-xs font-bold text-primary">{rec.scoreBreakdown.totalScore}/{rec.scoreBreakdown.maxPossibleScore}</span>
            </div>
          </div>

          {/* Point Strategy */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Point Strategy</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{rec.pointStrategy}</p>
          </div>

          {/* Best Units */}
          {rec.bestUnits.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Recommended Units</p>
              <div className="space-y-2">
                {rec.bestUnits.map((unit, ui) => (
                  <div key={ui} className="p-2.5 rounded-lg bg-secondary/30 border border-border/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold">{unit.unitName || unit.unitCode}</span>
                      <span className="text-[10px] text-muted-foreground">{unit.drawTimeline}</span>
                    </div>
                    <div className="flex gap-3 text-[10px] text-muted-foreground">
                      <span><Target className="w-3 h-3 inline mr-0.5" />{Math.round(unit.successRate * 100)}% success</span>
                      <span><Mountain className="w-3 h-3 inline mr-0.5" />{unit.trophyRating}/10 trophy</span>
                    </div>
                    {unit.drawConfidence && (
                      <div className="mt-1.5 flex items-center gap-2 text-[9px] text-muted-foreground/70">
                        <span>Draw range:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-chart-2 font-medium">Yr {unit.drawConfidence.optimistic}</span>
                          <span>&ndash;</span>
                          <span className="font-medium">Yr {unit.drawConfidence.expected}</span>
                          <span>&ndash;</span>
                          <span className="text-chart-4 font-medium">Yr {unit.drawConfidence.pessimistic}</span>
                        </div>
                        <span className="text-muted-foreground/40">(best / expected / worst)</span>
                      </div>
                    )}
                    {unit.tacticalNotes && (
                      <div className="mt-2 space-y-1">
                        {unit.tacticalNotes.proTip && (
                          <p className="text-[10px] text-primary/80 italic">{unit.tacticalNotes.proTip}</p>
                        )}
                        {unit.tacticalNotes.accessMethod && (
                          <p className="text-[10px] text-muted-foreground/70">{unit.tacticalNotes.accessMethod}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Point Creep Projection */}
          {rec.bestUnits.length > 0 && (() => {
            // Use the highest-trophy unit for creep projection (most relevant for purists)
            const topUnit = [...rec.bestUnits].sort((a, b) => b.trophyRating - a.trophyRating)[0];
            if (!topUnit || topUnit.trophyRating < 3) return null; // skip OTC/low-tier units

            const creepRate = estimateCreepRate(topUnit.trophyRating);
            const pointsRequired = topUnit.drawConfidence?.expected
              ? topUnit.drawConfidence.expected // years as proxy for points needed
              : Math.round(topUnit.trophyRating * 1.5);

            const projections = projectPointCreep(
              { currentPointsRequired: pointsRequired, annualCreepRate: creepRate },
              10,
            );

            const maxPts = projections[projections.length - 1]?.projectedPoints ?? 1;

            // If user has actual points tracked, compute real gap
            const hasRealPoints = totalUserPts > 0;
            const adjustedDrawYears = hasRealPoints
              ? yearsToDrawWithCreep(totalUserPts, pointsRequired, creepRate)
              : null;
            const gapDirection = hasRealPoints
              ? (1 > creepRate ? "closing" : creepRate > 1 ? "widening" : "flat")
              : null;

            return (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-3.5 h-3.5 text-chart-4" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Point Creep Forecast</p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-chart-4/10 text-chart-4 font-medium">
                    +{creepRate.toFixed(1)} pts/yr
                  </span>
                </div>

                {/* Your Position — only shows when user has tracked points */}
                {hasRealPoints && (
                  <div className="flex items-center gap-3 mb-2 p-2 rounded-lg bg-primary/5 border border-primary/15">
                    <div className="text-center">
                      <p className="text-sm font-bold text-primary">{totalUserPts}</p>
                      <p className="text-[8px] text-muted-foreground uppercase">Your pts</p>
                    </div>
                    <div className="text-[10px] text-muted-foreground">vs</div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-chart-4">{pointsRequired}</p>
                      <p className="text-[8px] text-muted-foreground uppercase">Need</p>
                    </div>
                    <div className="flex-1 text-right">
                      {adjustedDrawYears !== null && adjustedDrawYears < 30 ? (
                        <p className="text-[10px] font-medium">
                          <span className="text-chart-2">~{adjustedDrawYears} yr{adjustedDrawYears !== 1 ? "s" : ""}</span>
                          <span className="text-muted-foreground"> to draw</span>
                        </p>
                      ) : (
                        <p className="text-[10px] text-chart-4 font-medium">30+ yrs at current pace</p>
                      )}
                      {gapDirection && (
                        <p className={`text-[9px] ${gapDirection === "closing" ? "text-chart-2" : gapDirection === "widening" ? "text-chart-4" : "text-muted-foreground"}`}>
                          Gap {gapDirection}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-muted-foreground mb-2">
                  {hasRealPoints
                    ? `You gain 1 pt/yr; requirements creep at ~${creepRate.toFixed(1)} pts/yr. ${gapDirection === "widening" ? "Consider OTC hunts or burning points sooner." : ""}`
                    : `Estimated point requirements for top-tier ${state.name} units over the next 10 years. You gain 1 point/year; requirements creep at ~${creepRate.toFixed(1)} pts/year.`
                  }
                </p>
                {/* Creep bar chart */}
                <div className="space-y-1">
                  {projections.filter((_, i) => i % 2 === 0 || i === projections.length - 1).map((p) => {
                    const widthPct = Math.max(8, (p.projectedPoints / maxPts) * 100);
                    const isNow = p.year === projections[0]?.year;
                    // Show user's projected points alongside requirement
                    const userPtsAtYear = hasRealPoints ? totalUserPts + (p.year - (projections[0]?.year ?? p.year)) : null;
                    const userWidthPct = userPtsAtYear !== null ? Math.max(4, (userPtsAtYear / maxPts) * 100) : null;
                    return (
                      <div key={p.year} className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono w-10 ${isNow ? "text-primary font-bold" : "text-muted-foreground"}`}>
                          {p.year}
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden relative">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${isNow ? "bg-primary/60" : "bg-chart-4/40"}`}
                            style={{ width: `${widthPct}%` }}
                          />
                          {userWidthPct !== null && (
                            <div
                              className="absolute top-0 left-0 h-full rounded-full bg-chart-2/50 border-r-2 border-chart-2"
                              style={{ width: `${Math.min(userWidthPct, 100)}%` }}
                            />
                          )}
                        </div>
                        <span className={`text-[10px] font-mono w-8 text-right ${isNow ? "text-primary font-bold" : "text-muted-foreground"}`}>
                          {p.projectedPoints}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {hasRealPoints && (
                  <div className="flex items-center gap-3 mt-1 text-[9px] text-muted-foreground/60">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-chart-2/50 border border-chart-2 inline-block" /> Your points</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-chart-4/40 inline-block" /> Points needed</span>
                  </div>
                )}
                <p className="text-[9px] text-muted-foreground/50 mt-1.5">
                  Based on {topUnit.unitName || topUnit.unitCode} (trophy {topUnit.trophyRating}/10).
                  {hasRealPoints
                    ? " Track your points on the Points page to keep this up to date."
                    : " Actual creep varies by species, quota changes, and applicant growth."}
                </p>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

const AlsoConsideredCard = memo(function AlsoConsideredCard({ state: ac }: { state: AlsoConsideredState }) {
  const state = STATES_MAP[ac.stateId];
  const vis = STATE_VISUALS[ac.stateId];
  if (!state) return null;

  const pct = Math.round((ac.totalScore / ac.maxPossibleScore) * 100);

  return (
    <div className="p-3 rounded-xl border border-dashed border-border/60 bg-secondary/10 hover:bg-secondary/20 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0 bg-gradient-to-br ${vis?.gradient ?? "from-slate-700 to-slate-900"} opacity-70`}>
          {state.abbreviation}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold">{state.name}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-medium">
              {pct}% match
            </span>
            <span className="text-xs text-muted-foreground ml-auto inline-flex items-center gap-1">
              ${ac.annualCost}/yr
              <FreshnessBadge datum={estimated(ac.annualCost, "State fee schedule")} showLabel={false} />
            </span>
          </div>
          {ac.speciesAvailable.length > 0 && (
            <div className="flex gap-1 mb-1">
              {ac.speciesAvailable.map((sp) => (
                <SpeciesAvatar key={sp} speciesId={sp} size={14} />
              ))}
              <span className="text-[10px] text-muted-foreground ml-1">
                {ac.speciesAvailable.map(formatSpeciesName).join(", ")}
              </span>
            </div>
          )}
          {ac.topReasons.length > 0 && (
            <p className="text-[10px] text-muted-foreground/80 line-clamp-2">
              {ac.topReasons.join(" · ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

const ScoutingMoveCard = memo(function ScoutingMoveCard({ opp }: { opp: ScoutingOpportunity }) {
  const state = STATES_MAP[opp.scoutUnit.stateId];
  const targetState = STATES_MAP[opp.targetUnit.stateId];

  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
      {/* Header badge */}
      <div className="flex items-center gap-2 mb-2">
        <Binoculars className="w-4 h-4 text-violet-400" />
        <span className="text-xs font-semibold uppercase tracking-wider text-violet-400">
          Scouting Move
        </span>
        {opp.distanceMiles != null && (
          <span className="text-[10px] text-muted-foreground ml-auto">
            ~{opp.distanceMiles} mi from target
          </span>
        )}
      </div>

      {/* Scout unit info */}
      <h3 className="text-base font-semibold">
        {state?.abbreviation ?? opp.scoutUnit.stateId} Unit {opp.scoutUnit.unitCode}
        {opp.scoutUnit.unitName ? ` — ${opp.scoutUnit.unitName}` : ""}
      </h3>
      <p className="text-xs text-muted-foreground">
        {formatSpeciesName(opp.scoutUnit.speciesId)} · {opp.scoutUnit.pointsRequiredNonresident === 0 ? "OTC" : "High-odds draw"} · {Math.round(opp.scoutUnit.successRate * 100)}% success
      </p>

      {/* Strategic connection */}
      <p className="text-sm text-muted-foreground mt-2">
        {opp.strategicReason}
      </p>

      {/* Target unit reference */}
      <div className="mt-2 flex items-center gap-1 text-xs text-violet-400/80">
        <Target className="w-3 h-3" />
        <span>
          Scouting for {targetState?.abbreviation ?? opp.targetUnit.stateId} Unit {opp.targetUnit.unitCode} ({opp.targetYearsAway}yr build)
        </span>
      </div>

      {/* Score pills */}
      <div className="flex flex-wrap gap-1 mt-2">
        {opp.terrainOverlap.length > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300">
            {opp.terrainOverlap.join(" · ")}
          </span>
        )}
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300">
          Score: {opp.totalScore}/100
        </span>
      </div>
    </div>
  );
});

export function StatePortfolio({ assessment }: StatePortfolioProps) {
  const [showAlsoConsidered, setShowAlsoConsidered] = useState(false);
  const alsoConsidered = assessment.alsoConsidered ?? [];
  const scoutingOpps = useMemo(() => detectScoutingOpportunities(assessment), [assessment]);

  return (
    <div className="space-y-4">
      {assessment.stateRecommendations.map((rec) => (
        <StateCard key={rec.stateId} rec={rec} />
      ))}

      {alsoConsidered.length > 0 && (
        <div className="pt-2">
          <button
            onClick={() => setShowAlsoConsidered(!showAlsoConsidered)}
            className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border/50 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span className="text-sm font-medium">
              Also Considered ({alsoConsidered.length} states)
            </span>
            <span className="text-[10px] text-muted-foreground/70 ml-1">
              Scored well but didn&apos;t make your selection
            </span>
            <ChevronDown className={`w-4 h-4 ml-auto transition-transform duration-200 ${showAlsoConsidered ? "rotate-180" : ""}`} />
          </button>

          <div className={`transition-all duration-300 ease-out overflow-hidden ${showAlsoConsidered ? "max-h-[2000px] opacity-100 mt-3" : "max-h-0 opacity-0"}`}>
            <div className="space-y-2">
              {alsoConsidered.map((ac) => (
                <AlsoConsideredCard key={ac.stateId} state={ac} />
              ))}
              <p className="text-[10px] text-muted-foreground/60 italic text-center pt-1">
                You can include these states by going back and toggling them on in the state selection step.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Scouting Opportunities */}
      {scoutingOpps.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-2">
            <Binoculars className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-semibold text-violet-400 uppercase tracking-wider">
              Scouting Opportunities
            </h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {scoutingOpps.map((opp) => (
              <ScoutingMoveCard key={`${opp.scoutUnitId}-${opp.targetUnit.unitCode}`} opp={opp} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
