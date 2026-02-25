# Session 17 — Phase 3 Deployment Directive (Partial)
**Date:** 2026-02-24
**Status:** Complete — Data Airlock + KPI Grid + Bug Report + PTO Collision + Analytics, 201 tests, 0 failures

## What Was Built

### 1. Data Airlock Engine: `src/lib/engine/data-airlock.ts`
A quarantine system for F&G data ingestion. All data flows into staging snapshots before touching live state.

#### Types
- `StagingSnapshot` — Immutable versioned capture (fees, deadlines, quotas, rules, species)
- `StagingFeeData`, `StagingDeadlineData`, `StagingQuotaData`, `StagingRuleData`, `StagingSpeciesData`
- `DiffEntry` — Individual field change with severity classification
- `AirlockVerdict` — Overall evaluation result (pass/warn/block counts, auto-promote flag)
- `AirlockTolerances` — Configurable thresholds
- `ChangeImpactNotification` — User-facing notification with CTA

#### Tolerance Thresholds (Default)
| Rule | Threshold | Severity |
|---|---|---|
| Fee increase | >8% | BLOCK |
| Fee decrease | >1% | BLOCK (suspicious) |
| Deadline shift | >3 calendar days | BLOCK |
| Quota drop | >20% | BLOCK |
| Rule mutation | Any change | BLOCK |
| New species | Any addition | WARN |
| Species removal | Any removal | BLOCK |

#### Functions
1. **`evaluateSnapshot()`** — Core diff-checker: compares staging vs live across all categories
2. **`promoteSnapshot()`** — Applies approved staging data to live State (pure, no mutation)
3. **`generateChangeImpactNotifications()`** — User-facing notifications filtered by active portfolio
4. **`diffSnapshots()`** — Compare two snapshots directly (historical view)
5. Internal: `diffFees()`, `diffDeadlines()`, `diffQuotas()`, `diffRules()`, `diffSpecies()`

### 2. Data Airlock Tests: `src/lib/engine/__tests__/data-airlock.test.ts`
41 tests across 9 describe blocks:
- Fee tolerance (8 tests): pass/block on increase >8%, decrease >1%, tag costs, fee schedule
- Deadline tolerance (6 tests): pass/block on shifts >3 days, open dates, draw result dates
- Rule mutations (8 tests): point system, preference %, OIL list, squaring, application approach
- Species changes (3 tests): new species → WARN, removal → BLOCK
- Verdict summary (3 tests): counts, auto-promote, summary text
- Snapshot promotion (5 tests): apply fees/deadlines/rules, metadata update, immutability
- Change impact notifications (4 tests): portfolio filtering, CTA links, severity mapping
- Snapshot-to-snapshot diff (2 tests): cross-snapshot comparison
- Custom tolerances (3 tests): override thresholds

### 3. 8-Bucket KPI Grid: `src/components/kpi/KPIGrid.tsx`
Two exported components:

**`KPIGrid`** — Full 8-bucket responsive grid (2col mobile → 4col tablet → 8col desktop):
1. **Sunk Capital** — Non-refundable committed $ (red)
2. **Floated Capital** — Refundable if unsuccessful $ (amber)
3. **Portfolio Health** — 0-100 strategy score (dynamic color)
4. **Active Apps** — Current year pending applications (blue)
5. **Creep Velocity** — Average PCV across portfolio + dead asset count (dynamic)
6. **Next Milestone** — Days until next deadline with state/species label (urgency colors)
7. **Draw Probability** — Years until next high-probability draw (dynamic)
8. **Budget Discipline** — Combined discipline score from portfolio health (dynamic)

Each bucket: icon + label + value + delta indicator (▲/▼) + 3-word sub-label + optional link

**`KPIStrip`** — Compact inline version for header/nav use (sunk | floated | apps | next milestone)

### 4. Bug Report System: `src/lib/engine/bug-report.ts` + `src/components/shared/BugReportButton.tsx`

**Engine** (`bug-report.ts`):
- `BugReport` schema: report_id, timestamp, user_id, user_comment, system_state (page_url, active_plan_id, roadmap_years, milestones, points, goals, wizard_step, budgets, active_states/species), active_alerts, engine_versions
- `buildBugReport()` — Captures full system state from all 3 Zustand stores
- `submitBugReport()` — POST to configurable webhook (env: `NEXT_PUBLIC_BUG_REPORT_WEBHOOK`, default: `/api/bug-report`)
- `validateBugReport()` — Server-side payload validation

