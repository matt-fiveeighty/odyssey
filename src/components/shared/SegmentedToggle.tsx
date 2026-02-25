"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Segmented Toggle — Sliding pill with spring physics
//
// The active option has a glowing pill that visually "slides" behind the text
// using spring-eased translateX. Width auto-calculates from the active
// option's real width.
//
// Usage:
//   <SegmentedToggle
//     options={["Action List", "State Map"]}
//     value="Action List"
//     onChange={setView}
//   />
// ============================================================================

interface SegmentedToggleProps<T extends string = string> {
  options: T[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  /** Size variant */
  size?: "sm" | "md";
}

export function SegmentedToggle<T extends string = string>({
  options,
  value,
  onChange,
  className,
  size = "md",
}: SegmentedToggleProps<T>) {
  const trackRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [pillStyle, setPillStyle] = useState({ transform: "translateX(0px)", width: "0px" });

  // Calculate pill position from the active option's DOM rect
  const updatePill = useCallback(() => {
    const activeEl = optionRefs.current.get(value);
    const track = trackRef.current;
    if (!activeEl || !track) return;

    const trackRect = track.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();
    const offsetX = activeRect.left - trackRect.left - 3; // 3px = track padding

    setPillStyle({
      transform: `translateX(${offsetX}px)`,
      width: `${activeRect.width}px`,
    });
  }, [value]);

  // Update pill on value change and initial mount
  useEffect(() => {
    updatePill();
  }, [updatePill]);

  // Re-measure on resize
  useEffect(() => {
    const observer = new ResizeObserver(updatePill);
    if (trackRef.current) observer.observe(trackRef.current);
    return () => observer.disconnect();
  }, [updatePill]);

  const sizeClasses = size === "sm"
    ? "text-[11px] px-3 py-1"
    : "text-xs px-4 py-1.5";

  return (
    <div
      ref={trackRef}
      className={cn("toggle-pill-track", className)}
      role="radiogroup"
    >
      {/* Sliding pill indicator */}
      <div
        className="toggle-pill-indicator"
        style={pillStyle}
        aria-hidden="true"
      />

      {/* Options */}
      {options.map((option) => {
        const isActive = option === value;
        return (
          <button
            key={option}
            ref={(el) => {
              if (el) optionRefs.current.set(option, el);
            }}
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option)}
            className={cn(
              "toggle-pill-option",
              sizeClasses,
              isActive
                ? "text-primary-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
