"use client";

import { Star } from "lucide-react";
import type { Unit, State, Species } from "@/lib/types";
import UnitTagBadges from "@/components/units/UnitTagBadges";

interface UnitProfileHeaderProps {
  unit: Unit;
  state: State | undefined;
  species: Species | undefined;
}

export default function UnitProfileHeader({
  unit,
  state,
  species,
}: UnitProfileHeaderProps) {
  const trophyStars = Array.from(
    { length: 10 },
    (_, i) => i < unit.trophyRating
  );

  return (
    <div className="flex items-start gap-4">
      {state && (
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-base font-bold text-white shrink-0"
          style={{ backgroundColor: state.color }}
        >
          {state.abbreviation}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Unit {unit.unitCode}
          </h1>
          {unit.unitName && (
            <span className="text-lg text-muted-foreground">
              {unit.unitName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm text-muted-foreground">
            {species?.name ?? unit.speciesId} &middot;{" "}
            {state?.name ?? unit.stateId}
          </span>
        </div>
        {/* Trophy stars */}
        <div className="flex items-center gap-1 mb-3">
          {trophyStars.map((filled, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${
                filled
                  ? "text-warning fill-warning"
                  : "text-muted-foreground/30"
              }`}
            />
          ))}
          <span className="text-xs text-muted-foreground ml-1.5">
            {unit.trophyRating}/10 Trophy
          </span>
        </div>
        {/* Tags */}
        <UnitTagBadges unit={unit} />
      </div>
    </div>
  );
}
