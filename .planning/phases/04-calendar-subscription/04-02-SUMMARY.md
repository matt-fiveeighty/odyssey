---
phase: 04-calendar-subscription
plan: 02
status: complete
commit: f8ca712
---

## What Was Built

### POST /api/cal — Subscription Token Creation
- Rate limiting via `limiters.guest()` with x-forwarded-for identifier
- Cache availability check (503 if Redis unavailable)
- Request validation (assessment + assessment.id required)
- Token generation via `crypto.randomUUID()`
- Stores `{ assessment, createdAt }` in Redis with `calendar_plans` TTL (365 days)
- Returns `{ webcalURL, httpURL, token, expiresAt }`
- webcalURL derived from httpURL via `replace(/^https?:/, "webcal:")`

### GET /api/cal/[token] — Dynamic ICS Feed
- Retrieves assessment snapshot from Redis by token
- Builds calendar events for ALL roadmap years (not just one)
- State timezone map built from STATES_MAP.deadlineTimezone
- ICS generated via `buildICS()` with VTIMEZONE support
- Returns `text/calendar` with 1h Cache-Control, Content-Disposition attachment

### SubscribeCalendar.tsx — Client Component
- 4 states: idle → loading → ready → error
- Idle: "Subscribe to Calendar" button
- Ready: expanded panel with "Open in Calendar" (webcal://), "Copy URL", URL display, expiration date
- Token regeneration via "Generate new link" — creates new token, old continues serving
- Clipboard copy with navigator.clipboard + textarea fallback
- webcal:// opens via `window.open(url, "_self")`

### Integration
- ResultsShell.tsx: SubscribeCalendar added between PlanExport and ShareButton
- middleware.ts: `api/cal` added to negative lookahead for public access

## Must-Haves Verified
- [x] POST /api/cal stores snapshot in Redis with 365d TTL, returns token + URLs
- [x] GET /api/cal/[token] generates ICS dynamically via buildICS
- [x] webcal:// URL opens native calendar app
- [x] Token regeneration creates new snapshot without invalidating old (ICS-08)
- [x] Server-side only — independent of browser state (ICS-05)
- [x] Middleware excludes /api/cal from auth
- [x] Subscribe button in results with copy-URL and open-in-calendar options

## Build Status
- `npx tsc --noEmit` — clean
- `npm run build` — clean, both routes registered as dynamic
