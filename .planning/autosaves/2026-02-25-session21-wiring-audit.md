# ODYSSEY OUTDOORS — END-TO-END WIRING AUDIT
## Session 21 | 2026-02-25

---

## INFRASTRUCTURE INVENTORY (What Actually Exists)

| Layer | Technology | Status |
|-------|-----------|--------|
| **Database** | Supabase (SQL + Auth + SSR) | LIVE |
| **Cache** | Upstash Redis (flight prices 6h, CPI 30d, shares 90d) | LIVE |
| **Auth** | Supabase Auth (email + guest sessions) | LIVE |
| **Payments** | Stripe (checkout + portal + webhook) | LIVE |
| **Cron** | Vercel Cron (3 jobs: scrape, warm-flights, refresh-cpi) | LIVE |
| **Error Tracking** | Sentry (@sentry/nextjs) | LIVE |
| **LLM** | Anthropic SDK (explain-unit, goal-summary, plan-narrative, tradeoff) | LIVE |
| **Scraping** | Cheerio + pdf-parse (via GitHub Actions, NOT inline) | LIVE |
| **State Mgmt** | Zustand × 3 stores (wizard-v6, app-v2, roadmap-v1) | LIVE |
| **API Routes** | 33 routes (auth, admin, cron, data, LLM, payments, units) | LIVE |
| **Pages** | 29 routes (18 app, 8 marketing, 4 auth, 2 shared) | LIVE |

### DB Access Layer (src/lib/db/)
- `planner.ts` — Year plans + plan items
- `units.ts` — Hunting units
- `states.ts` — State data
- `budget.ts` — Budget tracking
- `groups.ts` — Group management
- Tables confirmed: `subscriptions`, `year_plans`, `plan_items`

---

## THE WIRING MATRIX

### PILLAR 1: Crawler & Data Airlock Pipeline

| Component | Logic Status | Wiring Status | Verdict |
|-----------|-------------|---------------|---------|
| `runCrawlPipeline()` | 38 tests passing | **NOT called from any API route or component** | **DISCONNECTED** |
| `validateDOMStructure()` | Tested in pipeline-audit | **NOT called from any API route** | **DISCONNECTED** |
| `validateSanityConstraints()` | NaN guard hardened | **NOT called from any API route** | **DISCONNECTED** |
| `checkAnomaly()` (z-score) | Tested | **NOT called from production code** | **DISCONNECTED** |
| Quarantine Dashboard | N/A | **Does not exist in UI** | **DISCONNECTED** |
| `/api/cron/scrape` | Vercel cron runs Sundays 6 AM | Dispatches to **GitHub Actions** (`scrape-draw-data.yml`), NOT our pipeline functions | **PARTIALLY WIRED** |
| LKG Snapshots | In-memory registry | **No DB persistence** | **DISCONNECTED** |
| P1 Alerts | In-memory log | **No Slack/email delivery, no DB** | **DISCONNECTED** |

**Bottom Line**: The crawler math is flawless (38 tests), but it runs in a vacuum. The actual scraping happens via a GitHub Actions workflow that is completely separate from our `crawler-resilience.ts` pipeline. There is no Quarantine Dashboard. There is no "Approve" button. The scraper writes data somewhere (likely Supabase via the GH Action script), but our DOM validator, sanity constraints, and anomaly detector are not in that flow.

**What's Needed**:
- Wire `runCrawlPipeline()` into the `/api/cron/scrape` route (or the GH Action post-processing)
- Create a `/api/admin/quarantine` endpoint for viewing/approving quarantined data
- Build a `/admin/quarantine` page with Approve/Reject UI
- Persist LKG snapshots and P1 alerts to Supabase
- Wire P1 alerts to Slack webhook

---

### PILLAR 2: Conflict & Alert Engine

