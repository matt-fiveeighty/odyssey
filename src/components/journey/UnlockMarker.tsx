"use client";

import { Lock } from "lucide-react";
import { STATES_MAP } from "@/lib/constants/states";

interface UnlockMarkerProps {
  stateId: string;
  unitCode: string;
  unitName?: string;
}

export function UnlockMarker({ stateId, unitCode, unitName }: UnlockMarkerProps) {
  const state = STATES_MAP[stateId];
  const displayCode = unitName ?? unitCode;

  return (
    <div className="flex items-center gap-1.5 text-[10px] text-green-400">
      <Lock className="w-3 h-3 shrink-0" />
      <span className="truncate">
        {state?.abbreviation ?? stateId} {displayCode} unlocked
      </span>
    </div>
  );
}
