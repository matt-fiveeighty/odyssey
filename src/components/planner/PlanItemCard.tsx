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
  hunt: { label: "Hunt", icon: Target, color: "text-red-400" },
  scout: { label: "Scout", icon: Binoculars, color: "text-blue-400" },
  deadline: { label: "Deadline", icon: AlertTriangle, color: "text-amber-400" },
  prep: { label: "Prep", icon: Clock, color: "text-green-400" },
  application: { label: "Application", icon: Calendar, color: "text-purple-400" },
  point_purchase: { label: "Buy Points", icon: MapPin, color: "text-teal-400" },
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
        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
          item.completed
            ? "bg-green-400/20 border-green-400/50"
            : "border-border hover:border-primary/50"
        }`}
      >
        {item.completed && (
          <Check className="w-2.5 h-2.5 text-green-400" />
        )}
      </button>
      <cfg.icon className={`w-3 h-3 ${cfg.color} shrink-0`} />
      <span
        className={`truncate ${item.completed ? "line-through text-muted-foreground/50" : ""}`}
      >
        {item.title}
      </span>
      {expanded && (
        <button
          onClick={() => onRemove(item.id)}
          className="ml-auto shrink-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