| Component | Logic Status | Wiring Status | Verdict |
|-----------|-------------|---------------|---------|
| `generateContextualAlerts()` | Tested | **WIRED to ContextualAlerts.tsx** via useMemo | **WIRED** |
| `detectMissedDeadlines()` | Tested | **WIRED to roadmap/page.tsx + rebalance/page.tsx** | **WIRED** |
| `detectSuccessDisaster()` | Tested | **WIRED to rebalance/page.tsx** | **WIRED** |
| `dispatchDrawOutcome()` | Tested | **NOT called from any UI component** (designed for store) | **DISCONNECTED** |
| `dispatchBudgetChange()` | Tested | **NOT called from any UI component** | **DISCONNECTED** |
| `dispatchProfileChange()` | Tested | Called by `setAnchorField` in store (triggers on weaponType/partySize/physicalHorizon changes) | **WIRED** (store-level) |
| `setDrawOutcomeCascade()` | In AppStore | **Store action exists** but no UI triggers it | **PARTIALLY WIRED** |
| Fiduciary Alerts persistence | In AppStore.fiduciaryAlerts | **localStorage only** — survives reload but not device switch | **PARTIALLY WIRED** |
| Budget Overflow → Disable Save | N/A | **Alerts shown as warnings; no hard enforcement (user can proceed)** | **DISCONNECTED** |

**Bottom Line**: The alert *display* layer is solid — contextual alerts, missed deadlines, and success disasters all render in real-time from live engine output. But the *mutation* layer (draw outcomes, budget changes, cascading reactions) is store-ready but has no UI triggers. A user can't click "I drew my tag!" and have the system cascade through point resets, budget reflows, and schedule conflicts.

**What's Needed**:
- Draw Outcome UI: Button in goals/milestones to mark "Drew!" or "Missed" → triggers `setDrawOutcomeCascade`
- Budget Change UI: When user edits budget in settings, trigger `dispatchBudgetChange` → cascade alerts
- Hard enforcement toggle: Option to block saves when budget overflows (vs. warning-only)
- Persist fiduciary alerts to Supabase (not just localStorage)

---

### PILLAR 3: Life Disruption / Cascading Prune

| Component | Logic Status | Wiring Status | Verdict |
|-----------|-------------|---------------|---------|
| `cascadingPrune()` | 8 tests passing | **NOT called from any UI component** | **DISCONNECTED** |
| `detectLiquidityBottleneck()` | 8 tests passing | **NOT called from any UI component** | **DISCONNECTED** |
| `detectInactivityPurges()` | 8 tests passing | **NOT called from any UI component** | **DISCONNECTED** |
| `computePostDrawReset()` | 18 tests passing | **NOT called from any UI component** | **DISCONNECTED** |
| "Life Event" button | N/A | **Does not exist in UI** | **DISCONNECTED** |
| Plan mutation (drop states) | N/A | **Prune returns recommendations but doesn't mutate the assessment** | **DISCONNECTED** |

**Bottom Line**: The entire fiduciary stress-test suite is purely mathematical. There is no "I lost my job" button. There is no "My buddy bailed" button. When `cascadingPrune()` recommends dropping Montana, nothing actually removes Montana from the user's live roadmap. The math exists in a separate universe from the UI.

**What's Needed**:
- Life Event panel in Rebalance page: "Budget changed", "Party member left", "Injury/age concern"
- Wire each event type to the appropriate dispatcher
- Prune confirmation UI: Show what states would be dropped, let user approve
- On approval: mutate the StrategicAssessment in RoadmapStore and re-persist
- Re-run affected capital calculations

---

### PILLAR 4: State Migrations & Grandfathering

| Component | Logic Status | Wiring Status | Verdict |
|-----------|-------------|---------------|---------|
| `migrateState()` (V1→V2) | 10 tests passing | **NOT imported anywhere outside tests** | **DISCONNECTED** |
| `computeEffectivePoints()` | 15 tests passing | **NOT imported anywhere outside tests** | **DISCONNECTED** |
| `enforcePointCap()` | Tested | **NOT imported anywhere outside tests** | **DISCONNECTED** |
| `analyzeTransitionImpact()` | Tested | **NOT imported anywhere outside tests** | **DISCONNECTED** |
| Auth → auto-migrate check | N/A | `migrateAssessmentToRoadmapStore()` runs on auth mount, but that's **RoadmapStore sync**, NOT schema-migration.ts | **NOT THE SAME THING** |
| Zustand persist versioning | wizard-v6, app-v2, roadmap-v1 in key names | **Key bumps = full reset** (no migration path) | **DISCONNECTED** |

**Bottom Line**: The schema migration system and grandfather clause engine are completely test-only. When we bump from wizard-v5 → v6, users lose all saved state. There is no graceful migration. The grandfather clause (pre-2026 points get legacy treatment) isn't factored into any scoring or display. The `migrateAssessmentToRoadmapStore()` that runs on auth is a one-time AppStore→RoadmapStore sync, NOT the schema-migration.ts system.

