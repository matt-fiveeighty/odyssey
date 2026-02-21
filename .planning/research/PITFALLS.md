# Pitfalls Research

**Domain:** Autonomous hunting advisor data pipeline (web scraping, API integrations, calendar subscriptions, shareable links, advisor intelligence) added to existing Next.js 16 app
**Researched:** 2026-02-21
**Confidence:** MEDIUM (training data only -- no web search or WebFetch available to verify current API docs; codebase analysis is HIGH confidence)

---

## Critical Pitfalls

### Pitfall 1: State F&G Website Breakage Without Warning

**What goes wrong:**
State Fish & Game websites redesign pages, change PDF URLs, alter table formats, or restructure DOM without any notice. A scraper that worked for 6 months suddenly returns empty data or misparses a critical field (e.g., reading a fee as a date). Government websites have no API contracts, no versioning, no changelogs. This is the single highest-risk element of the entire milestone.

**Why it happens:**
Government web teams operate on different priorities than data consumers. They redesign for accessibility compliance, legislative mandates, or CMS upgrades. They don't know anyone is scraping their data. Each of the 11 states (CO, WY, MT, NV, AZ, UT, NM, OR, ID, KS, AK) has its own web team, CMS, and update schedule. The breakage surface is 11x wider than a single-source integration.

**How to avoid:**
1. **Schema validation at ingest time.** Every scraped value must pass through a `VerifiedDatum<T>` validator that checks type, range, and plausibility before it overwrites existing data. A fee of $50,000 or a deadline in 1970 should be rejected, not ingested.
2. **Never overwrite good data with failed scrape results.** The existing `data-loader.ts` pattern of "DB overrides constants, constants fill gaps" is correct -- extend it so a failed scrape preserves the last-known-good data rather than nulling it out.
3. **Per-state scraper isolation.** Each state scraper must be independent. Oregon failing should not block Colorado from updating. The existing `trigger-scrape` route already accepts a `states` array -- use this pattern.
4. **Structural fingerprinting.** Before parsing, hash the page structure (CSS selectors, table headers, PDF layout markers). If the fingerprint changes, flag the scrape as "structure changed" rather than silently misparsing.
5. **Bi-weekly manual spot-checks** during application season (Jan-May). Automate what you can, but someone should eyeball the numbers quarterly.

**Warning signs:**
- Scraper runs succeed (HTTP 200) but return 0 rows or wildly different row counts
- A state's `lastScrapedAt` stops advancing while others update normally
- Fee values or deadline dates fall outside expected ranges (e.g., $0 tag costs, deadlines in the past)
- The `dataFreshnessScore` in `scraper-status` drops below 40 for individual states

**Phase to address:**
Data pipeline phase (Phase 1) -- this is the foundation. Build the validation layer before building any individual state scraper.

---

### Pitfall 2: PDF Parsing Fragility Across States

**What goes wrong:**
PDF-published draw data (Arizona, Wyoming, Montana) has no standard structure. Tables might be image-based (scanned PDFs), have merged cells, span multiple pages with repeated headers, or use inconsistent column ordering year over year. A PDF parser that works on Arizona's 2025 draw report will silently misparse the 2026 version when they add a column or change pagination.

**Why it happens:**
PDFs are designed for human reading, not data extraction. State agencies produce them from Word, Excel exports, or their own database reports. The output format is an artifact of internal tooling, not a deliberate data format. Each year's report is manually assembled.

**How to avoid:**
1. **Avoid PDF parsing where alternatives exist.** Oregon publishes CSV -- use it. Utah has REST-like endpoints. Colorado's CPW portal has structured HTML tables. Only fall back to PDF when no alternative exists.
2. **For unavoidable PDFs, use `pdf-parse` (npm) for text extraction + custom regex per state.** Do NOT attempt a generic "universal PDF table parser" -- it doesn't exist for this domain.
3. **Output comparison.** When a new scrape completes, diff the result against the previous scrape. Flag any state where more than 20% of values changed -- that likely indicates a parse error, not a legitimate data update.
4. **Arizona-specific:** Their draw PDFs land at predictable S3-like URLs (`https://s3.amazonaws.com/azgfd-portal-wordpress/...`). Cache the URL pattern and alert if it changes.
5. **Manual fallback path.** Build an admin CSV upload endpoint so that when a scraper breaks, a human can paste the correct values from the PDF and unblock the pipeline within minutes rather than waiting for a scraper fix.

