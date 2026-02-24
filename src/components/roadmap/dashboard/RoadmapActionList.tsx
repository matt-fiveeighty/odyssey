"use client";

import type { RoadmapAction, Milestone } from "@/lib/types";
import { SpeciesAvatar } from "@/components/shared/SpeciesAvatar";
import { formatSpeciesName, cn } from "@/lib/utils";
import { STATES_MAP } from "@/lib/constants/states";
import {
  ACTION_TYPE_COLORS,
  DEFAULT_ACTION_STYLE,
  SELECTED_CLASSES,
  HOVER_CLASSES,
} from "./action-colors";

export interface RoadmapActionItem extends RoadmapAction {
  year: number;
  milestone?: Milestone;
}

interface RoadmapActionListProps {
  actions: RoadmapActionItem[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

type StatusPhase =
  | "not_started"
  | "applied"
  | "awaiting_draw"
  | "drew"
  | "didnt_draw"
  | "points_bought"
  | "hunt_planned"
  | "hunt_complete";

function resolvePhase(m?: Milestone): StatusPhase {
  if (!m) return "not_started";
  if (m.type === "buy_points") return m.completed ? "points_bought" : "not_started";
  if (m.type === "hunt" || m.type === "scout") return m.completed ? "hunt_complete" : "hunt_planned";
  if (m.drawOutcome === "drew") return "drew";
  if (m.drawOutcome === "didnt_draw") return "didnt_draw";
  if (m.completed) return "awaiting_draw";
  return "not_started";
}

const PHASE_BADGE: Record<StatusPhase, { label: string; cls: string }> = {
  not_started:   { label: "To Do",    cls: "bg-secondary/80 text-muted-foreground border border-border/30" },
  applied:       { label: "Applied",  cls: "bg-destructive/15 text-destructive border border-destructive/20" },
  awaiting_draw: { label: "Awaiting", cls: "bg-warning/15 text-warning border border-warning/20" },
  drew:          { label: "Drew!",    cls: "bg-success/15 text-success border border-success/20" },
  didnt_draw:    { label: "No Draw",  cls: "bg-destructive/15 text-destructive border border-destructive/20" },
  points_bought: { label: "Done",     cls: "bg-info/15 text-info border border-info/20" },
  hunt_planned:  { label: "Hunt",     cls: "bg-success/15 text-success border border-success/20" },
  hunt_complete: { label: "Complete", cls: "bg-success/15 text-success border border-success/20" },
};

export function RoadmapActionList({ actions, selectedIndex, onSelect }: RoadmapActionListProps) {
  // Group by year
  const grouped = new Map<number, { items: RoadmapActionItem[]; startIdx: number }>();
  let idx = 0;
  for (const action of actions) {
    const existing = grouped.get(action.year);
    if (existing) {
      existing.items.push(action);
    } else {
      grouped.set(action.year, { items: [action], startIdx: idx });
    }
    idx++;
  }

  let globalIdx = 0;

  return (
    <div className="divide-y divide-border/15">
      {Array.from(grouped.entries()).map(([year, { items }]) => (
        <div key={year}>
          {/* Year group header */}
          <div className="px-4 py-2 bg-secondary/30 border-b border-border/25">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-semibold">
                {year}
              </span>
              <span className="text-[9px] text-muted-foreground/40">
                {items.length} action{items.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          {/* Action rows — type-colored selection + hover */}
          {items.map((action) => {
            const currentIdx = globalIdx++;
            const isSelected = currentIdx === selectedIndex;
            const phase = resolvePhase(action.milestone);
            const badge = PHASE_BADGE[phase];
            const state = STATES_MAP[action.stateId];
            const typeStyle = ACTION_TYPE_COLORS[action.type] ?? DEFAULT_ACTION_STYLE;
            const selectedCls = SELECTED_CLASSES[action.type] ?? SELECTED_CLASSES.apply;
            const hoverCls = HOVER_CLASSES[action.type] ?? HOVER_CLASSES.apply;

            return (
              <button
                key={`${action.stateId}-${action.speciesId}-${action.type}-${action.year}-${currentIdx}`}
                onClick={() => onSelect(currentIdx)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 transition-all duration-150 cursor-pointer border-l-[3px]",
                  isSelected
                    ? selectedCls
                    : cn(hoverCls, "border-l-transparent"),
                  !isSelected && "border-b border-border/10",
                )}
              >
                <SpeciesAvatar speciesId={action.speciesId} size={34} />
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs font-medium truncate", isSelected && "text-foreground")}>
                      {state?.abbreviation ?? action.stateId}{" "}
                      {formatSpeciesName(action.speciesId)}
                    </span>
                    <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0", badge.cls)}>
                      {badge.label}
                    </span>
                  </div>
                  {action.unitCode && (
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">{action.unitCode}</p>
                  )}
                </div>
                {/* Cost — type color when selected, muted otherwise */}
                <span className={cn(
                  "text-xs font-semibold tabular-nums shrink-0",
                  isSelected ? typeStyle.text : "text-muted-foreground",
                )}>
                  ${Math.round(action.cost).toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