**What's Needed**:
- Hook `migrateState()` into Zustand's `migrate` option (persist middleware supports version + migrate function)
- Wire `computeEffectivePoints()` into the roadmap-generator scoring pipeline (replace raw point counts)
- Add version field to persisted state; on hydration, auto-migrate V(n)→V(current)
- Grandfather epoch data needs to feed into `yearsToDrawWithCreep()` calculations

---

### PILLAR 5: Session Autosave / Cloud Persistence

| Component | Logic Status | Wiring Status | Verdict |
|-----------|-------------|---------------|---------|
| Zustand → localStorage | 3 stores, all persisted | **localStorage only** (survives reload, lost on cache clear) | **PARTIALLY WIRED** |
| Points → Supabase | Debounced POST `/api/user/points` | **WIRED** (fire-and-forget sync, local store is source of truth) | **WIRED** |
| Plans → Supabase | N/A | **NOT synced to DB** — `savedPlans` is localStorage only | **DISCONNECTED** |
| Goals → Supabase | N/A | **NOT synced to DB** — `userGoals` is localStorage only | **DISCONNECTED** |
| Milestones → Supabase | N/A | **NOT synced to DB** — lives in localStorage | **DISCONNECTED** |
| Fiduciary Alerts → Supabase | N/A | **NOT synced to DB** | **DISCONNECTED** |
| Assessment → Supabase | N/A | **NOT synced to DB** | **DISCONNECTED** |
| Cross-device sync | N/A | **Does not exist** — phone ≠ laptop | **DISCONNECTED** |
| `.planning/autosaves/` | Dev-only local files | **Not deployed** — Vercel has no persistent filesystem | **N/A (dev tooling)** |

**Bottom Line**: Only `userPoints` syncs to the cloud. Everything else — your 10-year strategic plan, your goals, your milestones, your savings goals, your fiduciary alerts — lives in localStorage. If a user clears their browser cache, switches devices, or uses incognito, it's all gone. The Supabase DB exists and has tables (`year_plans`, `plan_items`, `subscriptions`), but the Zustand stores aren't wired to them.

**What's Needed**:
- Sync `savedPlans` to Supabase `year_plans` table (already exists in DB schema)
- Sync `userGoals` and `milestones` to corresponding Supabase tables
- Hydrate stores from DB on auth (like `hydratePointsFromDb()` but for all data)
- Implement conflict resolution (server wins vs. client wins vs. merge)
- Add offline-first queue for mutations when offline

---

### PILLAR 6: The "Endless Loop" (Global State Management)

| Component | Logic Status | Wiring Status | Verdict |
|-----------|-------------|---------------|---------|
| Zustand 3-store architecture | wizard → app → roadmap | **WIRED** — stores reference each other correctly | **WIRED** |
| `setAnchorField` cascade | Triggers fiduciary dispatcher | **WIRED** at store level (weaponType/partySize/physicalHorizon/budget/horizon changes fire dispatchers) | **WIRED** |
| Capital Allocator → Dashboard | computeCapitalSummary, computeBurnRateMatrix, computeStatusTicker | **WIRED** via useMemo in StatusTicker, BurnRateMatrix, KPIStrip | **WIRED** |
| Change Impact → Dashboard | generateContextualAlerts | **WIRED** via useMemo in ContextualAlerts | **WIRED** |
| Settings change → Roadmap re-render | N/A | **NOT WIRED** — assessment is IMMUTABLE once generated | **DISCONNECTED** |
| Physical Horizon change → drop 15yr sheep hunt | N/A | `setAnchorField` fires alerts, but **does NOT re-generate the assessment** | **DISCONNECTED** |
| Tab-to-tab real-time reactivity | N/A | Dashboard reads assessment (immutable). Only milestones/points are live-reactive. | **PARTIALLY WIRED** |

**Bottom Line**: The store architecture is well-designed and the capital allocator layer IS live-wired to the dashboard. But the assessment itself is a frozen snapshot from generation time. If you change your physical horizon from 20 to 5, you get a fiduciary *alert* ("Your sheep hunt may be infeasible"), but the roadmap doesn't physically drop the sheep hunt. You'd need to re-run the wizard to get a new plan. This is the "Endless Loop" gap — the system detects problems but doesn't auto-heal.

