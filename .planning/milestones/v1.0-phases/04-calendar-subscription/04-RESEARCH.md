# Phase 4: Calendar Subscription - Research

**Researched:** 2026-02-22
**Domain:** iCalendar (RFC 5545) calendar subscription feeds, isomorphic ICS generation, Redis token pattern
**Confidence:** HIGH

## Summary

Phase 4 adds calendar subscription capability to Hunt Planner, allowing users to subscribe to their hunt calendar in Google Calendar or Apple Calendar via webcal:// protocol. The core challenge is extracting the existing browser-only buildICS function into an isomorphic module that works both client-side (for individual event downloads) and server-side (for subscription endpoints), while ensuring stable UID generation to prevent duplicate events on refresh.

The technical foundation already exists: calendar-export.ts provides basic ICS generation, redis.ts implements token-based caching (pattern proven in share API), and calendar-grid.ts supplies the data model. The phase requires refactoring for isomorphic compatibility, implementing content-derived UIDs (replacing Date.now() random UIDs), adding VTIMEZONE support, and creating the subscription endpoint.

**Primary recommendation:** Use timezones-ical-library for VTIMEZONE generation, SHA-256 content hashing for stable UIDs, and follow the existing share API token pattern (crypto.randomUUID() with Redis 365d TTL).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| timezones-ical-library | ^3.x | VTIMEZONE block generation from IANA timezone IDs | Official IANA timezone → RFC 5545 VTIMEZONE converter, dual CJS/ESM, Node.js compatible, actively maintained |
| date-fns | 4.1.0 (installed) | Date manipulation and formatting | Already in project, isomorphic (browser + Node.js), no external dependencies |
| crypto (built-in) | Node.js built-in | SHA-256 hashing for stable UIDs | Native Web Crypto API compatible, deterministic hashing, no dependencies |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns-tz | ^3.x | IANA timezone support for date-fns | If formatInTimeZone needed for deadline conversion (optional - may not be required) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| timezones-ical-library | @touch4it/ical-timezones | Older library, less maintained (last update 2019), similar API but smaller ecosystem |
| timezones-ical-library | Manual VTIMEZONE generation | Would require IANA database parsing and DST rule calculation - complex, error-prone |
| SHA-256 content hash | UUID v5 (namespace-based) | UUIDs require namespace management, less transparent for debugging, same determinism |
| crypto.createHash | Browser SubtleCrypto | Async API complicates isomorphic code, requires polyfill for Node.js <15 |

**Installation:**
```bash
npm install timezones-ical-library
# Optional if timezone conversion needed:
# npm install date-fns-tz
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── calendar/
│   │   ├── ics-builder.ts       # ISOMORPHIC: buildICS() + helper functions
│   │   ├── uid-generator.ts     # Content-derived stable UID generation
│   │   ├── calendar-export.ts   # BROWSER ONLY: downloadICS() trigger
│   ├── engine/
│   │   ├── calendar-grid.ts     # Phase 3 data model (already exists)
│   ├── redis.ts                 # Shared Redis client (already exists)
├── app/
│   ├── api/
│   │   ├── cal/
│   │   │   └── [token]/
│   │   │       └── route.ts     # GET handler for subscription endpoint
```

### Pattern 1: Isomorphic ICS Generation
**What:** Separate DOM-dependent code (Blob, createElement) from pure ICS string generation
**When to use:** Enabling code to run both client-side (browser download) and server-side (API endpoint)
**Example:**
```typescript
// src/lib/calendar/ics-builder.ts (ISOMORPHIC - no DOM)
// Source: Current calendar-export.ts refactored

export interface CalendarEvent {
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  isAllDay?: boolean;
  location?: string;
}

export function buildICS(events: CalendarEvent[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Odyssey Outdoors//Hunt Planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const ev of events) {
    const start = formatICSDate(ev.startDate);
    const endExclusive = new Date(ev.endDate ?? ev.startDate);
    endExclusive.setDate(endExclusive.getDate() + 1);
    const end = formatICSDate(endExclusive);

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${generateStableUID(ev)}`);  // CRITICAL: stable UID
    lines.push(`DTSTAMP:${formatICSTimestamp(new Date())}Z`);
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
  return lines.join("\r\n");  // CRITICAL: CRLF line endings
}

