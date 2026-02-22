"use client";

import type { CalendarSlotData } from "@/lib/engine/calendar-grid";
import { urgencyColorClass } from "@/lib/engine/urgency";
import { SpeciesAvatar } from "@/components/shared/SpeciesAvatar";
import { formatSpeciesName } from "@/lib/utils";
import {
  FileText,
  Coins,
  Target,
  Binoculars,
  AlertCircle,
  Wrench,
} from "lucide-react";

// ── Item Type Icons ────────────────────────────────────────────────────────

const ITEM_TYPE_ICONS: Record<
  CalendarSlotData["itemType"],
  React.ComponentType<{ className?: string }>
> = {
  application: FileText,
  point_purchase: Coins,
  hunt: Target,
  scout: Binoculars,
  deadline: AlertCircle,
  prep: Wrench,
};

// ── Tag Type Badges ────────────────────────────────────────────────────────

const TAG_TYPE_CONFIG: Record<
  CalendarSlotData["tagType"],
  { label: string; className: string } | null
> = {
  draw: { label: "DRAW", className: "bg-info/15 text-info" },
  otc: { label: "OTC", className: "bg-chart-2/15 text-chart-2" },
  leftover: { label: "LEFT", className: "bg-chart-4/15 text-chart-4" },
  points_only: { label: "PTS", className: "bg-warning/15 text-warning" },
  "n/a": null,
};

// ── Component ──────────────────────────────────────────────────────────────

interface CalendarSlotProps {
  slot: CalendarSlotData;
  /** Show state abbreviation prefix (used in mobile layout) */
  showState?: boolean;
}

export function CalendarSlot({ slot, showState }: CalendarSlotProps) {
  const urgencyClasses = urgencyColorClass(slot.urgency);
  const Icon = ITEM_TYPE_ICONS[slot.itemType];
  const tagConfig = TAG_TYPE_CONFIG[slot.tagType];

  return (
    <div
      className={`flex items-center gap-1 px-1 py-0.5 rounded border-l-2 overflow-hidden ${urgencyClasses}`}
      title={slot.description}
    >
      {/* Species avatar */}
      <SpeciesAvatar speciesId={slot.speciesId} size={16} className="shrink-0" />

      {/* Content area */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {/* Top line: icon + species name */}
        <div className="flex items-center gap-0.5">
          <Icon className="w-2.5 h-2.5 shrink-0 opacity-60" />
          {showState && (
            <span className="text-[8px] font-bold text-muted-foreground shrink-0">
              {slot.stateId}
            </span>
          )}
          <span className="text-[9px] font-medium truncate">
            {formatSpeciesName(slot.speciesId)}
          </span>
        </div>

        {/* Bottom line: tag badge + cost */}
        <div className="flex items-center gap-1">
          {tagConfig && (
            <span
              className={`text-[7px] px-1 rounded uppercase font-medium leading-tight ${tagConfig.className}`}
            >
              {tagConfig.label}
            </span>
          )}
          <span className="text-[8px] text-muted-foreground font-mono truncate">
            ${slot.estimatedCost.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Day indicator on right edge */}
      {slot.day && (
        <span className="text-[8px] text-muted-foreground/60 shrink-0 tabular-nums">
          {slot.day}
        </span>
      )}
    </div>
  );
}
