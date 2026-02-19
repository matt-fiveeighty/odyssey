/**
 * Season Date Parser
 *
 * Parses season tier date strings like "Aug 30 - Sep 30" or "Oct 14-18"
 * into structured date ranges for calendar rendering and hunt window blocking.
 */

const MONTH_MAP: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

export interface ParsedDateRange {
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
}

/**
 * Parse a season date string into a structured range.
 *
 * Supported formats:
 *  - "Sep 2-30"          → same month
 *  - "Oct 14 - Nov 18"   → cross month with spaces around dash
 *  - "Aug 30 - Sep 30"   → cross month
 *  - "Apr 15 - Jun 30"   → cross month
 *
 * Returns null for unparseable strings (e.g. "Varies by unit").
 */
export function parseSeasonDates(dateStr: string): ParsedDateRange | null {
  // Normalize whitespace and dashes
  const normalized = dateStr.replace(/\s*[–—]\s*/g, " - ").trim();

  // Cross-month: "Aug 30 - Sep 30"
  const crossMatch = normalized.match(
    /^(\w+)\s+(\d+)\s*-\s*(\w+)\s+(\d+)$/
  );
  if (crossMatch) {
    const sm = MONTH_MAP[crossMatch[1].toLowerCase().slice(0, 3)];
    const sd = parseInt(crossMatch[2]);
    const em = MONTH_MAP[crossMatch[3].toLowerCase().slice(0, 3)];
    const ed = parseInt(crossMatch[4]);
    if (sm && em) return { startMonth: sm, startDay: sd, endMonth: em, endDay: ed };
  }

  // Same-month: "Sep 2-30" or "Oct 14-18"
  const sameMatch = normalized.match(/^(\w+)\s+(\d+)\s*-\s*(\d+)$/);
  if (sameMatch) {
    const m = MONTH_MAP[sameMatch[1].toLowerCase().slice(0, 3)];
    const sd = parseInt(sameMatch[2]);
    const ed = parseInt(sameMatch[3]);
    if (m) return { startMonth: m, startDay: sd, endMonth: m, endDay: ed };
  }

  return null;
}
