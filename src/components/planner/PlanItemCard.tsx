"use client";

import { Check, Trash2, Target, Binoculars, AlertTriangle, Clock, Calendar, MapPin } from "lucide-react";

// ============================================================================
// Shared Types & Config
// ============================================================================

export type ItemType = "hunt" | "scout" | "deadline" | "prep" | "application" | "point_purchase";

export interface PlanItem {
  id: string;
  type: ItemType;
  title: string;
  description?: string;
  stateId?: string;
  speciesId?: string;
  month: number; // 1-12
  estimatedCost?: number;
  completed: boolean;
}

export const ITEM_TYPE_CONFIG: Record<ItemType, { label: string; icon: typeof Target; color: string }> = {
  hunt: { label: "Hunt", icon: Target, color: "text-destructive" },
  scout: { label: "Scout", icon: Binoculars, color: "text-info" },
  deadline: { label: "Deadline", icon: AlertTriangle, color: "text-warning" },
  prep: { label: "Prep", icon: Clock, color: "text-success" },
  application: { label: "Application", icon: Calendar, color: "text-premium" },
  point_purchase: { label: "Buy Points", icon: MapPin, color: "text-chart-5" },
};

// ============================================================================
// Component
// ============================================================================

interface PlanItemCardProps {
  item: PlanItem;
  expanded: boolean;
  onToggleComplete: (id: string) => void;
  onRemove: (id: string) => void;
}

export function PlanItemCard({ item, expanded, onToggleComplete, onRemove }: PlanItemCardProps) {
  const cfg = ITEM_TYPE_CONFIG[item.type];

  return (
    <div
      className="flex items-center gap-1.5 text-[10px]"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => onToggleComplete(item.id)}
        aria-label={item.completed ? `Mark "${item.title}" incomplete` : `Mark "${item.title}" complete`}
        className="relative p-2 -m-2 shrink-0"
      >
        <span className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
          item.completed
            ? "bg-success/20 border-success/50"
            : "border-border hover:border-primary/50"
        }`}>
          {item.completed && (
            <Check className="w-2.5 h-2.5 text-success" />
          )}
        </span>
      </button>
      <cfg.icon className={`w-3 h-3 ${cfg.color} shrink-0`} />
      <span
        className={`truncate ${item.completed ? "line-through text-muted-foreground/50" : ""}`}
      >
        {item.title}
      </span>
      {expanded && (
        <button
          onClick={() => {
            if (window.confirm(`Remove "${item.title}" from the plan?`)) {
              onRemove(item.id);
            }
          }}
          aria-label={`Remove "${item.title}" from plan`}
          className="ml-auto shrink-0 text-muted-foreground hover:text-destructive p-2 -m-2"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
