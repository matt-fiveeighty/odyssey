"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { RoadmapActionDetail } from "./RoadmapActionDetail";
import type { RoadmapActionItem } from "./RoadmapActionList";
import type { StrategicAssessment } from "@/lib/types";
import { formatSpeciesName } from "@/lib/utils";
import { STATES_MAP } from "@/lib/constants/states";

// ============================================================================
// Mobile Action Sheet — Spring Physics Bottom Sheet
//
// Uses spring-eased transitions (cubic-bezier overshoot) instead of linear
// slides. Swipe velocity dictates dismiss speed — feels weighty, like a
// physical card sliding over the screen.
// ============================================================================

interface MobileActionSheetProps {
  action: RoadmapActionItem | null;
  assessment: StrategicAssessment;
  open: boolean;
  onClose: () => void;
}

export function MobileActionSheet({
  action,
  assessment,
  open,
  onClose,
}: MobileActionSheetProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ y: number; time: number } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Reset drag state when sheet opens/closes
  useEffect(() => {
    if (!open) {
      setDragOffset(0);
      setIsDragging(false);
    }
  }, [open]);

  if (!action) return null;

  const stateName = STATES_MAP[action.stateId]?.abbreviation ?? action.stateId;
  const species = formatSpeciesName(action.speciesId);

  // ── Touch handlers for swipe-to-dismiss ──
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { y: touch.clientY, time: Date.now() };
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const delta = touch.clientY - touchStartRef.current.y;
    // Only allow downward drag (positive delta) with resistance at top
    if (delta > 0) {
      // Rubber-band resistance: diminishing returns as user drags further
      const dampened = delta * 0.6;
      setDragOffset(dampened);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStartRef.current || !contentRef.current) {
      setIsDragging(false);
      setDragOffset(0);
      return;
    }

    const sheetHeight = contentRef.current.offsetHeight;
    const dragPercent = dragOffset / sheetHeight;

    // Calculate swipe velocity (px/ms)
    const elapsed = Date.now() - touchStartRef.current.time;
    const velocity = dragOffset / Math.max(elapsed, 1);

    // Fast swipe (velocity > 0.5 px/ms) = dismiss regardless of distance
    // Slow swipe past 40% = dismiss
    // Otherwise: spring back
    if (velocity > 0.5 || dragPercent > 0.4) {
      onClose();
    }

    // Reset
    setDragOffset(0);
    setIsDragging(false);
    touchStartRef.current = null;
  }, [dragOffset, onClose]);

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] overflow-y-auto rounded-t-2xl px-0 pt-0 pb-6 [&[data-state=open]]:!duration-500 [&[data-state=closed]]:!duration-300"
        style={{
          // Spring physics: cubic-bezier with overshoot
          transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
          animationTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
          // Apply drag offset during touch
          ...(isDragging ? {
            transform: `translateY(${dragOffset}px)`,
            transition: "none",
          } : {}),
        }}
        showCloseButton={false}
      >
        <div
          ref={contentRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Drag handle — wider + more visible for swipe affordance */}
          <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-background z-10">
            <div className="w-12 h-1.5 rounded-full bg-border/60" />
          </div>

          <SheetHeader className="px-4 pb-2">
            <SheetTitle className="text-base">
              {species} — {stateName}
            </SheetTitle>
            <SheetDescription className="text-xs">
              {action.type === "hunt" ? "Hunt Year" : action.type === "apply" ? "Application" : "Points"} · {action.year}
            </SheetDescription>
          </SheetHeader>

          <div className="px-0">
            <RoadmapActionDetail action={action} assessment={assessment} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
