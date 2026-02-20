/**
 * .ics calendar export utility.
 *
 * Generates iCalendar (.ics) files for deadlines and plan items,
 * then triggers a browser download.
 */

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatICSDate(date: Date): string {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}@odysseyoutdoors`;
}

function escapeICS(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

interface CalendarEvent {
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;      // for multi-day events; if omitted, single-day
  isAllDay?: boolean;
  location?: string;
}

function buildICS(events: CalendarEvent[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Odyssey Outdoors//Hunt Planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const ev of events) {
    const start = formatICSDate(ev.startDate);
    // For all-day events: DTEND is exclusive (day after last day)
    const endDate = ev.endDate ?? ev.startDate;
    const endExclusive = new Date(endDate);
    endExclusive.setDate(endExclusive.getDate() + 1);
    const end = formatICSDate(endExclusive);

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid()}`);
    lines.push(`DTSTAMP:${formatICSDate(new Date())}T000000Z`);
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
  return lines.join("\r\n");
}

/** Trigger a browser download of an .ics file */
export function downloadICS(events: CalendarEvent[], filename: string) {
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
  openDate: string;     // YYYY-MM-DD
  closeDate: string;    // YYYY-MM-DD
  url?: string;
}) {
  const close = new Date(opts.closeDate + "T00:00:00");
  // Reminder: set start one day before close date
  const reminder = new Date(close);
  reminder.setDate(reminder.getDate() - 1);

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
  month: number;       // 1-12
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
