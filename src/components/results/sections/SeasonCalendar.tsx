"use client";

import { useState, useMemo, Fragment } from "react";
import type { StrategicAssessment } from "@/lib/types";
import {
  buildCalendarGrid,
  type CalendarGrid,
  type CalendarRow,
  type CalendarSlotData,
} from "@/lib/engine/calendar-grid";
import { CalendarSlot } from "./CalendarSlot";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────────────

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MONTH_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const PHASE_COLORS: Record<string, { bg: string; text: string }> = {
  building: { bg: "bg-primary/10", text: "text-primary" },
  build: { bg: "bg-primary/10", text: "text-primary" },
  positioning: { bg: "bg-info/10", text: "text-info" },
  burn: { bg: "bg-chart-2/10", text: "text-chart-2" },
  gap: { bg: "bg-secondary/30", text: "text-muted-foreground" },
  recovery: { bg: "bg-secondary/30", text: "text-muted-foreground" },
  trophy: { bg: "bg-chart-3/10", text: "text-chart-3" },
  youth_window: { bg: "bg-premium/10", text: "text-premium" },
};

const MAX_VISIBLE_SLOTS = 3;

// ── Types ──────────────────────────────────────────────────────────────────

interface SeasonCalendarProps {
  assessment: StrategicAssessment;
}

// ── Component ──────────────────────────────────────────────────────────────

export function SeasonCalendar({ assessment }: SeasonCalendarProps) {
  // Default to current year if within roadmap range, else first available year
  const initialYear = useMemo(() => {
    const available = assessment.roadmap.map((r) => r.year).sort();
    const currentYear = new Date().getFullYear();
    if (available.includes(currentYear)) return currentYear;
    return available[0] ?? currentYear;
  }, [assessment.roadmap]);

  const [selectedYear, setSelectedYear] = useState(initialYear);

  // Build the grid from assessment data
  const grid: CalendarGrid = useMemo(
    () => buildCalendarGrid(assessment, selectedYear),
    [assessment, selectedYear],
  );

  // Current month for highlighting (only when viewing current year)
  const currentMonth = new Date().getMonth(); // 0-indexed
  const isCurrentYear = selectedYear === new Date().getFullYear();

  // Year navigation
  const yearIndex = grid.availableYears.indexOf(selectedYear);
  const canGoPrev = yearIndex > 0;
  const canGoNext = yearIndex < grid.availableYears.length - 1;

  const goPrev = () => {
    if (canGoPrev) setSelectedYear(grid.availableYears[yearIndex - 1]);
  };
  const goNext = () => {
    if (canGoNext) setSelectedYear(grid.availableYears[yearIndex + 1]);
  };

  // Phase badge for the selected year
  const roadmapYear = assessment.roadmap.find((r) => r.year === selectedYear);
  const phaseColors = roadmapYear
    ? PHASE_COLORS[roadmapYear.phase] ?? PHASE_COLORS.building
    : PHASE_COLORS.building;

  // Find the highest-cost month for emphasis
  const maxMonthlyCost = Math.max(...grid.monthlyCosts, 0);

  return (
    <div className="space-y-3">
      {/* Year selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            disabled={!canGoPrev}
            className="p-1 rounded-lg hover:bg-secondary/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous year"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-sm font-bold tabular-nums min-w-[3rem] text-center">
            {selectedYear}
          </span>

          <button
            onClick={goNext}
            disabled={!canGoNext}
            className="p-1 rounded-lg hover:bg-secondary/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Next year"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {roadmapYear && (
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-medium capitalize ${phaseColors.bg} ${phaseColors.text}`}
            >
              {roadmapYear.phaseLabel ?? roadmapYear.phase}
            </span>
          )}
        </div>

        <div className="text-[10px] text-muted-foreground">
          {grid.rows.length} state{grid.rows.length !== 1 ? "s" : ""} ·{" "}
          <span className="font-mono font-bold text-foreground">
            ${grid.totalCost.toLocaleString()}
          </span>{" "}
          annual
        </div>
      </div>

      {/* Empty state */}
      {grid.rows.length === 0 && (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          No activities planned for {selectedYear}
        </div>
      )}

      {/* Desktop grid (md+) */}
      {grid.rows.length > 0 && (
        <>
          <div className="hidden md:grid grid-cols-[100px_repeat(12,1fr)] gap-px bg-border/20 rounded-xl overflow-hidden">
            {/* Header row */}
            <div className="bg-background p-1.5" /> {/* Empty corner */}
            {MONTH_LABELS.map((label, i) => (
              <div
                key={label}
                className={`bg-background p-1.5 text-center text-[9px] font-medium uppercase tracking-wider ${
                  isCurrentYear && i === currentMonth
                    ? "text-foreground font-bold"
                    : "text-muted-foreground"
                }`}
              >
                {label}
              </div>
            ))}

            {/* State rows */}
            {grid.rows.map((row) => (
              <StateRow
                key={row.stateId}
                row={row}
                isCurrentYear={isCurrentYear}
                currentMonth={currentMonth}
              />
            ))}

            {/* Summary row (CAL-07) */}
            <div className="bg-background p-1.5 flex items-center">
              <span className="text-[9px] font-bold text-muted-foreground">
                Monthly Total
              </span>
            </div>
            {grid.monthlyCosts.map((cost, i) => (
              <div
                key={i}
                className="bg-background p-1.5 flex items-center justify-center"
              >
                <span
                  className={`text-[9px] font-mono ${
                    cost > 0
                      ? cost === maxMonthlyCost && cost > 0
                        ? "text-foreground font-bold"
                        : "text-muted-foreground font-medium"
                      : "text-muted-foreground/40"
                  }`}
                >
                  {cost > 0 ? `$${cost.toLocaleString()}` : "–"}
                </span>
              </div>
            ))}
          </div>

          {/* Mobile layout (below md) */}
          <MobileCalendar
            grid={grid}
            selectedYear={selectedYear}
          />
        </>
      )}
    </div>
  );
}

