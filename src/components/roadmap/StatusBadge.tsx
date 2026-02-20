"use client";

import type { BoardStatus } from "@/lib/types";
import { BOARD_STATUS_LABELS, BOARD_STATUS_COLORS } from "@/lib/engine/board-state";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: BoardStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colors = BOARD_STATUS_COLORS[status];
  const label = BOARD_STATUS_LABELS[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border",
        colors.bg,
        colors.text,
        colors.border,
        className,
      )}
    >
      <span
        className={cn("w-1.5 h-1.5 rounded-full", colors.text.replace("text-", "bg-"))}
      />
      {label}
    </span>
  );
}
