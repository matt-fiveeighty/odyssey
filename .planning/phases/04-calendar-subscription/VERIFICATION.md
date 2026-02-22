---
phase: 04-calendar-subscription
verified: 2026-02-22T12:00:00Z
status: human_needed
score: 5/5 must-haves verified
must_haves:
  truths:
    - "User can click Subscribe to Calendar and add a webcal:// URL to Google Calendar or Apple Calendar that auto-refreshes"
    - "buildICS module works both client-side (individual event downloads) and server-side (subscription endpoint) without DOM dependencies"
    - "Calendar events have stable content-derived UIDs so refreshing the subscription never creates duplicate events"
    - "Plan snapshots are stored server-side in Redis (365d TTL) -- subscription works independently of browser state"
    - "User can regenerate calendar token when plan changes and old token continues serving its snapshot until TTL expires"
  artifacts:
    - path: "src/lib/calendar/ics-builder.ts"
      status: verified
    - path: "src/lib/calendar/uid-generator.ts"
      status: verified
    - path: "src/lib/calendar-export.ts"
      status: verified
    - path: "src/app/api/cal/route.ts"
      status: verified
    - path: "src/app/api/cal/[token]/route.ts"
      status: verified
    - path: "src/components/results/SubscribeCalendar.tsx"
      status: verified
    - path: "src/components/results/ResultsShell.tsx"
      status: verified
    - path: "src/middleware.ts"
      status: verified
human_verification:
  - test: "Complete consultation, click Subscribe to Calendar, verify expanded panel appears with Open in Calendar and Copy URL buttons"
    expected: "Button transitions from idle to loading to ready state; expanded panel shows webcal URL, HTTP URL, expiration date, and Generate new link option"
    why_human: "Visual rendering, animation timing, and layout in the action bar cannot be verified programmatically"
  - test: "Click Open in Calendar to test webcal:// protocol handler"
    expected: "On macOS, Apple Calendar opens with a subscription prompt; on other OS, the default calendar app opens"
    why_human: "OS-level protocol handler behavior cannot be tested from code"
  - test: "Open the HTTP URL directly in a browser and inspect the ICS content"
    expected: "Valid ICS file with BEGIN:VCALENDAR, METHOD:PUBLISH, stable UIDs ending in @odysseyoutdoors.com, VTIMEZONE blocks, and rich descriptions with WHAT TO DO steps, DETAILS, LICENSE REMINDER, and F&G Portal links"
    why_human: "End-to-end API call through Redis requires running server and real/mock Redis connection"
  - test: "Click Generate new link and verify regeneration"
    expected: "New URL with different token appears; old URL still works when opened in browser"
    why_human: "Token regeneration requires live API calls to verify both old and new tokens serve content"
---

# Phase 4: Calendar Subscription Verification Report

**Phase Goal:** Users can subscribe to their hunt calendar in Google Calendar or Apple Calendar and receive automatic updates as their plan evolves -- the advisor speaks through their calendar
**Verified:** 2026-02-22
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can click "Subscribe to Calendar" and add a webcal:// URL to Google Calendar or Apple Calendar that auto-refreshes | VERIFIED (code) | `SubscribeCalendar.tsx` renders button at line 139-148, POSTs to `/api/cal` at line 46, receives webcalURL, opens via `window.open(subscription.webcalURL, "_self")` at line 133. Wired into `ResultsShell.tsx` at line 141. |
| 2 | buildICS module works both client-side and server-side without DOM dependencies | VERIFIED | `ics-builder.ts` has zero DOM imports (grep confirms only a comment mentions "document"). `calendar-export.ts` (browser wrapper) imports `buildICS` from ics-builder. All 4 existing consumers compile clean. `npx tsc --noEmit` passes. |
| 3 | Calendar events have stable content-derived UIDs so refreshing never creates duplicates | VERIFIED | `uid-generator.ts` uses `createHash("sha256")` with deterministic JSON.stringify (alphabetical keys) at lines 29-36. Returns `${hash}@odysseyoutdoors.com`. `ics-builder.ts` calls `generateStableUID(ev.identity)` at line 137 for events with identity. |
| 4 | Plan snapshots stored server-side in Redis (365d TTL), independent of browser state | VERIFIED | `POST /api/cal` stores `{ assessment, createdAt }` via `cacheSet(calKey, ..., "calendar_plans")` at line 60. `redis.ts` confirms `calendar_plans: 365 * 24 * 60 * 60`. `GET /api/cal/[token]` retrieves from Redis at line 25, builds calendar dynamically. No Zustand/browser state referenced in either endpoint. |
| 5 | User can regenerate calendar token, old token continues serving until TTL | VERIFIED | `SubscribeCalendar.tsx` has `handleRegenerate()` at line 78 which POSTs to `/api/cal` again (new token, new Redis entry). Old token is never invalidated -- only a new entry is created. Panel shows "Generate new link" button at line 249. |