// ── Desktop State Row ──────────────────────────────────────────────────────

function StateRow({
  row,
  isCurrentYear,
  currentMonth,
}: {
  row: CalendarRow;
  isCurrentYear: boolean;
  currentMonth: number;
}) {
  return (
    <Fragment>
      {/* State label cell */}
      <div className="bg-background p-1.5 flex items-center gap-1.5">
        <div
          className="w-5 h-5 rounded flex items-center justify-center text-[7px] font-bold text-white shrink-0"
          style={{ backgroundColor: row.color }}
        >
          {row.stateAbbr}
        </div>
        <span className="text-[10px] font-medium truncate">{row.stateName}</span>
      </div>

      {/* 12 month cells */}
      {Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const slots = row.months.get(month) ?? [];
        const isEmpty = slots.length === 0;
        const isHighlighted = isCurrentYear && i === currentMonth;

        return (
          <div
            key={i}
            className={`bg-background p-0.5 min-h-[52px] flex flex-col justify-center ${
              isEmpty ? "bg-secondary/5" : ""
            } ${isHighlighted ? "ring-1 ring-inset ring-primary/20" : ""}`}
          >
            {isEmpty ? (
              <EmptyMonthIndicator />
            ) : (
              <MonthSlots slots={slots} />
            )}
          </div>
        );
      })}
    </Fragment>
  );
}

// ── Month Slots with Overflow ──────────────────────────────────────────────

function MonthSlots({ slots }: { slots: CalendarSlotData[] }) {
  if (slots.length <= MAX_VISIBLE_SLOTS) {
    return (
      <div className="flex flex-col gap-0.5">
        {slots.map((slot) => (
          <CalendarSlot key={slot.id} slot={slot} />
        ))}
      </div>
    );
  }

  // Show first 2 + overflow badge
  const visible = slots.slice(0, 2);
  const remaining = slots.length - 2;

  return (
    <div className="flex flex-col gap-0.5">
      {visible.map((slot) => (
        <CalendarSlot key={slot.id} slot={slot} />
      ))}
      <span className="text-[8px] text-muted-foreground/70 text-center">
        +{remaining} more
      </span>
    </div>
  );
}

// ── Empty Month Indicator (CAL-05) ─────────────────────────────────────────

function EmptyMonthIndicator() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="w-1.5 h-1.5 rounded-full bg-border/40" />
    </div>
  );
}

// ── Mobile Calendar Layout ─────────────────────────────────────────────────

function MobileCalendar({
  grid,
  selectedYear,
}: {
  grid: CalendarGrid;
  selectedYear: number;
}) {
  // Collect all slots across all states, grouped by month
  const monthGroups = useMemo(() => {
    const groups: { month: number; slots: CalendarSlotData[]; cost: number }[] =
      [];

    for (let m = 1; m <= 12; m++) {
      const monthSlots: CalendarSlotData[] = [];
      for (const row of grid.rows) {
        const rowSlots = row.months.get(m) ?? [];
        monthSlots.push(...rowSlots);
      }
      if (monthSlots.length > 0) {
        groups.push({
          month: m,
          slots: monthSlots,
          cost: grid.monthlyCosts[m - 1],
        });
      }
    }

    return groups;
  }, [grid]);

  if (monthGroups.length === 0) return null;

  return (
    <div className="md:hidden space-y-3">
      {monthGroups.map(({ month, slots, cost }) => (
        <div key={month} className="rounded-xl border border-border/50 overflow-hidden">
          {/* Month heading */}
          <div className="flex items-center justify-between px-3 py-2 bg-secondary/20">
            <span className="text-xs font-bold">
              {MONTH_FULL[month - 1]} {selectedYear}
            </span>
            {cost > 0 && (
              <span className="text-[10px] font-mono text-muted-foreground">
                ${cost.toLocaleString()}
              </span>
            )}
          </div>

          {/* Slot list */}
          <div className="p-2 space-y-1">
            {slots.map((slot) => (
              <CalendarSlot key={slot.id} slot={slot} showState />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
