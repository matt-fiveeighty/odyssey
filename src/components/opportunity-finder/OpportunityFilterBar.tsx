"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { SPECIES } from "@/lib/constants/species";
import { STATES } from "@/lib/constants/states";
import { SpeciesAvatar } from "@/components/shared/SpeciesAvatar";

type WeaponType = "archery" | "rifle" | "muzzleloader" | "any";
type Timeline = "this_year" | "1_3" | "3_7" | "any";

interface OpportunityFilterBarProps {
  selectedSpecies: string[];
  selectedStates: string[];
  selectedWeapon: WeaponType;
  selectedTimeline: Timeline;
  onToggleSpecies: (id: string) => void;
  onToggleState: (id: string) => void;
  onSetWeapon: (weapon: WeaponType) => void;
  onSetTimeline: (timeline: Timeline) => void;
  onClearAll: () => void;
}

const WEAPON_OPTIONS: { id: WeaponType; label: string }[] = [
  { id: "any", label: "Any" },
  { id: "rifle", label: "Rifle" },
  { id: "archery", label: "Archery" },
  { id: "muzzleloader", label: "Muzzleloader" },
];

const TIMELINE_OPTIONS: { id: Timeline; label: string; desc: string }[] = [
  { id: "this_year", label: "This Year", desc: "Drawable now" },
  { id: "1_3", label: "1-3 Years", desc: "Short wait" },
  { id: "3_7", label: "3-7 Years", desc: "Medium" },
  { id: "any", label: "Any", desc: "Show all" },
];

export function OpportunityFilterBar({
  selectedSpecies,
  selectedStates,
  selectedWeapon,
  selectedTimeline,
  onToggleSpecies,
  onToggleState,
  onSetWeapon,
  onSetTimeline,
  onClearAll,
}: OpportunityFilterBarProps) {
  const [expanded, setExpanded] = useState(true);

  const activeFilterCount =
    selectedSpecies.length +
    selectedStates.length +
    (selectedWeapon !== "any" ? 1 : 0) +
    (selectedTimeline !== "any" ? 1 : 0);

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Filters</span>
            {activeFilterCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-bold">
                {activeFilterCount}
              </span>
            )}
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {expanded && (
          <div className="mt-4 space-y-4">
            {/* Species filter */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Species {selectedSpecies.length > 0 && `(${selectedSpecies.length})`}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {SPECIES.map((sp) => {
                  const active = selectedSpecies.includes(sp.id);
                  return (
                    <button
                      key={sp.id}
                      onClick={() => onToggleSpecies(sp.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer active:scale-[0.97] ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-accent"
                      }`}
                    >
                      <SpeciesAvatar speciesId={sp.id} size={16} />
                      {sp.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* States filter */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                States {selectedStates.length > 0 && `(${selectedStates.length})`}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {STATES.map((st) => {
                  const active = selectedStates.includes(st.id);
                  return (
                    <button
                      key={st.id}
                      onClick={() => onToggleState(st.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer active:scale-[0.97] ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-accent"
                      }`}
                    >
                      {st.abbreviation}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Weapon + Timeline row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Weapon
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {WEAPON_OPTIONS.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => onSetWeapon(w.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer active:scale-[0.97] ${
                        selectedWeapon === w.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-accent"
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Timeline
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {TIMELINE_OPTIONS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => onSetTimeline(t.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer active:scale-[0.97] ${
                        selectedTimeline === t.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-accent"
                      }`}
                      title={t.desc}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Clear all */}
            {activeFilterCount > 0 && (
              <button
                onClick={onClearAll}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3 h-3" />
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Collapsed summary */}
        {!expanded && activeFilterCount > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {selectedSpecies.map((id) => (
              <span
                key={id}
                className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
              >
                {SPECIES.find((s) => s.id === id)?.name ?? id}
              </span>
            ))}
            {selectedStates.map((id) => (
              <span
                key={id}
                className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
              >
                {id}
              </span>
            ))}
            {selectedWeapon !== "any" && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {selectedWeapon}
              </span>
            )}
            {selectedTimeline !== "any" && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {selectedTimeline.replace("_", "-")}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
