// ============================================================================
// Isomorphic ICS Builder
// ============================================================================
// RFC 5545-compliant iCalendar generation that works in both Node.js (server)
// and browser (client). Zero DOM dependencies.
//
// Features:
//   - VCALENDAR with METHOD:PUBLISH (ICS-07)
//   - VTIMEZONE blocks via timezones-ical-library (ICS-06)
//   - Stable content-derived UIDs (ICS-04)
//   - CRLF line endings per RFC 5545
//
// This module must NOT import Blob, document, URL, window, or any browser API.
// ============================================================================

import { createHash } from "crypto";
import { generateStableUID } from "./uid-generator";
import type { EventIdentity } from "./uid-generator";
import { tzlib_get_ical_block } from "timezones-ical-library";
import type {
  CalendarGrid,
  CalendarSlotData,
} from "@/lib/engine/calendar-grid";

// ── Exported Types ──────────────────────────────────────────────────────────

export interface CalendarEvent {
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  isAllDay?: boolean;
  location?: string;
}

export interface ICSEventInput extends CalendarEvent {
  /** If provided, generates a stable content-derived UID. If omitted, falls back to hash of title+date. */
  identity?: EventIdentity;
}

// ── Internal Helpers ────────────────────────────────────────────────────────

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Format a Date as YYYYMMDD (VALUE=DATE for all-day events) */
function formatICSDate(date: Date): string {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

/** Format a Date as YYYYMMDDTHHMMSS in UTC (for DTSTAMP with Z suffix) */
function formatICSTimestamp(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`
  );
}

/** Escape text per RFC 5545 section 3.3.11 */
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** Generate a fallback UID from title + date when no EventIdentity is provided */
function fallbackUID(title: string, startDate: Date): string {
  const content = title + formatICSDate(startDate);
  const hash = createHash("sha256").update(content).digest("hex").slice(0, 16);
  return `${hash}@odysseyoutdoors.com`;
}

// ── Main ICS Generation ─────────────────────────────────────────────────────

export interface BuildICSOptions {
  /** IANA timezone IDs to include as VTIMEZONE blocks (e.g., ["America/Denver"]) */
  timezones?: string[];
  /** Calendar display name (defaults to "Hunt Planner Calendar") */
  calendarName?: string;
}

/**
 * Generate a complete RFC 5545 iCalendar string from events.
 *
 * @param events - Array of calendar events with optional identity for stable UIDs
 * @param options - Optional VTIMEZONE and calendar name configuration
 * @returns Complete .ics file content with CRLF line endings
 */
export function buildICS(
  events: ICSEventInput[],
  options?: BuildICSOptions,
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Odyssey Outdoors//Hunt Planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${options?.calendarName ?? "Hunt Planner Calendar"}`,
  ];

  // ── VTIMEZONE blocks (ICS-06) ───────────────────────────────────────────

  if (options?.timezones) {
    const seen = new Set<string>();
    for (const tz of options.timezones) {
      if (seen.has(tz)) continue;
      seen.add(tz);

      try {
        const vtimezone = tzlib_get_ical_block(tz);
        // Library returns a string[] — first element is the standard VTIMEZONE block
        const block = Array.isArray(vtimezone) ? vtimezone[0] : vtimezone;
        if (block) {
          lines.push(block);
        }
      } catch {
        // Skip invalid timezone IDs — don't break the entire calendar
        console.warn(`[ics-builder] Could not generate VTIMEZONE for: ${tz}`);
      }
    }
  }

  // ── VEVENT blocks ───────────────────────────────────────────────────────

  const now = new Date();
  const dtstamp = `${formatICSTimestamp(now)}Z`;

  for (const ev of events) {
    const uid = ev.identity
      ? generateStableUID(ev.identity)
      : fallbackUID(ev.title, ev.startDate);

    const start = formatICSDate(ev.startDate);

    // DTEND is exclusive for all-day events (day after last day)
    const endDate = ev.endDate ?? ev.startDate;
    const endExclusive = new Date(endDate);
    endExclusive.setDate(endExclusive.getDate() + 1);
    const end = formatICSDate(endExclusive);

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART;VALUE=DATE:${start}`);
    lines.push(`DTEND;VALUE=DATE:${end}`);
    lines.push(`SUMMARY:${escapeICS(ev.title)}`);

    if (ev.description) {
      lines.push(`DESCRIPTION:${escapeICS(ev.description)}`);
    }
    if (ev.location) {
      lines.push(`LOCATION:${escapeICS(ev.location)}`);
    }

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  // RFC 5545 requires CRLF line endings
  return lines.join("\r\n");
}

// ── Grid-to-Events Conversion ───────────────────────────────────────────────

/**
 * Convert a CalendarGrid (from Phase 3) into ICSEventInput array for the
 * subscription endpoint. Also collects unique timezone IDs from states.
 *
 * @param grid - CalendarGrid from buildCalendarGrid()
 * @param year - The calendar year
 * @param stateTimezones - Optional mapping of stateId → IANA timezone
 * @returns Events + collected timezone IDs
 */
export function buildCalendarEventsFromGrid(
  grid: CalendarGrid,
  year: number,
  stateTimezones?: Record<string, string>,
): { events: ICSEventInput[]; timezones: string[] } {
  const events: ICSEventInput[] = [];
  const tzSet = new Set<string>();

  for (const row of grid.rows) {
    // Collect timezone for this state
    const tz = stateTimezones?.[row.stateId];
    if (tz) tzSet.add(tz);

    for (const [month, slots] of row.months) {
      for (const slot of slots) {
        const startDate = new Date(year, month - 1, slot.day ?? 1);

        let endDate: Date | undefined;
        if (slot.endMonth && slot.endDay) {
          endDate = new Date(year, slot.endMonth - 1, slot.endDay);
        } else if (slot.endDay) {
          endDate = new Date(year, month - 1, slot.endDay);
        }

        const costStr =
          slot.estimatedCost > 0
            ? `\nEstimated Cost: $${slot.estimatedCost.toLocaleString()}`
            : "";

        events.push({
          title: `${row.stateAbbr}: ${slot.title}`,
          description: `${slot.description}\n\nState: ${row.stateName}\nType: ${slot.tagType}${costStr}`,
          startDate,
          endDate,
          isAllDay: true,
          location: `${row.stateName} (${row.stateAbbr})`,
          identity: {
            stateId: slot.stateId,
            speciesId: slot.speciesId,
            itemType: slot.itemType,
            year,
            month: slot.month,
            day: slot.day,
          },
        });
      }
    }
  }

  return { events, timezones: Array.from(tzSet) };
}
