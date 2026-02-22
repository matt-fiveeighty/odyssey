/**
 * Browser-only calendar download utilities.
 *
 * Delegates ICS string generation to the isomorphic ics-builder.ts module.
 * This file contains ONLY the DOM-dependent download trigger and convenience
 * wrappers (exportDeadline, exportPlanItem).
 */

import { buildICS } from "@/lib/calendar/ics-builder";
import type { ICSEventInput } from "@/lib/calendar/ics-builder";

// Re-export types for backward compatibility
export type { CalendarEvent, ICSEventInput } from "@/lib/calendar/ics-builder";

/** Trigger a browser download of an .ics file */
export function downloadICS(events: ICSEventInput[], filename: string) {
  const ics = buildICS(events);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Export a single deadline as a calendar event */
export function exportDeadline(opts: {
  stateName: string;
  species: string;
  openDate: string; // YYYY-MM-DD
  closeDate: string; // YYYY-MM-DD
  url?: string;
}) {
  const close = new Date(opts.closeDate + "T00:00:00");

  downloadICS(
    [
      {
        title: `${opts.stateName} ${opts.species} — Application Deadline`,
        description: `Application window: ${opts.openDate} to ${opts.closeDate}${opts.url ? `\\nApply: ${opts.url}` : ""}`,
        startDate: close,
        isAllDay: true,
      },
    ],
    `${opts.stateName}-${opts.species}-deadline`.replace(/\s+/g, "-").toLowerCase(),
  );
}

/** Export a plan item (hunt, deadline, scout, etc.) as a calendar event */
export function exportPlanItem(opts: {
  title: string;
  description?: string;
  year: number;
  month: number; // 1-12
  day?: number;
  endMonth?: number;
  endDay?: number;
}) {
  const start = new Date(opts.year, opts.month - 1, opts.day ?? 1);
  let end: Date | undefined;

  if (opts.endMonth && opts.endDay) {
    end = new Date(opts.year, opts.endMonth - 1, opts.endDay);
  } else if (opts.endDay) {
    end = new Date(opts.year, opts.month - 1, opts.endDay);
  }

  downloadICS(
    [
      {
        title: opts.title,
        description: opts.description,
        startDate: start,
        endDate: end,
        isAllDay: true,
      },
    ],
    opts.title.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase(),
  );
}
