"use client";

/**
 * SVG state outline icon component.
 * Renders a single state as a standalone icon with its own tight viewBox.
 * Path data shared with InteractiveMap via state-paths.ts.
 */

import { STATE_PATHS } from "@/lib/constants/state-paths";

interface StateOutlineProps {
  stateId: string;
  size?: number;
  className?: string;
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string;
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

  if (!state) {
    return null;
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={state.viewBox}
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label={`${stateId} state outline`}
      role="img"
      preserveAspectRatio="xMidYMid meet"
    >
      <path d={state.path} />
    </svg>
  );
}
