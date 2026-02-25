# Session 21 Autosave — Cloud Persistence (COMPLETE)

## Date: 2026-02-25

## Current State: 409 tests, 16 files, 0 TS errors, ALL GREEN

## What Was Done

### Phase 1: Cloud Persistence — Wire All User Data to Supabase

#### Key Discovery
The DB tables ALREADY EXISTED. Supabase had `assessments`, `user_goals`, `wizard_state`, `savings_goals`, `budget_plans`, and `user_points` tables with RLS policies. Only `user_points` was syncing. Everything else was localStorage-only.

#### Architecture: Bulk Sync
Single endpoint (`/api/user/sync`) handles ALL data in one request:
- **GET** → Parallel fetch from 6 tables → hydrate all 3 Zustand stores
- **POST** → Upsert all data atomically (debounced 800ms)
- 1 network request on login, 1 on mutations (not 6)

### Files Created (4)
| File | Purpose |
|------|---------|
| `supabase-migration-cloud-persist.sql` | ALTER assessments (add name/label/is_active), CREATE fiduciary_alerts table, ALTER user_goals/savings_goals for missing columns |
| `src/app/api/user/sync/route.ts` | Bulk GET/POST endpoint — parallel fetches, upserts with conflict keys, full camelCase↔snake_case mapping |
| `src/lib/sync.ts` | Sync manager — `syncAllToDb()` (debounced 800ms), `hydrateFromDb()` (full store hydration), `getSyncStatus()` |
| `src/lib/engine/__tests__/cloud-persistence.test.ts` | 21 tests — mapping roundtrips, debounce, hydration merge, graceful degradation, wizard strategy, assessment serialization, alert dedup |

### Files Modified (2)
| File | Changes |
|------|---------|
| `src/lib/store.ts` | Replaced `syncPointsToDb()` with `syncAllToDb()` from sync.ts. Added sync calls to ALL 20+ mutating actions: plans (save/rename/delete/switch/duplicate), goals (add/update/remove), milestones (set/add/complete/uncomplete/drawOutcome), savings (add/update/remove/contribute), alerts (dismiss/clear), assessment (set/clear). |
| `src/components/providers/AuthProvider.tsx` | Added `hydrateFromDb()` call on authenticated login. Added `hydrated` boolean to AuthContext. Guests mark hydrated immediately. |

### Store → DB Wiring Map
| Store Data | DB Table | Conflict Key | Status |
|---|---|---|---|
| `savedPlans` | `assessments` | `id` | **WIRED** |
| `userGoals` + embedded milestones | `user_goals` | `id` | **WIRED** |
| `savingsGoals` | `savings_goals` | `id` | **WIRED** |
| `fiduciaryAlerts` | `fiduciary_alerts` (NEW) | `(user_id, alert_id)` | **WIRED** |
| `userPoints` | `user_points` | `(user_id, state_id, species_id, point_type)` | **WIRED** |
| Wizard state | `wizard_state` | `user_id` | **WIRED** (on confirmPlan only) |
| `activePlanId` | `assessments.is_active` | Derived | **WIRED** |

### Sync Behavior
- **Debounce**: 800ms sliding window. 5 rapid mutations → 1 DB write.
- **Offline-first**: localStorage is ALWAYS source of truth. DB is async backup.
- **Silent fail**: Network errors don't throw or corrupt local state.
- **Hydration merge**:
  - Empty local + full DB → use DB
  - Both have data → use whichever `updatedAt` is newer
  - Alerts: additive merge (union of local + DB)
  - Points: DB always wins (DB was already authoritative for points)
  - Wizard: only restores if local is untouched (step 1, no plan)

### What This Fixes
- ✅ 10-year strategic plan survives cache clear
- ✅ Goals and milestones persist to cloud
- ✅ Fiduciary alerts persist across devices
- ✅ Savings goals survive browser switch
- ✅ Cross-device access (phone ↔ laptop)
- ✅ Single network request on login
- ✅ Offline-first: localStorage always authoritative

### Wiring Audit Update — Before vs After
| Pillar | Before | After |
|--------|--------|-------|
| Cloud Persistence | **PARTIALLY WIRED** (points only) | **FULLY WIRED** (all data) |
| Session Autosave | localStorage only | **Supabase + localStorage** |

## Test Suite Totals (Session 21 Final)
| Suite | Tests |
|-------|-------|
| Fiduciary (6 suites) | 95 |
| Chaos Suite | 54 |
| Data Airlock | 41 |
| Savings Calculator | 44 |
| Verified Datum | 21 |
| Synthetic Cohort | 22 |
| Infrastructure Logic | 40 |
| Data Ingestion & Security | 38 |
| Pipeline Audit | 33 |
| **Cloud Persistence** | **21** |
| **TOTAL** | **409** |

## Next Steps (from user's sprint order)
- **Phase 2**: Unfreeze the Assessment — dynamic re-generation without full wizard restart
- **Phase 3**: Data Airlock — wire crawlers to Vercel crons + quarantine dashboard

## Migration Instructions
User must run `supabase-migration-cloud-persist.sql` against their Supabase instance before deploying.