**What's Needed**:
- "Quick Rebalance" action: re-run `generateStrategicAssessment()` with updated inputs WITHOUT re-doing the full wizard
- When `setAnchorField` fires and alerts include a `DROP_STATE` recommendation, offer a one-click "Apply Rebalance" button
- Assessment should be mutable via surgical operations (add/remove states, adjust timelines) without full regeneration

---

### PILLAR 7: Multi-Player Database Queries

| Component | Logic Status | Wiring Status | Verdict |
|-----------|-------------|---------------|---------|
| `computeGroupDrawPoints()` | 24 tests passing | **NOT called from any UI component** | **DISCONNECTED** |
| `partySize` in store | Default 1, range 1-6 | **WIRED** — in Step 6, passed to generator | **WIRED** (input only) |
| `friendPlans` in AppStore | Array of FriendPlan objects | **WIRED** — collaborative calendar overlay | **PARTIALLY WIRED** |
| Live DB query for group member points | N/A | **Does not exist** — manual point entry only | **DISCONNECTED** |
| `groups.ts` DB access layer | File exists in src/lib/db/ | **File exists** but group member point lookup not connected to engine | **PARTIALLY WIRED** |
| Anchor drag on party member leaving | `dispatchPartyChange` exists | **NOT called from any UI** | **DISCONNECTED** |

**Bottom Line**: `partySize` is captured in the wizard and fed to the generator, and there's a `groups.ts` DB layer. But when you add "Dave" to your hunt plan, the system does NOT query Dave's live profile. You're manually typing Dave's points. The `computeGroupDrawPoints()` averaging logic isn't connected to the roadmap generator. The "flaky buddy" cascade (Dave leaves → your averaged points drop → deadline at risk) exists in tests but has zero UI surface.

**What's Needed**:
- Party member management UI: Add/remove members with Supabase user lookup
- Wire `computeGroupDrawPoints()` into the scoring pipeline where group apps are relevant (WY, CO)
- When party member is removed, trigger `dispatchPartyChange` → cascade → alert
- DB table for group memberships linking user IDs

---

### PILLAR 8: Fintech Polish (Data Visualization & Physics)

| Component | Logic Status | Wiring Status | Verdict |
|-----------|-------------|---------------|---------|
| StatusTicker (year phase tags) | computeStatusTicker | **WIRED** — live engine output → UI | **WIRED** |
| KPIStrip (sunk/floated) | computeCapitalSummary | **WIRED** — live engine output → UI | **WIRED** |
| BurnRateMatrix | computeBurnRateMatrix | **WIRED** — live engine output → UI | **WIRED** |
| ContextualAlerts | generateContextualAlerts | **WIRED** — live engine output → UI | **WIRED** |
| Monte Carlo confidence band graph | computeMonteCarloOdds | **IMPORTED but NOT CALLED** — inline probability calculation used instead | **PARTIALLY WIRED** |
| `computeTTD()` (Time to Draw) | Tested in point-creep | **NOT called from any component** | **DISCONNECTED** |
| Point Creep charts | `projectPointCreep` imported in PortfolioOverview | **IMPORTED but NOT CALLED** | **DISCONNECTED** |
| Budget "tick up" animation | tw-animate-css in dependencies | **Unknown** — need to verify AnimatedCounter is wired to live data | **NEEDS VERIFICATION** |
| Recharts integration | recharts@3.7.0 in dependencies | **INSTALLED** — used in dashboard charts | **WIRED** |
| Shadcn spring physics | radix-ui@1.4.3 | **Component library installed** | **WIRED** (framework level) |

**Bottom Line**: The 5-row dashboard (StatusTicker → KPIStrip → BurnRateMatrix → ContextualAlerts → ActionTabs) is FULLY WIRED to live engine output. This is the strongest pillar. However, the Monte Carlo visualization is using inline math instead of `computeMonteCarloOdds()`, and `computeTTD()` / `projectPointCreep()` are not feeding any charts. The "fintech glow" and animation layer depends on tw-animate-css + Recharts which are installed.

**What's Needed**:
- Replace inline draw probability with `computeMonteCarloOdds()` for full confidence bands
- Wire `computeTTD()` into a "Time to Draw" sparkline per state
- Wire `projectPointCreep()` into a 10-year point creep projection chart
- Verify AnimatedCounter component exists and ticks on load

---

