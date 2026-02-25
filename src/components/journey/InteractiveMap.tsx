"use client";

/**
 * Interactive SVG Map — composite rendering of all 15 system states.
 * States are colored dynamically based on the selected year's journey actions.
 * Clicking a state opens the detail modal; hovering shows a tooltip.
 *
 * 4-color system:
 *   Green  — Planned Hunt (executing, booked)
 *   Orange — Apply w/ Points (drawing with invested points)
 *   Amber  — OTC / Try Your Luck (general season or random draw, no points)
 *   Blue   — Build Points (accumulating for later)
 */

import { useState, useCallback, useRef } from "react";
import { STATE_PATHS, STATE_LABEL_OFFSETS } from "@/lib/constants/state-paths";
import { STATES_MAP } from "@/lib/constants/states";
import type { JourneyYearData } from "@/lib/engine/journey-data";

// Action-type color palette (matches MapLegend)
const COLOR_HUNT = "#22c55e";       // green — planned hunt
const COLOR_DRAW_PTS = "#f97316";   // orange — apply with points
const COLOR_OTC = "#f59e0b";        // amber — OTC / try your luck
const COLOR_POINTS = "#3b82f6";     // blue — build points
const COLOR_INACTIVE = "oklch(0.20 0.01 260)";
const STROKE_ACTIVE = "oklch(0.85 0 0)";
const STROKE_INACTIVE = "oklch(0.30 0.01 260)";

export interface StateAllocatorData {
  points: number;
  sunkCost: number;
  targetDrawYear: number | null;
}

interface InteractiveMapProps {
  yearData: JourneyYearData | null;
  onStateClick: (stateId: string) => void;
  selectedYear: number;
  /** Optional per-state allocator data for enriched hover tooltips */
  allocatorData?: Record<string, StateAllocatorData>;
}