**UI** (`BugReportButton.tsx`):
- Fixed-position floating button (bottom-right)
- Expandable form with textarea for user comment
- States: idle → open → submitting → success/error
- Auto-captures: roadmap state, alerts, points, engine versions
- Auto-closes after successful submission
- Wired to analytics tracking

### 5. Analytics Event System: `src/lib/engine/analytics.ts`
PostHog-ready typed event stubs with local buffer for bug reports.

#### Event Taxonomy (24 events):
- **Fiduciary**: `budget_overflow_triggered`, `cascading_prune_accepted`, `dead_asset_warning_ignored`, `draw_outcome_recorded`, `missed_deadline_detected`, `success_disaster_detected`, `profile_anchor_changed`
- **Data Airlock**: `airlock_snapshot_evaluated`, `airlock_snapshot_promoted`
- **Bug Report**: `bug_report_submitted`
- **Navigation**: `page_viewed`, `plan_generated`, `plan_confirmed`, `wizard_step_completed`
- **Savings/Budget**: `savings_contribution_added`, `budget_changed`
- **Engagement**: `fiduciary_alert_dismissed`, `advisor_cta_clicked`, `diff_viewed`

#### Functions
- `trackEvent<E>(event, properties)` — Type-safe event tracking (console + local buffer in beta)
- `identifyUser(userId, traits)` — User identification stub
- `getEventBuffer()` — Get local event buffer for bug reports
- `clearEventBuffer()` — Clear after sync

### 6. PTO Collision Detection: `src/app/(app)/planner/page.tsx`
Wired the existing fiduciary dispatcher's schedule conflict detection into the Planner calendar UI:
- Reads `scheduleConflicts` and `fiduciaryAlerts` from AppStore
- Reads `huntDaysPerYear` from WizardStore
- Computes PTO shortage: (hunt items × 6 days) vs available hunt days
- Renders amber PTO Shortage warning card when days needed > available
- Renders red Schedule Conflict cards for each PTO overlap from the dispatcher

## Files Created
- `src/lib/engine/data-airlock.ts` — NEW (Data Airlock quarantine engine)
- `src/lib/engine/__tests__/data-airlock.test.ts` — NEW (41 tests)
- `src/components/kpi/KPIGrid.tsx` — NEW (8-Bucket KPI Grid + KPI Strip)
- `src/lib/engine/bug-report.ts` — NEW (Bug report schema + webhook)
- `src/components/shared/BugReportButton.tsx` — NEW (Floating bug report UI)
- `src/lib/engine/analytics.ts` — NEW (PostHog-ready analytics stubs)

## Files Modified
- `src/app/(app)/planner/page.tsx` — Added PTO collision alerts (imports + store hooks + alert UI section)

## Test Results
| File | Tests |
|---|---|
| data-airlock.test.ts | 41 |
| savings-calculator.test.ts | 44 |
| verified-datum.test.ts | 21 |
| cascading-prune.test.ts | 8 |
| liquidity-bottleneck.test.ts | 8 |
| inactivity-purge.test.ts | 8 |
| post-draw-reset.test.ts | 18 |
| group-draw-averaging.test.ts | 24 |
| draw-outcome-cascade.test.ts | 15 |
| missed-deadline.test.ts | 14 |
| **Total** | **201** |

## Phase 3 Progress
| Section | Status |
|---|---|
| 1. Data Airlock | ✅ Engine + Tests complete |
| 2. Endless Loop | ✅ Complete (Session 16) |
| 3. Closed Beta Crucible | ✅ Bug Report + Analytics complete |
| 4. UI/UX Final Synthesis | ✅ KPI Grid built, PTO collision wired |

## Remaining Directive Items (for future sessions)
- Budget tab renaming: Definite → Sunk Capital, If You Draw → Floated Capital / Contingent Liability
- Inflation pegging for 10-year budget projections
- Calculator: prerequisite license detection
- Hunt Plans: group penalty display when applying as party
- Nav wiring: add Profile to sidebar/navigation
- Desktop layout: top half map + KPI, bottom half action list
- Mobile: segmented toggle [Action List] | [State Map]
- Confidence bands: probabilistic ranges on draw projections
- Data Airlock UI: admin-facing staging review screen
- Wire BugReportButton into app layout
- Wire KPIGrid into dashboard page