**Warning signs:**
- Parser returning `null` for fields that were populated last run
- Success rate values above 100% or below 0% (misaligned columns)
- Species names not matching the canonical 18-species ID list
- Row count dropping significantly (page 2 of a PDF not being parsed)

**Phase to address:**
Data pipeline phase (Phase 1). Start with Oregon (CSV, zero risk) and Utah (REST endpoints, low risk) as proof-of-concept. Defer PDF-heavy states (AZ, WY, MT) until the validation layer is battle-tested.

---

### Pitfall 3: Zustand Persist + Server Data Freshness Collision

**What goes wrong:**
The app stores an entire `StrategicAssessment` in Zustand persist (`hunt-planner-app-v2`). When server-scraped data updates (new fees, new deadlines, corrected draw odds), the client's persisted state still contains stale numbers baked into the assessment at generation time. The user sees their "personalized roadmap" showing last month's tag costs while the marketing page shows this month's correct ones. Worse: if the user re-generates their plan, cost estimates jump by $200 with no explanation.

**Why it happens:**
Zustand persist is a client-side cache that serializes entire objects. The current architecture generates the full assessment client-side using `roadmap-generator.ts`, which snapshots all data at generation time. There's no mechanism to "patch" a persisted assessment when upstream data changes -- only a full regeneration.

**How to avoid:**
1. **Separate static preferences from dynamic data.** The user's consultation answers (steps 1-9) are genuinely user data and should persist. The generated assessment should store references to data (state IDs, species IDs) rather than baked-in values, and resolve current data at render time.
2. **Implement a `dataVersion` comparison.** The existing `dataVersion: "2026.1"` field on states is the right idea. When the app loads, compare the persisted assessment's `dataVersion` against current data. If they differ, show a "Your plan was generated with older data -- regenerate for current numbers" banner rather than silently showing stale data.
3. **Lazy recalculation for display-only values.** Fee totals, tag cost estimates, and flight pricing are pure functions of (user preferences + current data). Don't persist computed values -- persist the inputs and recompute on render.
4. **Persist key bump strategy.** When data schema changes (new fields on `VerifiedDatum<T>`), bump the persist key version. The app already does this (v4 -> v5 for species ID changes). Plan for v6 when `VerifiedDatum` wrapping lands.

**Warning signs:**
- User complaints about "my plan says X but the state detail page says Y"
- Regenerated plans producing materially different cost estimates than the persisted version
- `dataVersion` in persisted state not matching `dataVersion` in current constants/DB

**Phase to address:**
Data provenance phase (Phase 2, after pipeline). The `VerifiedDatum<T>` wrapper design must account for this from day one. Also relevant when building the "since your last visit" diff view.

---

### Pitfall 4: Amadeus API Free Tier Exhaustion Mid-Month

**What goes wrong:**
The Amadeus Self-Service API free tier allows approximately 2,000 calls per month (based on training data -- LOW confidence on exact number, verify against current docs). With 11 states x multiple airport pairs x seasonal lookups, a single full-refresh could consume 50-100+ calls. If the app makes live calls per user session (e.g., "what does a flight to Bozeman cost in September?"), 20-30 active users could burn through the monthly quota in the first week.

**Why it happens:**
Developers build the happy path first: "Call the API, show the price." Rate limiting and caching are afterthoughts. The free tier has hard monthly caps (not throttled-but-still-working), so exceeding it means complete loss of flight pricing until the next billing cycle.

**How to avoid:**
1. **Batch-scrape flight estimates on a schedule (weekly cron), not per-request.** Pre-compute flight costs for all 11 states x 3-4 origin hubs x 2 seasons. Store results in JSON/KV. Serve cached data to users. The existing `flight-hubs.ts` already has airport-to-airport route data -- extend this with cached prices.
2. **Budget the API quota explicitly.** 2,000 calls / month = ~66 calls/day. With 11 states and 20-30 route pairs, one weekly refresh uses ~100-150 calls. That leaves headroom for 4 refreshes/month with buffer.
3. **Graceful degradation.** When quota is exhausted, fall back to the current static estimates ($180 average) with a badge: "Estimated -- live pricing unavailable until [date]." Never let API exhaustion break the UX.
4. **Cache responses aggressively.** Flight prices don't change minute-to-minute for planning purposes. A 7-day cache is perfectly acceptable for "what does it cost to fly to Bozeman in September?"
5. **Monitor usage.** Log every API call with timestamp. Alert at 75% quota consumption.

