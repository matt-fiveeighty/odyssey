"use client";

import type { RoadmapAction } from "@/lib/types";
import { STATES_MAP } from "@/lib/constants/states";
import { STATE_VISUALS } from "@/lib/constants/state-images";
import { SpeciesAvatar } from "@/components/shared/SpeciesAvatar";
import { formatSpeciesName } from "@/lib/utils";

export interface ActionItem extends RoadmapAction {
  year: number;
  isHuntYear: boolean;
}

interface ActionListProps {
  actions: ActionItem[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

function getActionLabel(type: string): string {
  switch (type) {
    case "buy_points": return "Point Year";
    case "apply": return "Draw Year";
    case "hunt": return "Hunt";
    case "scout": return "Scout";
    default: return type;
  }
}

function getActionBadgeClass(type: string): string {
  switch (type) {
    case "buy_points": return "bg-chart-2/15 text-chart-2";
    case "apply": return "bg-primary/15 text-primary";
    case "hunt": return "bg-chart-3/15 text-chart-3";
    case "scout": return "bg-premium/15 text-premium";
    default: return "bg-secondary text-muted-foreground";
  }
}

export function ActionList({ actions, selectedIndex, onSelect }: ActionListProps) {
  if (actions.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground/60">
        No actions match this filter.
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {actions.map((action, i) => {
        const state = STATES_MAP[action.stateId];
        const vis = STATE_VISUALS[action.stateId];
        const selected = selectedIndex === i;
        const now = new Date();
        const deadline = action.dueDate ? new Date(action.dueDate) : null;
        const daysOut = deadline ? Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
        const isUrgent = daysOut !== null && daysOut > 0 && daysOut <= 30;

        return (
          <button
            key={`${action.stateId}-${action.speciesId}-${action.type}-${action.year}-${i}`}
            onClick={() => onSelect(i)}
            className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-150 cursor-pointer ${
              selected
                ? "bg-secondary/80 border-l-2 border-l-primary"
                : "hover:bg-secondary/30 border-l-2 border-l-transparent"
            }`}
          >
            {/* Species thumbnail — like the colored dot on invoice rows */}
            <SpeciesAvatar speciesId={action.speciesId} size={36} className="rounded-lg" />

            {/* Main content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-semibold truncate">
                  {state?.abbreviation ?? action.stateId} {formatSpeciesName(action.speciesId)}
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0 ${getActionBadgeClass(action.type)}`}>
                  {getActionLabel(action.type)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                {action.unitCode && <span>{action.unitCode}</span>}
                <span className="font-mono">{action.year}</span>
                {action.estimatedDrawOdds != null && (
                  <span className="text-primary">{Math.round(action.estimatedDrawOdds * 100)}% odds</span>
                )}
              </div>
            </div>

            {/* Right: cost + deadline */}
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold">${action.cost.toLocaleString()}</p>
              {deadline && daysOut !== null && daysOut > 0 && (
                <p className={`text-[10px] ${isUrgent ? "text-chart-4 font-medium" : "text-muted-foreground/60"}`}>
                  {isUrgent ? `${daysOut}d left` : deadline.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
