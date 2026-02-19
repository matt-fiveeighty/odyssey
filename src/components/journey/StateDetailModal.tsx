"use client";

/**
 * State Detail Modal — rich detail view when a state is clicked on the map.
 * Shows species in plan, season tiers, recommended units with stat badges,
 * tactical notes, and application info.
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
} from "lucide-react";

interface StateDetailModalProps {
  stateId: string | null;
  onClose: () => void;
  journeyData: JourneyData;
}

export function StateDetailModal({ stateId, onClose, journeyData }: StateDetailModalProps) {
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());

  const state = stateId ? STATES_MAP[stateId] : null;
  const visuals = stateId ? STATE_VISUALS[stateId] : null;

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
          speciesYears.set(action.speciesId, { first: yr.year, last: yr.year });
        }
      }
    }

    return Array.from(speciesYears.entries()).map(([speciesId, years]) => ({
      speciesId,
      speciesName: SPECIES_MAP[speciesId]?.name ?? speciesId,
      ...years,
    }));
  }, [stateId, journeyData]);

  // Filter sample units to ones matching this state + user's species
  const relevantUnits = useMemo(() => {
    if (!stateId) return [];
    const userSpeciesIds = new Set(speciesInPlan.map((s) => s.speciesId));
    // If no species in plan, show all units for the state
    if (userSpeciesIds.size === 0) {
      return SAMPLE_UNITS.filter((u) => u.stateId === stateId);
    }
    return SAMPLE_UNITS.filter((u) => u.stateId === stateId && userSpeciesIds.has(u.speciesId));
  }, [stateId, speciesInPlan]);

  const toggleUnit = (unitId: string) => {
    setExpandedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  };

  if (!state || !stateId) return null;

  return (
    <Dialog open={!!stateId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Header with gradient background */}
        <div className={`relative p-6 pb-4 bg-gradient-to-br ${visuals?.gradient ?? "from-slate-900 to-slate-800"} rounded-t-lg`}>
          <div className="flex items-center gap-4">
            <StateOutline
              stateId={stateId}
              size={72}
              strokeColor="white"
              strokeWidth={2}
              fillColor="rgba(255,255,255,0.1)"
              className="shrink-0"
            />
            <div>
              <DialogHeader>
                <DialogTitle className="text-xl text-white">
                  {state.name}
                </DialogTitle>
                <DialogDescription className="text-white/70 text-sm">
                  {visuals?.terrain ?? state.pointSystemDetails.description}
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/80 uppercase tracking-wider">
                  {state.pointSystem.replace("_", " ")}
                </span>
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
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Species in Plan */}
          {speciesInPlan.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Species in Your Plan
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {speciesInPlan.map((sp) => (
                  <div key={sp.speciesId} className="flex items-center gap-2.5 p-2 rounded-lg bg-secondary/30">
                    <SpeciesAvatar speciesId={sp.speciesId} size={32} />
                    <div>
                      <p className="text-sm font-medium">{sp.speciesName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {sp.first === sp.last ? sp.first : `${sp.first}\u2013${sp.last}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Season Tiers */}
          {state.seasonTiers && state.seasonTiers.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Season Tiers
              </h3>
              <div className="space-y-1.5">
                {state.seasonTiers.map((tier, i) => (
                  <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-secondary/20 text-sm">
                    <span className="font-medium shrink-0 w-24">{tier.tier}</span>
                    <span className="text-muted-foreground">{tier.dates}</span>
                    <span className="text-[10px] text-muted-foreground/70 ml-auto">{tier.notes}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Hunt Description */}
          {state.statePersonality && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                About This State
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{state.statePersonality}</p>
            </section>
          )}

          {/* Recommended Units */}
          {relevantUnits.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Recommended Units
              </h3>
              <div className="space-y-2">
                {relevantUnits.map((unit) => {
                  const isExpanded = expandedUnits.has(unit.id);
                  const species = SPECIES_MAP[unit.speciesId];
                  return (
                    <div key={unit.id} className="rounded-xl border border-border bg-card overflow-hidden">
                      {/* Unit header */}
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

                          {/* Stat badges */}
                          <div className="flex flex-wrap gap-2 mt-2">
                            <StatBadge
                              icon={<Crosshair className="w-3 h-3" />}
                              label="Success"
                              value={`${Math.round(unit.successRate * 100)}%`}
                              color={unit.successRate > 0.25 ? "text-green-400" : "text-muted-foreground"}
                            />
                            <StatBadge
                              icon={<Mountain className="w-3 h-3" />}
                              label="Trophy"
                              value={`${unit.trophyRating}/10`}
                              color={unit.trophyRating >= 7 ? "text-amber-400" : "text-muted-foreground"}
                            />
                            <StatBadge
                              icon={<TreePine className="w-3 h-3" />}
                              label="Public"
                              value={`${Math.round(unit.publicLandPct * 100)}%`}
                              color={unit.publicLandPct > 0.5 ? "text-emerald-400" : "text-muted-foreground"}
                            />
                            <StatBadge
                              icon={<Users className="w-3 h-3" />}
                              label="Pressure"
                              value={unit.pressureLevel}
                              color={unit.pressureLevel === "Low" ? "text-green-400" : unit.pressureLevel === "High" ? "text-red-400" : "text-muted-foreground"}
                            />
                          </div>
                        </div>

                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                      </button>

                      {/* Expanded tactical notes */}
                      {isExpanded && (
                        <div className="border-t border-border p-3 space-y-2.5 text-sm text-muted-foreground bg-secondary/10 fade-in-up">
                          {unit.notes && (
                            <p className="italic text-xs">{unit.notes}</p>
                          )}
                          {unit.tacticalNotes && (
                            <>
                              {unit.tacticalNotes.accessMethod && (
                                <TacticalRow label="Access" value={unit.tacticalNotes.accessMethod} />
                              )}
                              {unit.tacticalNotes.glassingStrategy && (
                                <TacticalRow label="Glassing" value={unit.tacticalNotes.glassingStrategy} />
                              )}
                              {unit.tacticalNotes.campingOptions && (
                                <TacticalRow label="Camping" value={unit.tacticalNotes.campingOptions} />
                              )}
                              {unit.tacticalNotes.typicalHuntLength && (
                                <TacticalRow label="Duration" value={unit.tacticalNotes.typicalHuntLength} />
                              )}
                              {unit.tacticalNotes.trophyExpectation && (
                                <TacticalRow label="Trophy" value={unit.tacticalNotes.trophyExpectation} />
                              )}
                              {unit.tacticalNotes.proTip && (
                                <div className="p-2 rounded-lg bg-primary/5 border border-primary/10 text-xs">
                                  <span className="font-semibold text-primary">Pro Tip:</span>{" "}
                                  {unit.tacticalNotes.proTip}
                                </div>
                              )}
                            </>
                          )}
                          {unit.nearestAirport && (
                            <TacticalRow label="Airport" value={unit.nearestAirport} />
                          )}
                          {unit.driveTimeFromAirport && (
                            <TacticalRow label="Drive" value={unit.driveTimeFromAirport} />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Application Info */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Application Info
            </h3>
            <div className="space-y-2 text-sm">
              {/* Deadlines */}
              {state.applicationDeadlines && Object.keys(state.applicationDeadlines).length > 0 && (
                <div className="p-3 rounded-lg bg-secondary/20">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Deadlines</p>
                  <div className="grid gap-1">
                    {Object.entries(state.applicationDeadlines).slice(0, 4).map(([speciesId, dl]) => (
                      <div key={speciesId} className="flex justify-between text-xs">
                        <span className="text-muted-foreground capitalize">{speciesId.replace("_", " ")}</span>
                        <span>{dl.close}</span>
                      </div>
                    ))}
                    {Object.keys(state.applicationDeadlines).length > 4 && (
                      <p className="text-[10px] text-muted-foreground/50 mt-1">
                        +{Object.keys(state.applicationDeadlines).length - 4} more species
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Point costs */}
              {state.pointCost && (
                <div className="p-3 rounded-lg bg-secondary/20">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Point Cost (NR)</p>
                  <div className="grid gap-1">
                    {Object.entries(state.pointCost).slice(0, 4).map(([speciesId, cost]) => (
                      <div key={speciesId} className="flex justify-between text-xs">
                        <span className="text-muted-foreground capitalize">{speciesId.replace("_", " ")}</span>
                        <span>${cost}/yr</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tips */}
              {state.applicationTips && state.applicationTips.length > 0 && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-[10px] text-primary uppercase tracking-wider mb-1.5 font-semibold">Tips</p>
                  <ul className="space-y-1">
                    {state.applicationTips.slice(0, 3).map((tip, i) => (
                      <li key={i} className="text-xs text-muted-foreground leading-relaxed">
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatBadge({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <span className={`flex items-center gap-1 text-[10px] ${color}`}>
      {icon}
      <span className="font-medium">{value}</span>
      <span className="text-muted-foreground/50 hidden sm:inline">{label}</span>
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