**Warning signs:**
- Amadeus returning 429 or 403 responses
- Flight pricing suddenly showing "$0" or "unavailable" for all routes
- API call count exceeding 500 in a single week

**Phase to address:**
API integration phase (Phase 2 or 3). Design the caching layer first, then connect the API. Never build the live-call path without the cache.

---

### Pitfall 5: .ics Calendar Subscription vs. Download Confusion

**What goes wrong:**
The current `calendar-export.ts` generates individual `.ics` files for browser download. A calendar *subscription* (webcal:// URL) is fundamentally different: the client polls a URL periodically and the server must return a complete, current calendar every time. If this distinction is unclear, you build one when you need the other, or worse, build a download that claims to be a subscription.

Key failure mode: the subscription endpoint returns stale events because it reads from cached/persisted data rather than recomputing from current deadlines. Or it returns duplicate events because UIDs aren't stable across regenerations.

**Why it happens:**
Both use .ics format and look identical in the raw file. The difference is architectural: downloads are one-shot, subscriptions are polled. Google Calendar refreshes subscriptions every 12-24 hours and does NOT respect `Cache-Control` headers. Apple Calendar checks every 15 minutes to weekly depending on settings. If your UIDs change between requests, every event gets duplicated.

**How to avoid:**
1. **Stable, deterministic UIDs.** The current `uid()` function uses `Date.now()` + random -- this will generate new UIDs on every request, causing event duplication. For subscriptions, UIDs must be derived from the event identity: `{stateId}-{speciesId}-{deadline_type}-{year}@odysseyoutdoors.com`. Same event = same UID = no duplicates.
2. **Serve from a dedicated API route** (`/api/calendar/[token].ics`), not a client-side blob download. The route must return `Content-Type: text/calendar; charset=utf-8` with proper `Cache-Control` headers.
3. **Include VTIMEZONE components** for deadline timezones. The existing code uses `VALUE=DATE` (all-day events), which avoids timezone issues for deadlines, but season dates with specific times need timezone handling.
4. **Return the FULL calendar on every request.** Subscriptions don't do incremental updates. Every poll returns the complete set of events. Google Calendar diffs internally.
5. **Use `webcal://` protocol prefix** in the subscription URL. This tells the OS to add it as a subscription, not download it as a file.
6. **Add `REFRESH-INTERVAL;VALUE=DURATION:P1D` to the VCALENDAR** to hint at daily refresh (though clients may ignore this).

**Warning signs:**
- Users reporting duplicate events in Google Calendar
- Events not updating when deadlines change
- Calendar showing stale data from a plan that was regenerated
- `METHOD:PUBLISH` vs `METHOD:REQUEST` confusion (subscriptions use PUBLISH)

**Phase to address:**
Calendar subscription phase (Phase 3 or 4). The current download infrastructure is fine to keep -- add the subscription endpoint alongside it, not as a replacement.

---

### Pitfall 6: Shareable URL Token Security Theater

**What goes wrong:**
Shareable plan URLs with "no auth" still need security thinking. Common failures: tokens that are sequential (enumerable), tokens that encode user data in a predictable way (base64 plan IDs), tokens with no expiry that live forever, or tokens that give write access when they should be read-only.

The existing `guest-token.ts` uses JWT with `jose`, HS256 signing, and 24-hour expiry. If share tokens follow the same pattern, a 24-hour expiry means shared links stop working the next day -- terrible UX for "share your plan with your hunting buddy."

**Why it happens:**
"No auth" gets interpreted as "no security." But shareable URLs are a form of capability-based security -- the token IS the authorization. Getting the security model wrong means either links that break (too restrictive) or plans that leak (too permissive).

**How to avoid:**
1. **Use cryptographically random opaque tokens, not JWTs, for share links.** A `crypto.randomUUID()` or `crypto.randomBytes(16).toString('hex')` mapped to a stored plan snapshot is simpler and more appropriate than JWTs. Share tokens don't need to carry claims -- they're just lookup keys.
2. **Separate token lifetimes by purpose.** Guest session tokens (24h) are correct. Share link tokens should be long-lived (1 year or indefinite) because they're shared via text/email and opened weeks later.
3. **Share links serve SNAPSHOTS, not live data.** When a user creates a share link, serialize the current plan state and store it. The recipient sees that snapshot. If the owner regenerates their plan, the old share link still shows the version that was shared. This prevents confusing the recipient and also prevents the share link from leaking ongoing plan changes.
4. **Token space matters.** UUID v4 has 122 bits of entropy -- essentially unguessable. Sequential IDs or short tokens (6 chars) can be enumerated. Use UUIDs.
5. **Storage: Vercel KV or a static JSON file per token.** With no database, store plan snapshots as JSON blobs keyed by token. Vercel KV (Redis-compatible) is ideal for this -- you already have Upstash Redis in `rate-limit.ts`.

**Warning signs:**
- Share links returning 404 after a short period
- Users sharing links that expose live/mutable plan state
- Token collisions (astronomically unlikely with UUIDs, but a sign of bad generation if it happens)
- Share links including plan data in the URL itself (too long, breaks in SMS/email, data leaks in server logs)

**Phase to address:**
Shareable links phase (Phase 4). Can be built independently of the data pipeline. Use the existing Upstash Redis infrastructure from `rate-limit.ts`.

---

### Pitfall 7: Replacing Hardcoded Constants Without a Fallback Chain

**What goes wrong:**
The current app works 100% offline -- all data is in TypeScript constants. When you add dynamic data sources (scrapers, APIs), the temptation is to replace constants entirely. Then when the scraper fails, the API is down, or Vercel KV is unreachable, the entire app shows empty data or crashes.

The existing `data-loader.ts` already demonstrates this: "Silently falls back to hardcoded constants on any error." But as more systems layer on (flights from Amadeus, inflation from BLS, draw odds from scrapers), each layer needs its own fallback chain, and the fallback data must stay maintained.

**Why it happens:**
"We have the scraper now, so we can delete the constants" feels like cleanup. It's actually removing your safety net. Constants also drift from reality if nobody updates them, creating a different problem: the fallback shows 2024 fees when the scraper fails in 2026.

**How to avoid:**
1. **Three-tier data resolution.** `Live scrape > Cached scrape (last-known-good) > Hardcoded constants`. Never skip from live scrape directly to "no data."
2. **Constants become the floor, not the ceiling.** Keep `states.ts` and `sample-units.ts` updated annually (during the off-season) as the last-resort fallback. Tag them with `dataVersion` so the UI can show "data from: hardcoded 2026.1" vs "data from: scraped Feb 20, 2026."
3. **The `VerifiedDatum<T>` wrapper must include a `source` field.** `{ value: 825.03, source: 'scraped', scrapedAt: '2026-02-20', sourceUrl: '...' }` vs `{ value: 800, source: 'hardcoded', notes: 'estimated' }`. This is already conceptualized in PROJECT.md -- execute it rigorously.
4. **Automated tests that verify fallback behavior.** Mock every external dependency as failing and assert the app still renders with reasonable data. This is more important than testing the happy path.

**Warning signs:**
- Any page rendering with empty/null data where constants previously showed values
- Constants files not being updated for a full year
- `isUsingConstants: true` in `DataStatus` for extended periods with no alerts

**Phase to address:**
Data pipeline phase (Phase 1). The fallback chain architecture must be the FIRST thing built, before any scraper goes live. The existing `data-loader.ts` pattern is the right starting point -- extend it, don't replace it.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoding scraper selectors in scraper files | Fast initial development | Every site change requires a code change and deploy | Always (for 11 states, externalized config adds complexity without benefit) |
| Storing plan snapshots as JSON in Vercel KV | No database needed | KV has size limits (~256KB per value); large plans with full assessment might exceed this | Acceptable for MVP; compress with gzip or split into chunks if size becomes an issue |
| Using Zustand persist for dynamic data | No server roundtrip needed | Stale data, version conflicts, storage quota issues | Never for scraped data (only for user preferences). Use server-fetched data with SWR/React Query patterns. |
| Caching Amadeus responses for 7 days | Stays within free tier limits | Flight prices shown could be 7 days stale | Always acceptable for planning-horizon estimates |
| Single-file constants for fallback data | Easy to maintain, easy to diff | 1,000+ line files get unwieldy | Acceptable indefinitely for 11 states; split only if expanding to 50+ |
| Running scrapers in GitHub Actions | Free compute, no Vercel function limits | 10-minute Action timeout; debugging is harder than local | Acceptable -- the current architecture already does this |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Amadeus Flight API | Making live API calls per user request | Pre-compute and cache flight prices weekly. Serve from KV/JSON. Never call Amadeus in a user-facing request path. |
| Amadeus Flight API | Using production environment for testing | Use the Amadeus test environment (returns synthetic data) during development. Only switch to production for the weekly batch job. |
| BLS Inflation API | Calling the API on every page load to get CPI data | BLS data updates monthly. Fetch once per month via cron, cache the result. CPI data is inherently backward-looking -- freshness is irrelevant below monthly. |
| BLS Inflation API | Not registering for an API key | Unregistered access has lower rate limits (25 queries per 10 seconds vs. 500/day registered). Registration is free and instant. |
| State F&G Websites | Scraping during peak hours (business hours MT) | Schedule scrapes for 2-4 AM MT. Government servers are less loaded, and you're less likely to trigger rate limiting. |
| State F&G Websites | Not identifying your User-Agent | Use a descriptive User-Agent (`OdysseyOutdoors/1.0 (hunt planning; contact@odysseyoutdoors.com)`) so state webmasters can contact you instead of blocking you. |
| Vercel KV (Upstash Redis) | Storing large JSON blobs without compression | Plan snapshots with full assessment data can be 50-100KB. With hundreds of shared plans, this adds up. Use `JSON.stringify` + `zlib.gzip` before storage. |
| Google Calendar Subscriptions | Assuming Google refreshes immediately when data changes | Google Calendar refreshes subscriptions every 12-24 hours at its own pace. There is no way to force a refresh. Design accordingly -- users will see yesterday's changes. |
| GitHub Actions (Scrapers) | Not handling partial failures in multi-state runs | If CO scraper fails but WY succeeds, the Action should not exit 1. Report per-state status. The existing `trigger-scrape` route already passes state arrays -- process each independently. |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Fetching all 11 states' scraped data on every page load | Slow initial render, unnecessary network calls | Load data lazily by state. Only fetch detailed unit data for states the user has in their plan. Use the existing 5-minute cache in `data-loader.ts`. | >50 concurrent users (Supabase free tier connection limits) |
| Generating .ics subscription calendar server-side on every poll | High serverless function invocations if many users subscribe | Cache the generated .ics content with a 1-hour TTL in Vercel KV. Invalidate only when underlying data changes. | >100 calendar subscribers polling every 15 min = 9,600 requests/day |
| Storing full plan snapshots in URL query parameters | URLs exceeding 2,000 characters break in email clients, SMS, and some browsers | Use opaque tokens (UUIDs) in URLs that reference server-stored snapshots. Never put plan data in the URL itself. | Immediately -- a full assessment is 50KB+ |
| Running all 11 state scrapers in a single GitHub Action job | 10-minute timeout hit; one state's failure blocks all others | Parallelize with a matrix strategy (one job per state) or sequential with independent error handling. Each state scraper should take <60 seconds. | When adding more complex scrapers (PDF parsing) |
| Re-rendering the entire dashboard when any scraped data updates | Jank, unnecessary recomputation of portfolio health | Memoize expensive computations (`useMemo` for scoring, `React.memo` for sub-components). The existing engine functions are pure -- wrap their results in memoization at the component level. | >10 data fields updating simultaneously |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing Amadeus API key in client-side code | Key theft, quota exhaustion by bad actors | All Amadeus calls must go through server-side API routes. Never put the key in `NEXT_PUBLIC_*` env vars. The batch cron job runs server-side -- correct. |
| Share link tokens that encode plan data (JWT with plan payload) | Plan data visible to anyone who decodes the JWT (base64, not encrypted) | Use opaque tokens that map to server-stored snapshots. JWTs are signed but NOT encrypted -- anyone can read the payload. |
| Admin scraper endpoints without rate limiting | DDoS via repeated scraper triggers burning GitHub Actions minutes | The existing `x-admin-key` auth is good. Add rate limiting (1 trigger per 10 minutes) using the existing `rate-limit.ts` infrastructure. |
| Calendar subscription URLs that are guessable | Anyone can subscribe to someone else's calendar if tokens are sequential | Use UUID v4 tokens (122 bits of entropy). Embed no user-identifying information in the token. |
| Storing plan snapshots without size limits | Storage exhaustion attack -- someone generates thousands of share links | Limit share links per plan to 5. Expire snapshots after 1 year. Set a max snapshot size (500KB). |
| Scraping robots.txt-disallowed paths | Legal risk, IP blocking | Parse robots.txt before scraping each state. All 11 states publish public data, but respect any specific `Disallow` directives. Log compliance. |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing "data unavailable" when a scraper fails | User thinks the app is broken, loses trust in all data | Show last-known-good data with a "Last verified: [date]" badge. Only show "unavailable" if there has NEVER been a successful scrape for that field. |
| Calendar subscription adding dozens of events at once | User's calendar becomes cluttered, they unsubscribe immediately | Start with high-signal events only: application deadlines, draw result dates. Let users opt into season dates, scouting reminders, etc. Default to fewer events. |
| "Since your last visit" diff showing every scraped data change | Overwhelming -- "tag cost changed by $0.50" is noise, not signal | Filter diffs by materiality. Only surface changes that affect the user's plan: their states, their species, changes > $25 or > 5 days for deadlines. |
| Share link recipient seeing a plan they can't interact with | "This looks cool but I can't make my own" -- lost conversion | Include a clear CTA on shared plans: "Build your own plan" that starts the consultation wizard with pre-filled species from the shared plan. |
| Advisor recommendations that contradict the user's own plan | "The advisor says do X but my plan says do Y" -- confusing | Advisor voice should comment on the user's plan, not suggest an entirely different one. "Your CO elk timeline is aggressive -- consider..." not "You should hunt WY instead." |
| Flight pricing showing as "$0" when Amadeus quota is exhausted | Looks like a bug, not a data limitation | Show "~$180 est." (the current static fallback) with a tooltip: "Live pricing temporarily unavailable." Never show $0 for a flight. |

## "Looks Done But Isn't" Checklist

- [ ] **Calendar subscription:** Often missing stable UIDs -- verify same event produces same UID across requests (test by subscribing in Google Calendar, regenerating the plan, and checking for duplicates after 24h)
- [ ] **Calendar subscription:** Often missing VTIMEZONE -- verify all-day events render on the correct day in all US timezones (test in EST -- a Mountain Time deadline should not shift a day)
- [ ] **Share links:** Often missing snapshot immutability -- verify that regenerating the owner's plan does NOT change what the share link recipient sees
- [ ] **Share links:** Often missing error handling for expired/deleted snapshots -- verify a cleaned-up token returns a friendly "this plan is no longer available" page, not a 500
- [ ] **Scraper data:** Often missing validation on ingested values -- verify that a scraper returning `null` for tag costs does not overwrite existing known-good values with null
- [ ] **Scraper data:** Often missing timezone handling in deadline dates -- verify "April 7, 2026" is stored as "2026-04-07" regardless of the scraper's execution timezone
- [ ] **Amadeus integration:** Often missing test-vs-production environment switching -- verify dev builds use test credentials and prod builds use production credentials
- [ ] **BLS integration:** Often missing "no data yet for current month" handling -- verify the app gracefully uses last month's CPI when the current month isn't published yet (BLS publishes CPI ~2 weeks after month end)
- [ ] **Advisor recommendations:** Often missing "why" explanations -- verify every recommendation includes the data point that triggered it, not just the conclusion
- [ ] **Data provenance:** Often missing on computed values -- verify that a "10-year cost estimate" shows which inputs are scraped vs. estimated, not just a final number

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| State website restructure breaks scraper | LOW | 1. Alerts fire on failed scrape. 2. Fallback to last-known-good data (automatic). 3. Fix scraper selectors (1-2 hours per state). 4. Re-run scrape. No user impact if fallback chain works. |
| Amadeus quota exhausted mid-month | LOW | 1. Automatic fallback to cached/static estimates. 2. Wait for quota reset (month boundary). 3. Reduce refresh frequency if recurring. No user impact if cache exists. |
| Zustand persist version conflict after data schema change | MEDIUM | 1. Bump persist key (v5 -> v6). 2. Users lose their persisted wizard state but retain the ability to regenerate. 3. Add migration function in Zustand `migrate` option to transform old shapes. Existing pattern from v4 -> v5 migration. |
| Share link storage exceeds KV limits | MEDIUM | 1. Implement snapshot compression (gzip JSON). 2. Purge snapshots older than 1 year. 3. If still constrained, move to Vercel Blob Storage for larger payloads. Requires data migration but no user-facing changes. |
| Calendar subscription generating duplicate events | LOW | 1. Fix UID generation to be deterministic. 2. Users may need to unsubscribe and resubscribe once to clear duplicates. 3. Google Calendar deduplication is imperfect -- provide instructions for clearing stale subscriptions. |
| Scraper ingesting incorrect data (wrong column parsed) | HIGH | 1. Data validation rejects implausible values (first line of defense). 2. If bad data made it through, revert to last-known-good via data version rollback. 3. Identify all downstream computations affected (assessments, cost estimates). 4. Users with affected plans see a banner: "Data correction applied -- regenerate for updated numbers." |
| PDF format changes breaking parser | MEDIUM | 1. Automatic fallback to cached data. 2. Manual CSV upload endpoint allows admin to paste correct values immediately. 3. Fix parser (2-4 hours per state for complex PDFs). 4. Consider adding the state to the "manual update" list if PDFs change yearly. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| State F&G website breakage | Phase 1 (Data Pipeline) | Simulate a scraper failure for each state and verify fallback chain delivers last-known-good data |
| PDF parsing fragility | Phase 1 (Data Pipeline) | Run each PDF scraper against last year's AND this year's documents; compare outputs |
| Zustand + server data freshness collision | Phase 2 (Data Provenance) | Persist a plan, update scraped data, reload app, verify stale data banner appears |
| Amadeus API quota exhaustion | Phase 2-3 (API Integration) | Set a mock quota of 10 calls, exceed it, verify graceful fallback to static estimates |
| .ics subscription vs download confusion | Phase 3-4 (Calendar) | Subscribe in Google Calendar, wait 24h, verify no duplicate events and data updates propagate |
| Share URL token security | Phase 4 (Shareable Links) | Generate 1,000 share tokens, verify zero collisions and no sequential patterns |
| Hardcoded constants replacement without fallback | Phase 1 (Data Pipeline) | Disable all external data sources (env vars unset), verify the entire app renders with constants |
| Advisor recommendations contradicting user plan | Phase 5 (Advisor Intelligence) | Generate recommendations for 10 different plan profiles; verify none suggest abandoning the user's chosen strategy |
| Scraper ingesting incorrect data | Phase 1 (Data Pipeline) | Feed each validator with edge cases: $0 fees, dates in 2019, negative success rates, empty strings |
| Google Calendar refresh delay | Phase 3-4 (Calendar) | Document the 12-24h refresh delay in user-facing copy; do not promise "real-time calendar updates" |

## Sources

- Codebase analysis: `src/lib/calendar-export.ts` (current UID generation pattern), `src/lib/data-loader.ts` (fallback chain pattern), `src/lib/guest-token.ts` (JWT token pattern), `src/lib/rate-limit.ts` (Upstash Redis infrastructure), `src/app/api/cron/scrape/route.ts` (GitHub Actions trigger pattern), `src/app/api/admin/scraper-status/route.ts` (freshness scoring)
- `.planning/PROJECT.md` (milestone requirements, constraints, key decisions)
- RFC 5545 (iCalendar specification) -- training data, MEDIUM confidence on UID/VTIMEZONE behavior
- Amadeus Self-Service API documentation -- training data, LOW confidence on exact free tier limits (verify against current docs)
- BLS API documentation -- training data, MEDIUM confidence on rate limits (500/day registered, 25/10sec unregistered)
- Government web scraping best practices -- training data, HIGH confidence on structural patterns (government websites changing without notice is a well-documented, universal problem)

---
*Pitfalls research for: Autonomous hunting advisor data pipeline*
*Researched: 2026-02-21*
*Note: WebSearch and WebFetch were unavailable during research. Amadeus and BLS API specifics should be verified against current documentation before implementation.*