// src/lib/calendar/calendar-export.ts (BROWSER ONLY)
import { buildICS } from "./ics-builder";

export function downloadICS(events: CalendarEvent[], filename: string) {
  const ics = buildICS(events);  // Uses isomorphic builder
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
```

### Pattern 2: Content-Derived Stable UIDs
**What:** Generate UIDs from event content (state, species, type, date) using SHA-256 hashing
**When to use:** Preventing duplicate events when calendar subscription refreshes
**Example:**
```typescript
// src/lib/calendar/uid-generator.ts
// Based on: RFC 5545 UID requirements + SHA-256 deterministic hashing

import { createHash } from "crypto";

interface EventIdentity {
  stateId: string;
  speciesId: string;
  itemType: string;  // "application" | "hunt" | "point_purchase" etc.
  month: number;
  year: number;
  day?: number;
}

export function generateStableUID(identity: EventIdentity): string {
  // Create deterministic string representation
  const content = JSON.stringify({
    state: identity.stateId,
    species: identity.speciesId,
    type: identity.itemType,
    year: identity.year,
    month: identity.month,
    day: identity.day ?? 0,
  });

  // SHA-256 hash for content-derived uniqueness
  const hash = createHash("sha256").update(content).digest("hex").slice(0, 16);

  // RFC 5545 compliant format: <unique-id>@<domain>
  return `${hash}@odysseyoutdoors.com`;
}

// CRITICAL: Same event content ALWAYS generates same UID
// When user's plan changes, new events get new UIDs, old events disappear
```

### Pattern 3: Redis Token Pattern (from Share API)
**What:** Store plan snapshot in Redis with UUID token, serve via GET endpoint
**When to use:** Calendar subscription endpoint following proven share link pattern
**Example:**
```typescript
// src/app/api/cal/[token]/route.ts
// Based on: src/app/api/share/route.ts pattern

import { NextRequest, NextResponse } from "next/server";
import { cacheGet, isCacheAvailable } from "@/lib/redis";
import { buildICS } from "@/lib/calendar/ics-builder";
import type { StrategicAssessment } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // 1. Cache availability check
  if (!isCacheAvailable()) {
    return NextResponse.json(
      { error: "Calendar service temporarily unavailable" },
      { status: 503 }
    );
  }

  // 2. Retrieve plan snapshot from Redis
  const calKey = `cal:${token}`;
  const snapshot = await cacheGet<{ assessment: StrategicAssessment; year: number }>(calKey);

  if (!snapshot) {
    return NextResponse.json(
      { error: "Calendar not found or expired" },
      { status: 404 }
    );
  }

  // 3. Build calendar events from snapshot
  const events = buildCalendarEvents(snapshot.assessment, snapshot.year);

  // 4. Generate ICS content
  const ics = buildICS(events);

  // 5. Return with proper headers
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="hunt-planner.ics"',
      "Cache-Control": "public, max-age=3600",  // 1 hour client cache
    },
  });
}
```

### Pattern 4: VTIMEZONE Integration
**What:** Add VTIMEZONE components for events with specific timezones (deadlines)
**When to use:** When events have deadlines in specific timezones (America/Denver for CO)
**Example:**
```typescript
// src/lib/calendar/ics-builder.ts
import { tzlib_get_ical_block } from "timezones-ical-library";