**Score:** 5/5 truths verified (automated code analysis)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/calendar/ics-builder.ts` | Isomorphic ICS generation with VTIMEZONE | VERIFIED | 374 lines. Exports `buildICS`, `buildCalendarEventsFromGrid`, `CalendarEvent`, `ICSEventInput`, `BuildICSOptions`. Includes `buildRichDescription` for enriched event descriptions. METHOD:PUBLISH at line 104, CRLF join at line 168, VTIMEZONE via `tzlib_get_ical_block` at line 117. |
| `src/lib/calendar/uid-generator.ts` | Stable content-derived UIDs via SHA-256 | VERIFIED | 41 lines. Exports `EventIdentity`, `generateStableUID`. Deterministic hashing with alphabetical key ordering. |
| `src/lib/calendar-export.ts` | Browser-only download wrapper delegating to ics-builder | VERIFIED | 83 lines. Thin wrapper: imports `buildICS` from ics-builder, exports `downloadICS`, `exportDeadline`, `exportPlanItem`. Re-exports `CalendarEvent` and `ICSEventInput` types. No ICS generation logic remains. |
| `src/app/api/cal/route.ts` | POST endpoint for subscription token creation | VERIFIED | 74 lines. Rate limiting, cache check, validation, `crypto.randomUUID()` token, Redis storage with `calendar_plans` TTL, returns 201 with `{ webcalURL, httpURL, token, expiresAt }`. |
| `src/app/api/cal/[token]/route.ts` | GET endpoint serving dynamic ICS feed | VERIFIED | 76 lines. Retrieves snapshot from Redis, builds state timezone map from STATES_MAP, iterates ALL roadmap years, generates ICS via `buildICS`, returns `text/calendar` with proper headers. |
| `src/components/results/SubscribeCalendar.tsx` | Subscribe UI with copy/open/regenerate | VERIFIED | 277 lines. 4-state flow (idle/loading/ready/error). Open in Calendar (webcal://), Copy URL (clipboard with textarea fallback), Generate new link (token regeneration), expiration display. |
| `src/components/results/ResultsShell.tsx` | Integration of SubscribeCalendar | VERIFIED | Import at line 11, rendered at line 141 between PlanExport and ShareButton in the action button row. |
| `src/middleware.ts` | Route exclusion for /api/cal | VERIFIED | `api/cal` added to negative lookahead at line 20. Comment block updated at line 17. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `ics-builder.ts` | `uid-generator.ts` | `import { generateStableUID }` | WIRED | Line 17: `import { generateStableUID } from "./uid-generator"` and used at line 137 |
| `ics-builder.ts` | `calendar-grid.ts` | `import CalendarGrid, CalendarSlotData` | WIRED | Line 21-23: types imported, used in `buildCalendarEventsFromGrid` signature and loop at line 332 |
| `calendar-export.ts` | `ics-builder.ts` | `import { buildICS }` | WIRED | Line 9: `import { buildICS } from "@/lib/calendar/ics-builder"` and called at line 17 |
| `ics-builder.ts` | `timezones-ical-library` | `import { tzlib_get_ical_block }` | WIRED | Line 19: imported, called at line 117 in VTIMEZONE generation. Dependency in package.json confirmed. |
| `POST /api/cal` | `redis.ts` | `cacheSet` with `calendar_plans` TTL | WIRED | Line 3: imports `cacheSet, isCacheAvailable, CACHE_TTLS`. Used at line 60. Redis confirms `calendar_plans: 365 * 24 * 60 * 60`. |
| `GET /api/cal/[token]` | `ics-builder.ts` | `import { buildICS, buildCalendarEventsFromGrid }` | WIRED | Line 3: both imported. `buildCalendarEventsFromGrid` called at line 53, `buildICS` called at line 63. |
| `GET /api/cal/[token]` | `calendar-grid.ts` | `import { buildCalendarGrid }` | WIRED | Line 5: imported, called at line 52 in the year loop. |
| `SubscribeCalendar.tsx` | `POST /api/cal` | `fetch("/api/cal", { method: "POST" })` | WIRED | Line 46 (handleSubscribe) and line 82 (handleRegenerate). Response parsed and stored in state. |
| `ResultsShell.tsx` | `SubscribeCalendar.tsx` | `import { SubscribeCalendar }` | WIRED | Line 11: imported. Line 141: `<SubscribeCalendar assessment={assessment} />` rendered. |
| `ics-builder.ts` | `STATES_MAP` / `SPECIES_MAP` | imports for rich descriptions | WIRED | Lines 24-26: imports `STATES_MAP`, `SPECIES_MAP`, `State`. Used in `buildRichDescription` for portal URLs, license fees, species names. |

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| ICS-01: buildICS() isomorphic module | SATISFIED | `ics-builder.ts` has zero DOM dependencies; grep confirms no Blob/document/URL.create/window imports. Used by both `calendar-export.ts` (browser) and `GET /api/cal/[token]` (server). |
| ICS-02: GET /api/cal/[token] serves dynamic ICS | SATISFIED | Route exists, retrieves Redis snapshot, calls `buildICS`, returns `text/calendar`. |
| ICS-03: webcal:// URL for native calendar | SATISFIED | `POST /api/cal` generates webcalURL via `httpURL.replace(/^https?:/, "webcal:")`. SubscribeCalendar opens it with `window.open(url, "_self")`. |
| ICS-04: Stable content-derived UIDs | SATISFIED | `uid-generator.ts` uses SHA-256 with deterministic JSON.stringify. Same inputs produce same UID. Different inputs (state, species, type, date) produce different UIDs. |
| ICS-05: Server-side only via Redis snapshot | SATISFIED | `POST /api/cal` stores entire assessment in Redis. `GET /api/cal/[token]` reads from Redis only. No Zustand or browser state involved. |
| ICS-06: VTIMEZONE via timezones-ical-library | SATISFIED | `ics-builder.ts` line 117 calls `tzlib_get_ical_block(tz)`. State timezones mapped from `STATES_MAP.deadlineTimezone` (15 occurrences in states.ts). |
| ICS-07: METHOD:PUBLISH in VCALENDAR | SATISFIED | Line 104 of ics-builder.ts: `"METHOD:PUBLISH"` in header lines. |
| ICS-08: Token regeneration without invalidation | SATISFIED | `handleRegenerate()` in SubscribeCalendar creates a new POST (new token, new Redis entry). Old token is never deleted -- serves until 365d TTL. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none in Phase 4 files) | - | - | - | - |

No TODOs, FIXMEs, placeholders, empty implementations, or console.log-only handlers found in any Phase 4 artifacts. The only TODOs in `calendar-grid.ts` (lines 104, 183) relate to Phase 7 scraper integration, which is expected and not a Phase 4 concern.

### Enrichment Verification

The additional enrichment requirement (rich calendar event descriptions) is fully implemented in `buildRichDescription()` at lines 184-295 of `ics-builder.ts`:

| Enrichment Feature | Status | Evidence |
|-------------------|--------|---------|
| F&G portal links | VERIFIED | Lines 201, 211, 241, 284: `slot.url ?? state?.buyPointsUrl ?? state?.fgUrl` with dedicated footer section |
| Cost breakdowns | VERIFIED | Lines 257-258: `$${slot.estimatedCost.toLocaleString()}` in DETAILS section |
| Unit codes | VERIFIED | Lines 203, 228, 235, 253-254: unitCode shown in action steps and DETAILS |
| License reminders | VERIFIED | Lines 265-280: LICENSE REMINDER section with qualifying license and habitat stamp fees |
| Step-by-step instructions | VERIFIED | Lines 198-245: "WHAT TO DO:" section with numbered steps per action type (application, point_purchase, hunt, scout) |
| Species name (human-readable) | VERIFIED | Line 191: `SPECIES_MAP[slot.speciesId]?.name` used throughout description |

### Build Verification

- `npx tsc --noEmit`: Clean (zero errors)
- All 4 existing consumers of `calendar-export.ts` compile without changes:
  - `src/app/(app)/deadlines/page.tsx` -- imports `exportDeadline`
  - `src/components/planner/YearCalendar.tsx` -- imports `exportPlanItem`
  - `src/components/roadmap/RoadmapTimeline.tsx` -- imports `exportDeadline`
  - `src/components/roadmap/MoveCard.tsx` -- imports `exportDeadline`

### Human Verification Required

### 1. Subscribe to Calendar End-to-End Flow

**Test:** Complete a consultation to see results. Verify "Subscribe to Calendar" button appears in the action bar. Click it and confirm the expanded panel appears with "Open in Calendar", "Copy URL", URL display, expiration date, and "Generate new link" option.
**Expected:** Button transitions idle -> loading (spinner) -> ready (expanded panel). Panel shows the HTTP URL in mono font, expiration date ~365 days from now.
**Why human:** Visual layout, animation transitions, and dark theme styling cannot be verified programmatically.

### 2. webcal:// Protocol Handler

**Test:** Click "Open in Calendar" from the expanded panel.
**Expected:** On macOS, Apple Calendar opens with a subscription prompt. On other platforms, the OS default calendar handler activates.
**Why human:** OS-level protocol handler behavior requires a running application and OS interaction.

### 3. ICS Content Validation

**Test:** Click "Copy URL", open the HTTP URL in a browser tab. Inspect the downloaded .ics file.
**Expected:** File starts with `BEGIN:VCALENDAR`, contains `METHOD:PUBLISH`, has events with UIDs ending in `@odysseyoutdoors.com`, includes VTIMEZONE blocks, and has rich descriptions with "WHAT TO DO:", "DETAILS:", and "LICENSE REMINDER:" sections.
**Why human:** Requires running dev server with Redis (or Redis fallback) to test full API chain.

### 4. Token Regeneration

**Test:** After subscribing, click "Generate new link". Verify new URL appears. Test both old and new URLs in the browser.
**Expected:** New URL has a different token. Both old and new URLs serve valid ICS content.
**Why human:** Requires multiple live API calls and verifying Redis contains both entries.

### 5. Copy to Clipboard

**Test:** Click "Copy URL" button.
**Expected:** Button shows checkmark feedback for 2.5 seconds. Pasting confirms the HTTP URL is in clipboard.
**Why human:** Clipboard API interaction requires browser environment.

### Gaps Summary

No automated gaps found. All 5 success criteria are satisfied at the code level. All 8 ICS requirements (ICS-01 through ICS-08) are implemented. All artifacts exist, are substantive (no stubs), and are properly wired together. The enrichment features (F&G portal links, cost breakdowns, unit codes, license reminders, step-by-step instructions) are fully implemented in `buildRichDescription()`.

The phase requires human verification to confirm the end-to-end flow works in a running browser (webcal:// protocol handler, Redis storage/retrieval, visual layout).

---

_Verified: 2026-02-22_
_Verifier: Claude (gsd-verifier)_
