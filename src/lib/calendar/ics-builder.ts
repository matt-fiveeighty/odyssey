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
import { STATES_MAP } from "@/lib/constants/states";
import { SPECIES_MAP } from "@/lib/constants/species";
import type { State } from "@/lib/types";

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

// ── Rich Description Builder ──────────────────────────────────────────────────

/**
 * Build a detailed, actionable calendar event description with:
 *   - What to do (concise action steps)
 *   - Portal link (direct F&G URL)
 *   - Cost breakdown
 *   - Unit code (if applicable)
 *   - License reminder (qualifying license, habitat stamp, etc.)
 *   - Species name (human-readable)
 */
function buildRichDescription(
  slot: CalendarSlotData,
  stateName: string,
  stateAbbr: string,
  state: State | undefined,
): string {
  const lines: string[] = [];
  const speciesName = SPECIES_MAP[slot.speciesId]?.name ?? slot.speciesId;

  // ── Action summary ──────────────────────────────────────────────────────
  lines.push(slot.description);
  lines.push("");

  // ── Quick steps based on action type ────────────────────────────────────
  lines.push("WHAT TO DO:");

  if (slot.itemType === "application") {
    const portalUrl = slot.url ?? state?.buyPointsUrl ?? state?.fgUrl;
    lines.push(`1. Go to ${stateAbbr} F&G portal${portalUrl ? `: ${portalUrl}` : ""}`);
    lines.push(`2. Submit your ${speciesName} application${slot.unitCode ? ` for ${slot.unitCode}` : ""}`);
    if (slot.dueDate) {
      lines.push(`3. Must be submitted by ${slot.dueDate}`);
    }
    if (state?.licenseFees?.qualifyingLicense) {
      lines.push(`4. Requires NR qualifying license ($${state.licenseFees.qualifyingLicense}) — buy first if you haven't`);
    }
  } else if (slot.itemType === "point_purchase") {
    const portalUrl = slot.url ?? state?.buyPointsUrl;
    const pointApp = state?.pointOnlyApplication;
    lines.push(`1. Go to ${stateAbbr} F&G portal${portalUrl ? `: ${portalUrl}` : ""}`);
    if (pointApp?.huntCode) {
      lines.push(`2. Select "${pointApp.huntCode}" (Point Only) as your choice`);
    } else {
      lines.push(`2. Select "Preference Point Only" option`);
    }
    if (pointApp?.secondChoiceTactic) {
      lines.push(`3. Pro tip: ${pointApp.secondChoiceTactic}`);
    }
    if (state?.licenseFees?.qualifyingLicense) {
      lines.push(`4. Requires NR qualifying license ($${state.licenseFees.qualifyingLicense}) — buy first if you haven't`);
    }
  } else if (slot.itemType === "hunt") {
    lines.push(`1. Confirm your ${speciesName} tag and season dates`);
    if (slot.unitCode) {
      lines.push(`2. Hunt area: ${slot.unitCode}`);
    }
    lines.push(`${slot.unitCode ? "3" : "2"}. Check regulations for weapon restrictions and bag limits`);
    lines.push(`${slot.unitCode ? "4" : "3"}. Arrange lodging, meat processing, and travel`);
  } else if (slot.itemType === "scout") {
    lines.push(`1. Pre-season scouting for ${speciesName} in ${stateName}`);
    if (slot.unitCode) {
      lines.push(`2. Focus area: ${slot.unitCode}`);
    }
    lines.push(`${slot.unitCode ? "3" : "2"}. Check access points, water sources, game trails`);
    lines.push(`${slot.unitCode ? "4" : "3"}. Use onX or HuntStand for public land boundaries`);
  } else {
    // deadline / prep
    const portalUrl = slot.url ?? state?.fgUrl;
    if (portalUrl) {
      lines.push(`1. Visit: ${portalUrl}`);
    }
  }

  lines.push("");

  // ── Details section ─────────────────────────────────────────────────────
  lines.push("DETAILS:");
  lines.push(`• Species: ${speciesName}`);
  lines.push(`• State: ${stateName} (${stateAbbr})`);
  if (slot.unitCode) {
    lines.push(`• Unit: ${slot.unitCode}`);
  }
  lines.push(`• Type: ${formatTagType(slot.tagType)}`);
  if (slot.estimatedCost > 0) {
    lines.push(`• Estimated Cost: $${slot.estimatedCost.toLocaleString()}`);
  }
  if (slot.dueDate) {
    lines.push(`• Deadline: ${slot.dueDate}`);
  }

  // ── License reminder ────────────────────────────────────────────────────
  if (state && (slot.itemType === "application" || slot.itemType === "point_purchase")) {
    const needsLicense: string[] = [];
    if (state.licenseFees?.qualifyingLicense) {
      needsLicense.push(`NR Qualifying License ($${state.licenseFees.qualifyingLicense})`);
    }
    const habitatFee = state.feeSchedule?.find(
      (f) => f.name.toLowerCase().includes("habitat") || f.name.toLowerCase().includes("stamp"),
    );
    if (habitatFee) {
      needsLicense.push(`${habitatFee.name} ($${habitatFee.amount})`);
    }
    if (needsLicense.length > 0) {
      lines.push("");
      lines.push("LICENSE REMINDER:");
      lines.push(`Before applying, make sure you've purchased: ${needsLicense.join(", ")}`);
    }
  }

  // ── Portal link ─────────────────────────────────────────────────────────
  const portalUrl = slot.url ?? state?.fgUrl;
  if (portalUrl) {
    lines.push("");
    lines.push(`${stateAbbr} F&G Portal: ${portalUrl}`);
  }

  // ── Footer ──────────────────────────────────────────────────────────────
  lines.push("");
  lines.push("— Odyssey Outdoors Hunt Planner");

  return lines.join("\n");
}

/** Human-readable tag type labels */
function formatTagType(tagType: CalendarSlotData["tagType"]): string {
  switch (tagType) {
    case "draw":
      return "Draw (limited entry)";
    case "otc":
      return "Over-the-Counter";
    case "leftover":
      return "Leftover tag";
    case "points_only":
      return "Preference Point Only";
    case "n/a":
      return "N/A";
  }
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

    const state = STATES_MAP[row.stateId] as State | undefined;

    for (const [month, slots] of row.months) {
      for (const slot of slots) {
        const startDate = new Date(year, month - 1, slot.day ?? 1);

        let endDate: Date | undefined;
        if (slot.endMonth && slot.endDay) {
          endDate = new Date(year, slot.endMonth - 1, slot.endDay);
        } else if (slot.endDay) {
          endDate = new Date(year, month - 1, slot.endDay);
        }

        const description = buildRichDescription(slot, row.stateName, row.stateAbbr, state);

        events.push({
          title: `${row.stateAbbr}: ${slot.title}`,
          description,
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