## EXECUTIVE SUMMARY MATRIX

| # | Pillar | Verdict | Math Tests | UI Wired | DB Wired | Cron Wired |
|---|--------|---------|-----------|----------|----------|------------|
| 1 | Crawler & Data Airlock | **DISCONNECTED** | 38 + 33 | No dashboard | No persistence | GH Actions (separate) |
| 2 | Conflict & Alert Engine | **PARTIALLY WIRED** | 54+ | Alerts display ✅ | localStorage only | N/A |
| 3 | Life Disruption / Prune | **DISCONNECTED** | 56 | No UI trigger | No mutation | N/A |
| 4 | Schema Migration / Grandfather | **DISCONNECTED** | 25 | Not imported | Not hooked | N/A |
| 5 | Cloud Persistence | **PARTIALLY WIRED** | N/A | localStorage ✅ | Points only ✅ | N/A |
| 6 | Endless Loop (State Mgmt) | **PARTIALLY WIRED** | N/A | Dashboard live ✅ | N/A | N/A |
| 7 | Multiplayer / Groups | **DISCONNECTED** | 24 | Manual entry only | groups.ts exists | N/A |
| 8 | Fintech Viz | **MOSTLY WIRED** | N/A | 4/5 dashboard rows ✅ | N/A | N/A |

### Fully Wired (Ship-Ready)
- Dashboard 5-row layout (StatusTicker, KPIStrip, BurnRateMatrix, ContextualAlerts, ActionTabs)
- Points sync to Supabase
- Auth flow (Supabase + guest sessions)
- Stripe payments
- Vercel cron jobs (3 scheduled)
- Sentry error tracking
- LLM integrations (4 endpoints)

### Partially Wired (Alerts Fire But Can't Mutate)
- Fiduciary alert display (shows warnings, can't enforce)
- Store cascades (setAnchorField fires dispatchers, but assessment is frozen)
- Friend plan calendar overlay (imports plans, but no live DB queries)

### Completely Disconnected (Pure Math, No Plumbing)
- Entire `crawler-resilience.ts` pipeline (71 tests, zero production calls)
- Entire `security-protocols.ts` suite (rate limiter, PII audit, injection defense)
- Entire `adaptive-scheduler.ts` suite (frequency routing, backoff, freshness, digest)
- `schema-migration.ts` (V1→V2 migration never runs)
- `grandfather-clause.ts` (timestamped points never used)
- `idempotency-guard.ts` (double-click protection never applied)
- `cascadingPrune()` (no UI trigger, no plan mutation)
- `computeGroupDrawPoints()` (group averaging never called)
- `computeTTD()` (time-to-draw visualization never rendered)
- `computeMonteCarloOdds()` (imported, not called — inline math used instead)
- `projectPointCreep()` (imported, not called — no chart)
- Weekly Digest push reporting (no Slack webhook, no email service)

---

## PRIORITY WIRING ROADMAP (Recommended)

### Phase A: Data Integrity (Make the crawlers real)
1. Wire `runCrawlPipeline()` into scraper post-processing
2. Persist LKG snapshots + P1 alerts to Supabase
3. Build `/admin/quarantine` UI with Approve/Reject
4. Add Slack webhook for P1 alerts
5. Wire `compileWeeklyDigest()` to a Monday cron + Slack delivery

### Phase B: Cloud Persistence (Don't lose user data)
1. Sync `savedPlans` → Supabase `year_plans`
2. Sync `userGoals` + `milestones` → Supabase
3. Hydrate all stores from DB on auth (not just points)
4. Conflict resolution strategy (local-first, server-merge)

### Phase C: Mutation Layer (Let the math change the plan)
1. Draw Outcome UI → `setDrawOutcomeCascade`
2. Life Event panel → `cascadingPrune()` with confirmation
3. Quick Rebalance → re-generate assessment without full wizard
4. Wire `computeEffectivePoints()` into scoring pipeline

### Phase D: Multiplayer (Make groups real)
1. Party member lookup via Supabase user profiles
2. Wire `computeGroupDrawPoints()` into WY/CO scoring
3. `dispatchPartyChange` cascade on member removal

### Phase E: Visualization (Fill the empty charts)
1. Replace inline draw probability with `computeMonteCarloOdds()`
2. Wire `computeTTD()` → per-state sparkline
3. Wire `projectPointCreep()` → 10-year projection chart
