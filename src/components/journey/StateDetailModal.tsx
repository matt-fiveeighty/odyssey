"use client";

/**
 * State Detail Modal — rich detail view when a state is clicked on the map.
 *
 * Layout (top → bottom):
 *  1. Header — STATE NAME + DRAW TYPE badge
 *  2. Narrative hook — personalized "why this state" from assessment
 *  3. Draw overview — tag quotas / draw odds grid
 *  4. Species in plan — compact avatar pills
 *  5. Season dates — column grid, recommended tier highlighted
 *  6. Recommended units — expandable cards in 2-col grid
 *  7. Costs & fees — NR / Resident side-by-side
 *  8. Important deadlines — filtered to user's species
 *  9. Application tips
 */

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { StateOutline } from "@/components/shared/StateOutline";
import { SpeciesAvatar } from "@/components/shared/SpeciesAvatar";
import { STATES_MAP } from "@/lib/constants/states";
import { SPECIES_MAP } from "@/lib/constants/species";
import { STATE_VISUALS } from "@/lib/constants/state-images";
import { SAMPLE_UNITS } from "@/lib/constants/sample-units";
import type { JourneyData } from "@/lib/engine/journey-data";
import type { StrategicAssessment } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  Calendar,
  Crosshair,
  Mountain,
  Users,
  TreePine,
  MapPin,
  ExternalLink,
  Star,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POINT_SYSTEM_LABELS: Record<string, string> = {
  preference: "Preference Draw",
  hybrid: "Hybrid Draw",
  bonus: "Bonus Point",
  bonus_squared: "Bonus Squared",
  dual: "Dual System",
  random: "Random Draw",
  preference_nr: "NR Preference",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface StateDetailModalProps {
  stateId: string | null;
  onClose: () => void;
  journeyData: JourneyData;
  assessment: StrategicAssessment | null;
}

export function StateDetailModal({
  stateId,
  onClose,
  journeyData,
  assessment,
}: StateDetailModalProps) {
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());

  const state = stateId ? STATES_MAP[stateId] : null;
  const visuals = stateId ? STATE_VISUALS[stateId] : null;

  // Find the assessment's recommendation for this state
  const stateRec = useMemo(() => {
    if (!stateId || !assessment) return null;
    return (
      assessment.stateRecommendations.find((r) => r.stateId === stateId) ??
      null
    );
  }, [stateId, assessment]);

  // Find all species the user is pursuing in this state across all journey years
  const speciesInPlan = useMemo(() => {
    if (!stateId) return [];
    const speciesYears = new Map<string, { first: number; last: number }>();

    for (const yr of journeyData.years) {
      const allActions = [
        ...yr.hunts.map((h) => ({ ...h, type: "hunt" as const })),
        ...yr.applications.map((a) => ({ ...a, type: "apply" as const })),
        ...yr.pointPurchases.map((p) => ({ ...p, type: "points" as const })),
      ];
      for (const action of allActions) {
        if (action.stateId !== stateId) continue;
        const existing = speciesYears.get(action.speciesId);
        if (existing) {
          existing.first = Math.min(existing.first, yr.year);
          existing.last = Math.max(existing.last, yr.year);
        } else {
          speciesYears.set(action.speciesId, {
            first: yr.year,
            last: yr.year,
          });
        }
      }
    }

    return Array.from(speciesYears.entries()).map(([speciesId, years]) => ({
      speciesId,
      speciesName: SPECIES_MAP[speciesId]?.name ?? speciesId,
      ...years,
    }));
  }, [stateId, journeyData]);

  // Set of user species IDs for filtering
  const userSpeciesIds = useMemo(
    () => new Set(speciesInPlan.map((s) => s.speciesId)),
    [speciesInPlan]
  );

  // Filter sample units to ones matching this state + user's species
  const relevantUnits = useMemo(() => {
    if (!stateId) return [];
    if (userSpeciesIds.size === 0) {
      return SAMPLE_UNITS.filter((u) => u.stateId === stateId);
    }
    return SAMPLE_UNITS.filter(
      (u) => u.stateId === stateId && userSpeciesIds.has(u.speciesId)
    );
  }, [stateId, userSpeciesIds]);

  const toggleUnit = (unitId: string) => {
    setExpandedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  };

  if (!state || !stateId) return null;

  // Filter deadlines & costs to user's species (fallback: show first 6)
  const filteredDeadlines = speciesInPlan.length > 0
    ? Object.entries(
        state.applicationDeadlines as Record<string, { open: string; close: string }>
      ).filter(([sp]) => userSpeciesIds.has(sp))
    : Object.entries(
        state.applicationDeadlines as Record<string, { open: string; close: string }>
      ).slice(0, 6);

  const filteredPointCosts = speciesInPlan.length > 0
    ? Object.entries(state.pointCost).filter(([sp]) => userSpeciesIds.has(sp))
    : Object.entries(state.pointCost).slice(0, 6);

  return (
    <Dialog open={!!stateId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* ============================================================ */}
        {/* 1. Header — STATE NAME + DRAW TYPE                          */}
        {/* ============================================================ */}
        <div
          className={`relative p-6 pb-4 bg-gradient-to-br ${
            visuals?.gradient ?? "from-slate-900 to-slate-800"
          } rounded-t-lg`}
        >
          <div className="flex items-center gap-4">
            <StateOutline
              stateId={stateId}
              size={72}
              strokeColor="white"
              strokeWidth={2}
              fillColor="rgba(255,255,255,0.1)"
              className="shrink-0"
            />
            <div className="flex-1">
              <DialogHeader>
                <DialogTitle className="text-xl text-white flex items-center gap-2 flex-wrap">
                  {state.name}
                  <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white/15 text-white/90 uppercase tracking-wider">
                    {POINT_SYSTEM_LABELS[state.pointSystem] ??
                      state.pointSystem.replace("_", " ")}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-white/70 text-sm">
                  {visuals?.terrain ??
                    state.pointSystemDetails.description}
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center gap-3 mt-2">
                {state.fgUrl && (
                  <a
                    href={state.fgUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-white/50 hover:text-white/80 flex items-center gap-0.5 transition-colors"
                  >
                    Fish & Game <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
                {stateRec && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70 capitalize">
                    {stateRec.roleDescription || stateRec.role}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* ============================================================ */}
          {/* 2. Narrative Hook                                            */}
          {/* ============================================================ */}
          {(stateRec?.reason || state.statePersonality) && (
            <section className="p-4 rounded-xl bg-primary/5 border border-primary/10">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {stateRec?.reason ?? state.statePersonality}
              </p>
            </section>
          )}

          {/* ============================================================ */}
          {/* 3. Draw Overview — tag quotas / odds                         */}
          {/* ============================================================ */}
          {relevantUnits.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Draw Overview
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {relevantUnits.slice(0, 4).map((unit) => {
                  const latestDraw = unit.drawData?.[0];
                  const species = SPECIES_MAP[unit.speciesId];
                  return (
                    <div
                      key={unit.id}
                      className="p-3 rounded-lg bg-secondary/20 text-center"
                    >
                      <p className="text-[10px] text-muted-foreground truncate">
                        {species?.name ?? unit.speciesId}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        Unit {unit.unitCode}
                      </p>
                      {latestDraw ? (
                        <>
                          <p className="text-lg font-bold mt-1">
                            {latestDraw.oddsPercent}%
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {latestDraw.applicants} applied &middot;{" "}
                            {latestDraw.tags} tags
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-lg font-bold mt-1">
                            {unit.tagQuotaNonresident}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            NR tags available
                          </p>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ============================================================ */}
          {/* 4. Species in Plan                                           */}
          {/* ============================================================ */}
          {speciesInPlan.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Species in Your Plan
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                {speciesInPlan.map((sp) => (
                  <div
                    key={sp.speciesId}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/30"
                  >
                    <SpeciesAvatar speciesId={sp.speciesId} size={24} />
                    <span className="text-xs font-medium">
                      {sp.speciesName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {sp.first === sp.last
                        ? sp.first
                        : `${sp.first}\u2013${sp.last}`}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ============================================================ */}
          {/* 5. Season Dates — grid columns                               */}
          {/* ============================================================ */}
          {state.seasonTiers && state.seasonTiers.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Season Dates
              </h3>
              <div
                className={`grid gap-2 ${
                  state.seasonTiers.length <= 2
                    ? "grid-cols-2"
                    : state.seasonTiers.length === 3
                    ? "grid-cols-3"
                    : "grid-cols-2 sm:grid-cols-4"
                }`}
              >
                {state.seasonTiers.map((tier, i) => {
                  // Highlight if recommended by assessment's best unit
                  const isRecommended = stateRec?.bestUnits.some((bu) =>
                    bu.tacticalNotes?.bestSeasonTier
                      ?.toLowerCase()
                      .includes(tier.tier.toLowerCase())
                  );
                  return (
                    <div
                      key={i}
                      className={`p-3 rounded-lg text-center transition-colors ${
                        isRecommended
                          ? "bg-primary/10 border border-primary/20 ring-1 ring-primary/20"
                          : "bg-secondary/20"
                      }`}
                    >
                      <p className="text-xs font-semibold">{tier.tier}</p>
                      <p className="text-sm font-bold mt-0.5">{tier.dates}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                        {tier.notes}
                      </p>
                      {isRecommended && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] text-primary font-semibold mt-1.5">
                          <Star className="w-2.5 h-2.5" /> Recommended
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ============================================================ */}
          {/* 6. Recommended Units                                         */}
          {/* ============================================================ */}
          {relevantUnits.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Recommended Units
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {relevantUnits.map((unit) => {
                  const isExpanded = expandedUnits.has(unit.id);
                  const species = SPECIES_MAP[unit.speciesId];
                  return (
                    <div
                      key={unit.id}
                      className="rounded-xl border border-border bg-card overflow-hidden"
                    >
                      <button
                        className="w-full flex items-center gap-3 p-3 text-left hover:bg-secondary/30 transition-colors cursor-pointer"
                        onClick={() => toggleUnit(unit.id)}
                        aria-expanded={isExpanded}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">
                              {unit.unitName ?? unit.unitCode}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              Unit {unit.unitCode}
                            </span>
                            {species && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                                {species.name}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <StatBadge
                              icon={<Crosshair className="w-3 h-3" />}
                              label="Success"
                              value={`${Math.round(unit.successRate * 100)}%`}
                              color={
                                unit.successRate > 0.25
                                  ? "text-green-400"
                                  : "text-muted-foreground"
                              }
                            />
                            <StatBadge
                              icon={<Mountain className="w-3 h-3" />}
                              label="Trophy"
                              value={`${unit.trophyRating}/10`}
                              color={
                                unit.trophyRating >= 7
                                  ? "text-amber-400"
                                  : "text-muted-foreground"
                              }
                            />
                            <StatBadge
                              icon={<TreePine className="w-3 h-3" />}
                              label="Public"
                              value={`${Math.round(unit.publicLandPct * 100)}%`}
                              color={
                                unit.publicLandPct > 0.5
                                  ? "text-emerald-400"
                                  : "text-muted-foreground"
                              }
                            />
                            <StatBadge
                              icon={<Users className="w-3 h-3" />}
                              label="Pressure"
                              value={unit.pressureLevel}
                              color={
                                unit.pressureLevel === "Low"
                                  ? "text-green-400"
                                  : unit.pressureLevel === "High"
                                  ? "text-red-400"
                                  : "text-muted-foreground"
                              }
                            />
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="border-t border-border p-3 space-y-2.5 text-sm text-muted-foreground bg-secondary/10 fade-in-up">
                          {unit.notes && (
                            <p className="italic text-xs">{unit.notes}</p>
                          )}
                          {unit.tacticalNotes && (
                            <>
                              {unit.tacticalNotes.accessMethod && (
                                <TacticalRow
                                  label="Access"
                                  value={unit.tacticalNotes.accessMethod}
                                />
                              )}
                              {unit.tacticalNotes.glassingStrategy && (
                                <TacticalRow
                                  label="Glassing"
                                  value={unit.tacticalNotes.glassingStrategy}
                                />
                              )}
                              {unit.tacticalNotes.campingOptions && (
                                <TacticalRow
                                  label="Camping"
                                  value={unit.tacticalNotes.campingOptions}
                                />
                              )}
                              {unit.tacticalNotes.typicalHuntLength && (
                                <TacticalRow
                                  label="Duration"
                                  value={unit.tacticalNotes.typicalHuntLength}
                                />
                              )}
                              {unit.tacticalNotes.trophyExpectation && (
                                <TacticalRow
                                  label="Trophy"
                                  value={unit.tacticalNotes.trophyExpectation}
                                />
                              )}
                              {unit.tacticalNotes.proTip && (
                                <div className="p-2 rounded-lg bg-primary/5 border border-primary/10 text-xs">
                                  <span className="font-semibold text-primary">
                                    Pro Tip:
                                  </span>{" "}
                                  {unit.tacticalNotes.proTip}
                                </div>
                              )}
                            </>
                          )}
                          {unit.nearestAirport && (
                            <TacticalRow
                              label="Airport"
                              value={unit.nearestAirport}
                            />
                          )}
                          {unit.driveTimeFromAirport && (
                            <TacticalRow
                              label="Drive"
                              value={unit.driveTimeFromAirport}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ============================================================ */}
          {/* 7. Costs & Fees — NR / Resident side-by-side                 */}
          {/* ============================================================ */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Costs & Fees
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* NR Fees */}
              <div className="p-3 rounded-lg bg-secondary/20">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-semibold">
                  Non-Resident
                </p>
                <div className="grid gap-1">
                  {state.feeSchedule.map((fee, i) => (
                    <div
                      key={i}
                      className="flex justify-between text-xs gap-2"
                    >
                      <span className="text-muted-foreground truncate">
                        {fee.name}
                      </span>
                      <span className="shrink-0 font-medium">
                        ${fee.amount}
                      </span>
                    </div>
                  ))}
                </div>
                {/* NR point costs for user's species */}
                {filteredPointCosts.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="text-[10px] text-muted-foreground mb-1">
                      Point cost / year
                    </p>
                    {filteredPointCosts.map(([speciesId, cost]) => (
                      <div
                        key={speciesId}
                        className="flex justify-between text-xs"
                      >
                        <span className="text-muted-foreground capitalize">
                          {speciesId.replace(/_/g, " ")}
                        </span>
                        <span>{cost === 0 ? "Free" : `$${cost}`}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Resident Fees */}
              {state.residentFeeSchedule &&
                state.residentFeeSchedule.length > 0 && (
                  <div className="p-3 rounded-lg bg-secondary/20">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-semibold">
                      Resident
                    </p>
                    <div className="grid gap-1">
                      {state.residentFeeSchedule.map((fee, i) => (
                        <div
                          key={i}
                          className="flex justify-between text-xs gap-2"
                        >
                          <span className="text-muted-foreground truncate">
                            {fee.name}
                          </span>
                          <span className="shrink-0 font-medium">
                            ${fee.amount}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </section>

          {/* ============================================================ */}
          {/* 8. Important Deadlines — filtered to user's species           */}
          {/* ============================================================ */}
          {filteredDeadlines.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Important Deadlines
              </h3>
              <div className="grid gap-1.5">
                {filteredDeadlines.map(([speciesId, dl]) => (
                  <div
                    key={speciesId}
                    className="flex justify-between items-center p-2 rounded-lg bg-secondary/20 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <SpeciesAvatar speciesId={speciesId} size={18} />
                      <span className="capitalize">
                        {speciesId.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-muted-foreground">
                        {formatDate(dl.open)}
                      </span>
                      <span className="mx-1 text-muted-foreground/50">
                        &rarr;
                      </span>
                      <span className="font-medium">{formatDate(dl.close)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Draw result dates */}
              {state.drawResultDates && speciesInPlan.length > 0 && (
                <div className="p-3 rounded-lg bg-secondary/20 mt-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
                    Draw Results
                  </p>
                  <div className="grid gap-1">
                    {speciesInPlan.map((sp) => {
                      const date = state.drawResultDates?.[sp.speciesId];
                      if (!date) return null;
                      return (
                        <div
                          key={sp.speciesId}
                          className="flex justify-between text-xs"
                        >
                          <span className="text-muted-foreground">
                            {sp.speciesName}
                          </span>
                          <span>{formatDate(date)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ============================================================ */}
          {/* 9. Application Tips                                          */}
          {/* ============================================================ */}
          {state.applicationTips && state.applicationTips.length > 0 && (
            <section>
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-[10px] text-primary uppercase tracking-wider mb-1.5 font-semibold">
                  Tips
                </p>
                <ul className="space-y-1">
                  {state.applicationTips.slice(0, 4).map((tip, i) => (
                    <li
                      key={i}
                      className="text-xs text-muted-foreground leading-relaxed"
                    >
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatBadge({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <span className={`flex items-center gap-1 text-[10px] ${color}`}>
      {icon}
      <span className="font-medium">{value}</span>
      <span className="text-muted-foreground/50 hidden sm:inline">
        {label}
      </span>
    </span>
  );
}

function TacticalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-xs">
      <span className="font-medium text-foreground/70">{label}:</span>{" "}
      <span className="text-muted-foreground">{value}</span>
    </div>
  );
}