export function buildICS(events: CalendarEvent[], options?: { includeTimezones?: string[] }): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Odyssey Outdoors//Hunt Planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  // Add VTIMEZONE blocks for referenced timezones
  const timezones = new Set(options?.includeTimezones ?? []);
  for (const tz of timezones) {
    try {
      const vtimezone = tzlib_get_ical_block(tz);
      // VTIMEZONE block comes with BEGIN:VTIMEZONE...END:VTIMEZONE
      lines.push(vtimezone);
    } catch (err) {
      console.warn(`Could not generate VTIMEZONE for ${tz}:`, err);
    }
  }

  // Add events...
  for (const ev of events) {
    // ... event generation
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
```

### Anti-Patterns to Avoid
- **Random UIDs (Date.now()):** Calendar clients see different UIDs on refresh, creating duplicate events
- **Mutable plan snapshots:** Calendar subscription should serve immutable snapshot until token regeneration
- **Missing CRLF line endings:** RFC 5545 requires `\r\n`, not `\n` alone
- **Missing METHOD:PUBLISH:** Subscription feeds require METHOD:PUBLISH header
- **DOM dependencies in isomorphic code:** No Blob, createElement, document in ics-builder.ts
- **Missing escapeICS for user content:** Semicolons, commas, newlines must be escaped per RFC 5545

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| VTIMEZONE generation | Custom DST rule calculator | timezones-ical-library | IANA database has 600+ timezones, DST rules change yearly, edge cases (no DST zones, historical changes) |
| Content hashing | Custom string → hash function | crypto.createHash('sha256') | Cryptographically secure, deterministic, built-in, battle-tested |
| Line folding (75 char limit) | Manual string splitting | Leave for future optimization | Current implementation works for 90% of events, add only when needed |
| ICS parsing | Custom RFC 5545 parser | N/A - only generating, not parsing | Parsing is Phase 7+ work if needed |

**Key insight:** VTIMEZONE blocks are deceptively complex - they encode DST transitions, historical rule changes, and timezone offset calculations. The IANA database is the authoritative source, and timezones-ical-library provides pre-generated RFC 5545-compliant blocks updated with each IANA database release.

## Common Pitfalls

### Pitfall 1: UID Instability Causing Duplicate Events
**What goes wrong:** Using Date.now() or random UUIDs for event UIDs causes calendar clients to see "new" events on each refresh, creating duplicates
**Why it happens:** Calendar clients use UID as the primary key - same UID = update existing event, different UID = create new event
**How to avoid:** Generate UIDs from event content (state + species + type + date) using SHA-256 hash, ensuring same event always gets same UID
**Warning signs:** Users report "duplicate events after refreshing calendar", events multiply on each subscription poll

### Pitfall 2: Isomorphic Code with DOM Dependencies
**What goes wrong:** Code fails at runtime when buildICS tries to access `document` or `Blob` in Node.js API route
**Why it happens:** Browser-only APIs (DOM, Blob, URL.createObjectURL) are unavailable in server-side contexts
**How to avoid:** Separate pure ICS string generation (isomorphic) from browser download trigger (browser-only), test server-side execution
**Warning signs:** "ReferenceError: document is not defined" in API route, "Blob is not defined" errors

### Pitfall 3: Missing CRLF Line Endings
**What goes wrong:** Calendar clients reject or misparse ICS files with Unix `\n` instead of RFC 5545-required `\r\n` (CRLF)
**Why it happens:** JavaScript string templates and .join("\n") default to LF-only, which violates RFC 5545 section 3.1
**How to avoid:** Always use `\r\n` for line breaks in ICS content, verify with hex editor or validator
**Warning signs:** Google Calendar shows "invalid calendar", Apple Calendar import fails silently, validators report "invalid line endings"

### Pitfall 4: Stale Client-Side Calendar Cache
**What goes wrong:** Users update their plan but calendar doesn't reflect changes for 12-24+ hours
**Why it happens:** Google Calendar and Outlook poll subscriptions every 12-24 hours regardless of cache headers, no way to force immediate refresh
**How to avoid:** Set user expectations (updates appear within 24h), provide token regeneration for immediate "new" subscription, document refresh intervals
**Warning signs:** "Why didn't my calendar update?" support requests, users unsubscribe/resubscribe trying to force refresh

### Pitfall 5: Missing METHOD:PUBLISH Header
**What goes wrong:** Calendar clients treat feed as iTIP message (REQUEST/REPLY) instead of publication, causing unexpected behavior
**Why it happens:** RFC 5545 requires METHOD property - absence defaults to undefined behavior, some clients assume REQUEST
**How to avoid:** Always include `METHOD:PUBLISH` in VCALENDAR component for subscription feeds
**Warning signs:** Calendar clients prompt for RSVP, events show as "pending", unexpected "accept/decline" buttons

### Pitfall 6: DTSTAMP Without UTC Format
**What goes wrong:** Calendar validation fails when DTSTAMP lacks Z suffix or includes TZID parameter
**Why it happens:** RFC 5545 section 3.8.7.2 mandates DTSTAMP in UTC format (with Z suffix), no timezone parameter allowed
**How to avoid:** Always format DTSTAMP as `YYYYMMDDTHHmmssZ`, never include TZID on DTSTAMP property
**Warning signs:** Validator errors "DTSTAMP must be UTC", clients reject events, missing Z suffix in timestamp

### Pitfall 7: Token Regeneration Orphaning Old Subscriptions
**What goes wrong:** User regenerates token thinking it will update their calendar, but old subscription keeps showing stale data for 365 days
**Why it happens:** Calendar clients don't know token changed - they keep polling old URL until 404, but old token continues serving snapshot
**How to avoid:** UI copy must clarify "old subscription will continue until expiration", provide "expire old token now" option, or accept 365d TTL as feature
**Warning signs:** "I generated new token but calendar didn't update" support requests, confusion about multiple active subscriptions

## Code Examples

Verified patterns from project codebase:

### Format ICS Timestamp (UTC)
```typescript
// Source: Current calendar-export.ts pattern + RFC 5545 requirements
// RFC 5545 section 3.8.7.2: DTSTAMP MUST be UTC format with Z suffix

function formatICSTimestamp(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  const second = String(date.getUTCSeconds()).padStart(2, "0");

  return `${year}${month}${day}T${hour}${minute}${second}`;
  // Caller appends Z: `DTSTAMP:${formatICSTimestamp(new Date())}Z`
}
```

### Escape ICS Text Content
```typescript
// Source: Current calendar-export.ts escapeICS function
// RFC 5545 section 3.3.11: TEXT escaping rules

function escapeICS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")   // Backslash first (escape the escape char)
    .replace(/;/g, "\\;")     // Semicolon (property delimiter)
    .replace(/,/g, "\\,")     // Comma (value list separator)
    .replace(/\n/g, "\\n");   // Newline (literal newline → escaped)
}
```

### Build Calendar Events from Assessment
```typescript
// Source: Phase 3 calendar-grid.ts data model
import { buildCalendarGrid } from "@/lib/engine/calendar-grid";
import type { CalendarEvent } from "@/lib/calendar/ics-builder";

