"use client";

/**
 * SVG state outline icon component.
 * Renders a single state as a standalone icon with its own tight viewBox.
 * Normalizes aspect ratios so all states appear the same visual size.
 * Path data shared with InteractiveMap via state-paths.ts.
 */

import { useMemo } from "react";
import { STATE_PATHS } from "@/lib/constants/state-paths";

interface StateOutlineProps {
  stateId: string;
  size?: number;
  className?: string;
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string;
}

/** Parse "x y w h" viewBox → compute a square viewBox centered on the path */
function normalizeViewBox(viewBox: string, padding = 8): string {
  const [x, y, w, h] = viewBox.split(" ").map(Number);
  const maxDim = Math.max(w, h) + padding * 2;
  const cx = x + w / 2;
  const cy = y + h / 2;
  return `${cx - maxDim / 2} ${cy - maxDim / 2} ${maxDim} ${maxDim}`;
}

export function StateOutline({
  stateId,
  size = 24,
  className = "",
  strokeColor = "currentColor",
  strokeWidth = 2,
  fillColor = "none",
}: StateOutlineProps) {
  const state = STATE_PATHS[stateId.toUpperCase()];

  const squareViewBox = useMemo(
    () => (state ? normalizeViewBox(state.viewBox) : ""),
    [state],
  );

  if (!state) {
    return null;
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={squareViewBox}
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-label={`${stateId} state outline`}
      role="img"
      preserveAspectRatio="xMidYMid meet"
    >
      <path d={state.path} />
    </svg>
  );
}