export function InteractiveMap({ yearData, onStateClick, selectedYear, allocatorData }: InteractiveMapProps) {
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const getStateFill = useCallback(
    (stateId: string): string => {
      if (!yearData) {
        // No assessment — show all states in their brand colors
        return STATES_MAP[stateId]?.color ?? COLOR_INACTIVE;
      }
      const hasHunt = yearData.hunts.some((h) => h.stateId === stateId);
      const app = yearData.applications.find((a) => a.stateId === stateId);
      const hasPoints = yearData.pointPurchases.some((p) => p.stateId === stateId);

      if (hasHunt) return COLOR_HUNT;
      if (app) return app.hasPoints ? COLOR_DRAW_PTS : COLOR_OTC;
      if (hasPoints) return COLOR_POINTS;
      return COLOR_INACTIVE;
    },
    [yearData]
  );

  const isStateActive = useCallback(
    (stateId: string): boolean => {
      if (!yearData) return true; // No data = all states shown
      return yearData.activeStates.includes(stateId);
    },
    [yearData]
  );

  const getActionLabel = useCallback(
    (stateId: string): string => {
      if (!yearData) return "";
      const hunt = yearData.hunts.find((h) => h.stateId === stateId);
      if (hunt) return "Planned Hunt";
      const app = yearData.applications.find((a) => a.stateId === stateId);
      if (app) return app.hasPoints ? "Apply w/ Points" : "OTC / Try Your Luck";
      const pts = yearData.pointPurchases.find((p) => p.stateId === stateId);
      if (pts) return "Build Points";
      return "";
    },
    [yearData]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent, stateId: string) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left + 12,
        y: e.clientY - rect.top - 8,
      });
      setHoveredState(stateId);
    },
    []
  );

  return (
    <div ref={containerRef} className="relative">
      <svg
        viewBox="-10 -10 560 480"
        className="w-full h-auto max-h-[340px]"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Interactive hunt plan map for ${selectedYear}`}
      >
        {/* Continental states */}
        {Object.entries(STATE_PATHS)
          .filter(([id]) => id !== "AK")
          .map(([stateId, stateData]) => {
            const fill = getStateFill(stateId);
            const active = isStateActive(stateId);
            const isHovered = hoveredState === stateId;
            const [vx, vy, vw, vh] = stateData.viewBox.split(" ").map(Number);
            const offset = STATE_LABEL_OFFSETS[stateId] ?? { dx: 0, dy: 0 };
            const cx = vx + vw / 2 + offset.dx;
            const cy = vy + vh / 2 + offset.dy;

            return (
              <g
                key={stateId}
                style={isHovered
                  ? { transform: `scale(1.06)`, transformOrigin: `${cx}px ${cy}px`, transition: 'transform 0.2s ease' }
                  : { transition: 'transform 0.2s ease' }
                }
              >
                {/* Electric blue glow behind state on hover */}
                {isHovered && active && (
                  <path
                    d={stateData.path}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={6}
                    opacity={0.35}
                    style={{ filter: "blur(3px)" }}
                    aria-hidden="true"
                  />
                )}
                <path
                  d={stateData.path}
                  fill={fill}
                  stroke={isHovered && active ? "#3b82f6" : active ? STROKE_ACTIVE : STROKE_INACTIVE}
                  strokeWidth={isHovered ? 2.5 : 2}
                  opacity={active || !yearData ? 1 : 0.35}
                  className="cursor-pointer transition-all duration-200"
                  style={isHovered ? { filter: "brightness(1.25)" } : undefined}
                  role="button"
                  tabIndex={0}
                  aria-label={`${STATES_MAP[stateId]?.name ?? stateId}${getActionLabel(stateId) ? ` — ${getActionLabel(stateId)}` : ""}`}
                  onClick={() => onStateClick(stateId)}
                  onMouseMove={(e) => handleMouseMove(e, stateId)}
                  onMouseLeave={() => setHoveredState(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onStateClick(stateId);
                    }
                  }}
                />
                <text
                  x={cx}
                  y={cy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  fontSize="11"
                  fontWeight="700"
                  className="pointer-events-none select-none"
                  opacity={active || !yearData ? 0.9 : 0.3}
                >
                  {stateId}
                </text>
              </g>
            );
          })}

        {/* Alaska — scaled inset in bottom-left */}
        {STATE_PATHS.AK && (() => {
          const stateId = "AK";
          const stateData = STATE_PATHS.AK;
          const fill = getStateFill(stateId);
          const active = isStateActive(stateId);
          const isHovered = hoveredState === stateId;

          return (
            <g
              transform="translate(-50, -120) scale(0.45)"
              style={isHovered
                ? { filter: "brightness(1.25)", transition: 'filter 0.2s ease' }
                : { transition: 'filter 0.2s ease' }
              }
            >
              <path
                d={stateData.path}
                fill={fill}
                stroke={active ? STROKE_ACTIVE : STROKE_INACTIVE}
                strokeWidth={isHovered ? 4 : 2.5}
                opacity={active || !yearData ? 1 : 0.35}
                className="cursor-pointer transition-all duration-200"
                style={isHovered ? { filter: "brightness(1.25)" } : undefined}
                role="button"
                tabIndex={0}
                aria-label={`Alaska${getActionLabel(stateId) ? ` — ${getActionLabel(stateId)}` : ""}`}
                onClick={() => onStateClick(stateId)}
                onMouseMove={(e) => handleMouseMove(e, stateId)}
                onMouseLeave={() => setHoveredState(null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onStateClick(stateId);
                  }
                }}
              />
              {/* AK label positioned inside mainland area */}
              <text
                x={120}
                y={520}
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize="22"
                fontWeight="700"
                className="pointer-events-none select-none"
                opacity={active || !yearData ? 0.9 : 0.3}
              >
                AK
              </text>
            </g>
          );
        })()}
      </svg>

      {/* Tooltip — dark-glass allocator overlay */}
      {hoveredState && (() => {
        const stateInfo = STATES_MAP[hoveredState];
        const stateName = stateInfo?.name ?? hoveredState;
        const actionLabel = getActionLabel(hoveredState);
        const alloc = allocatorData?.[hoveredState];

        return (
          <div
            className="absolute pointer-events-none z-10 glass-tooltip rounded-lg px-3 py-2 text-xs min-w-[180px]"
            style={{ left: tooltipPos.x, top: tooltipPos.y, transition: "none" }}
          >
            {/* State name + action */}
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-foreground uppercase tracking-wide text-[11px]">
                {stateName}
              </span>
              {actionLabel && (
                <span className="text-muted-foreground text-[10px]">{actionLabel}</span>
              )}
            </div>

            {/* Allocator data row */}
            {alloc && (
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground border-t border-border/40 pt-1.5 mt-1">
                {alloc.points > 0 && (
                  <span>
                    <span className="text-blue-400 font-semibold font-financial">{alloc.points}</span> Pts
                  </span>
                )}
                {alloc.sunkCost > 0 && (
                  <span>
                    <span className="text-red-400 font-semibold font-financial">${alloc.sunkCost.toLocaleString()}</span> Sunk
                  </span>
                )}
                {alloc.targetDrawYear && (
                  <span>
                    Draw: <span className="text-emerald-400 font-semibold font-financial">{alloc.targetDrawYear}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