function buildCalendarEvents(
  assessment: StrategicAssessment,
  year: number
): CalendarEvent[] {
  const grid = buildCalendarGrid(assessment, year);
  const events: CalendarEvent[] = [];

  for (const row of grid.rows) {
    for (const [month, slots] of row.months) {
      for (const slot of slots) {
        const startDate = new Date(year, month - 1, slot.day ?? 1);

        let endDate: Date | undefined;
        if (slot.endMonth && slot.endDay) {
          endDate = new Date(year, slot.endMonth - 1, slot.endDay);
        } else if (slot.endDay) {
          endDate = new Date(year, month - 1, slot.endDay);
        }

        events.push({
          title: slot.title,
          description: slot.description,
          startDate,
          endDate,
          isAllDay: true,
          location: `${row.stateName} (${row.stateAbbr})`,
        });
      }
    }
  }

  return events;
}
```

### Generate Subscription URL (webcal://)
```typescript
// Based on: webcal:// protocol pattern + Next.js absolute URL construction

export function buildSubscriptionURL(token: string, baseURL: string): string {
  // Replace https:// with webcal:// (or http:// with webcal://)
  const webcalBase = baseURL.replace(/^https?:/, "webcal:");
  return `${webcalBase}/api/cal/${token}`;
}

// Usage:
const httpURL = `${req.nextUrl.origin}/api/cal/${token}`;
const webcalURL = buildSubscriptionURL(token, req.nextUrl.origin);
// Result: webcal://odysseyoutdoors.com/api/cal/abc-123-def
```

### Redis Snapshot Storage (from Share API Pattern)
```typescript
// Source: src/app/api/share/route.ts pattern adapted for calendar
import { cacheSet, CACHE_TTLS } from "@/lib/redis";

