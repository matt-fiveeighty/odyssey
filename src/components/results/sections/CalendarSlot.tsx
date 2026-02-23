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
  Download,
} from "lucide-react";
import { exportDeadline } from "@/lib/calendar-export";
import { STATES_MAP } from "@/lib/constants/states";

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
  const isScouting = !!slot.scoutingTarget;
  const urgencyClasses = isScouting
    ? "border-premium/30 bg-premium/5"
    : urgencyColorClass(slot.urgency);
  const Icon = ITEM_TYPE_ICONS[slot.itemType];
  const tagConfig = TAG_TYPE_CONFIG[slot.tagType];

  const titleText = isScouting
    ? `Scouting for ${slot.scoutingTarget!.targetStateId} Unit ${slot.scoutingTarget!.targetUnitCode}: ${slot.scoutingTarget!.strategicReason}`
    : (slot.advisorNote || slot.description);

  return (
    <div
      className={`flex items-center gap-1 px-1 py-0.5 rounded border-l-2 overflow-hidden ${urgencyClasses}`}
      title={titleText}
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

        {/* Bottom line: tag badge + scout badge + cost */}
        <div className="flex items-center gap-1">
          {isScouting && (
            <span className="text-[7px] px-1 rounded uppercase font-medium leading-tight bg-premium/15 text-premium">
              SCOUT HUNT
            </span>
          )}
          {!isScouting && tagConfig && (
            <span
              className={`text-[7px] px-1 rounded uppercase font-medium leading-tight ${tagConfig.className}`}
            >
              {tagConfig.label}
            </span>
          )}
          <span className="text-[8px] text-muted-foreground font-mono truncate">
            ${Math.round(slot.estimatedCost).toLocaleString()}
          </span>
          {slot.dueDate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const state = STATES_MAP[slot.stateId];
                exportDeadline({
                  stateName: state?.name ?? slot.stateId,
                  species: formatSpeciesName(slot.speciesId),
                  openDate: slot.dueDate!,
                  closeDate: slot.dueDate!,
                  url: slot.url,
                });
              }}
              className="shrink-0 p-0.5 rounded text-muted-foreground/40 hover:text-foreground transition-colors cursor-pointer"
              title="Export to calendar (.ics)"
            >
              <Download className="w-2 h-2" />
            </button>
          )}
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
