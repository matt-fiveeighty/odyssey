"use client";

import type { MoveTag } from "@/lib/types";
import { MOVE_TAG_LABELS } from "@/lib/types";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const MOVE_TAG_COLORS: Record<MoveTag, string> = {
  primary_play: "bg-primary/15 text-primary border-primary/30",
  opportunity_play: "bg-info/15 text-info border-info/30",
  hold_preserve: "bg-muted text-muted-foreground border-border",
  locked_anchor: "bg-warning/15 text-warning border-warning/30",
};

interface MoveTagBadgeProps {
  tag: MoveTag;
  locked?: boolean;
  className?: string;
}

export function MoveTagBadge({ tag, locked, className }: MoveTagBadgeProps) {
  const effectiveTag = locked ? "locked_anchor" : tag;
  const label = MOVE_TAG_LABELS[effectiveTag];
  const colors = MOVE_TAG_COLORS[effectiveTag];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border",
        colors,
        className,
      )}
    >
      {locked && <Lock className="w-2.5 h-2.5" />}
      {label}
    </span>
  );
}