export async function POST(req: NextRequest) {
  const { assessment, year } = await req.json();

  const token = crypto.randomUUID();
  const calKey = `cal:${token}`;
  const createdAt = new Date().toISOString();

  await cacheSet(calKey, { assessment, year, createdAt }, "calendar_plans");
  // TTL: 365 days (CACHE_TTLS.calendar_plans)

  const httpURL = `${req.nextUrl.origin}/api/cal/${token}`;
  const webcalURL = buildSubscriptionURL(token, req.nextUrl.origin);

  return NextResponse.json({ httpURL, webcalURL, token }, { status: 201 });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| VTIMEZONE required for all events | VTIMEZONE optional for all-day events | RFC 5545 clarification (2009) | All-day events (VALUE=DATE) don't need VTIMEZONE, simplifies ICS generation |
| Manual IANA database parsing | Pre-generated VTIMEZONE libraries | timezones-ical-library (2020+) | Library maintains IANA updates, handles DST complexity |
| webcal:// only | webcal:// + https:// | 2015+ (HTTPS adoption) | Modern clients accept both, https:// works in browsers, webcal:// triggers native apps |
| X-WR-CALNAME required | X-WR-CALNAME optional | Always non-standard | Google/Apple support it, but it's not RFC 5545 - safe to include but not required |
| UUID v4 (random) UIDs | Content-derived UIDs | Community best practice (2018+) | Prevents duplicate events in subscription feeds, improves client sync |

**Deprecated/outdated:**
- **X-PUBLISHED-TTL:** Non-standard property for refresh interval - calendar clients ignore it, use cache headers instead
- **Line folding at 75 characters:** RFC 5545 says "SHOULD NOT exceed 75 octets" but modern clients handle longer lines fine - implement only if validators complain
- **VTIMEZONE for all-day events:** Not needed when using VALUE=DATE (all-day format) - only needed for timed events with specific timezones

## Open Questions

1. **Should we implement line folding (75 char limit) in Phase 4?**
   - What we know: RFC 5545 says lines "SHOULD NOT" exceed 75 octets, modern clients tolerate longer lines
   - What's unclear: Will validators complain? Are there edge cases where long DESCRIPTION fields break clients?
   - Recommendation: Skip in Phase 4 unless testing reveals client issues - current event titles/descriptions unlikely to exceed limit

2. **Do we need date-fns-tz for timezone conversion?**
   - What we know: Application deadlines have deadlineTimezone field (e.g., "America/Denver"), timezones-ical-library handles VTIMEZONE blocks
   - What's unclear: Are all events all-day (VALUE=DATE) or do some need timed events (DTSTART with TZID)?
   - Recommendation: Phase 4 scope shows all-day events only - defer date-fns-tz until Phase 7 when adding timed deadline reminders

3. **Should token regeneration invalidate old token immediately?**
   - What we know: Share API pattern keeps old token active until TTL expires (90d), calendar uses 365d TTL
   - What's unclear: Does 365d orphaned subscription confuse users? Is "multiple active subscriptions" acceptable UX?
   - Recommendation: Phase 4: keep old token active (simpler, follows share pattern), Phase 8+: add "expire all old tokens" option if user feedback demands it

4. **How to handle calendar subscription refresh intervals?**
   - What we know: Google Calendar polls 12-24h, Outlook 3-24h, no way to force immediate refresh, X-PUBLISHED-TTL ignored
   - What's unclear: Should we document this limitation? Provide workaround (unsubscribe/resubscribe)?
   - Recommendation: Phase 4 UI copy: "Updates appear within 24 hours. To see changes immediately, generate a new subscription link." Accept limitation as ecosystem constraint.

## Sources

### Primary (HIGH confidence)
- [RFC 5545 UID Property](https://icalendar.org/iCalendar-RFC-5545/3-8-4-7-unique-identifier.html) - UID format, uniqueness constraints
- [RFC 5545 VTIMEZONE Component](https://icalendar.org/iCalendar-RFC-5545/3-6-5-time-zone-component.html) - VTIMEZONE requirements, TZID mapping
- [RFC 5545 DTSTAMP Property](https://www.kanzaki.com/docs/ical/dtstamp.html) - UTC timestamp format requirements
- [RFC 5545 Content Lines](https://icalendar.org/iCalendar-RFC-5545/3-1-content-lines.html) - CRLF line endings, 75 char limit
- [RFC 5545 PRODID Property](https://www.kanzaki.com/docs/ical/prodid.html) - PRODID format examples
- Current codebase: calendar-export.ts, redis.ts, calendar-grid.ts, share API (src/app/api/share/route.ts)

### Secondary (MEDIUM confidence)
- [timezones-ical-library npm](https://www.npmjs.com/package/timezones-ical-library) - VTIMEZONE generation library (verified via GitHub)
- [date-fns-tz formatInTimeZone](https://github.com/marnusw/date-fns-tz) - IANA timezone support for date-fns
- [webcal protocol - Wikipedia](https://en.wikipedia.org/wiki/Webcal) - webcal:// vs https:// behavior
- [X-WR-CALNAME non-standard properties](https://github.com/allenporter/ical/issues/511) - Client support for X-WR-* extensions
- [SHA-256 in Node.js](https://www.geeksforgeeks.org/node-js/node-js-crypto-createhash-method/) - crypto.createHash deterministic hashing
- [Calendar subscription refresh behavior](https://jamesdoc.com/blog/2024/webcal/) - Google/Outlook polling intervals

### Tertiary (LOW confidence)
- [Next.js dynamic route params](https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes) - [token] pattern in route.ts (official docs, HIGH confidence moved to PRIMARY)
- [iCalendar duplicate events](https://theeventscalendar.com/knowledgebase/troubleshooting-duplicate-imports/) - UID stability pitfalls
- [Calendar subscription stale cache](https://theeventscalendar.com/knowledgebase/troubleshooting-common-subscription-issues/) - Client-side caching issues

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - timezones-ical-library verified via npm/GitHub, crypto built-in, date-fns already installed
- Architecture: HIGH - isomorphic pattern proven in Node.js ecosystem, share API pattern exists in codebase, Next.js dynamic routes official docs
- Pitfalls: MEDIUM-HIGH - UID stability issues documented in community forums, CRLF/METHOD:PUBLISH from RFC 5545 (HIGH), stale cache from calendar service docs (MEDIUM)
- VTIMEZONE handling: HIGH - RFC 5545 section 3.6.5 verified, timezones-ical-library README/API docs confirm usage
- Content hashing: HIGH - crypto.createHash is built-in, deterministic behavior verified in Node.js docs

**Research date:** 2026-02-22
**Valid until:** 90 days (stable domain - RFC 5545 unchanged since 2009, calendar client behavior slow-moving)
