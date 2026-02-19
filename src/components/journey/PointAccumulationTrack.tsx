"use client";

import { STATES_MAP } from "@/lib/constants/states";
import type { PointTrackData } from "@/lib/engine/journey-data";
import { UnlockMarker } from "./UnlockMarker";

interface PointAccumulationTrackProps {
  track: PointTrackData;
}

export function PointAccumulationTrack({ track }: PointAccumulationTrackProps) {
  const state = STATES_MAP[track.stateId];
  const maxPoints = Math.max(...track.years.map((y) => y.points), 1);

  return (
    <div className="space-y-1.5">
      {/* Track header */}
      <div className="flex items-center gap-2">
        <span
          className="w-5 h-5 rounded text-[8px] font-bold text-white flex items-center justify-center shrink-0"
          style={{ backgroundColor: state?.color ?? "#666" }}
        >
          {state?.abbreviation ?? track.stateId}
        </span>
        <span className="text-xs font-medium truncate">
          {track.speciesName}
        </span>
      </div>

      {/* Horizontal bar segments */}
      <div className="flex gap-px h-6 items-end">
        {track.years.map((yearData) => {
          const heightPct = Math.max((yearData.points / maxPoints) * 100, 8);
          const hasUnlock = !!yearData.unlockUnitCode;

          return (
            <div
              key={yearData.year}
              className="flex-1 flex flex-col items-center justify-end"
            >
              {hasUnlock && (
                <div className="mb-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-success" />
                </div>
              )}
              <div
                className={`w-full rounded-t-sm transition-all ${
                  hasUnlock
                    ? "bg-success/60"
                    : "bg-primary/30"
                }`}
                style={{ height: `${heightPct}%` }}
                title={`${yearData.year}: ${yearData.points} pts${
                  hasUnlock
                    ? ` - ${yearData.unlockUnitCode} unlocked`
                    : ""
                }`}
              />
              {/* Year label (only show every 3rd) */}
              {(yearData.year - track.years[0].year) % 3 === 0 && (
                <span className="text-[8px] text-muted-foreground mt-0.5">
                  {yearData.year.toString().slice(-2)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Unlock annotations */}
      {track.years
        .filter((y) => y.unlockUnitCode)
        .map((y) => (
          <UnlockMarker
            key={`${y.year}-${y.unlockUnitCode}`}
            stateId={track.stateId}
            unitCode={y.unlockUnitCode!}
          />
        ))}
    </div>
  );
}
