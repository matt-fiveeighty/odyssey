# Phase 10: Scouting Strategy - Research

**Researched:** 2026-02-22
**Domain:** Geographic proximity engine, scouting opportunity scoring, dual-purpose hunt recommendations
**Confidence:** HIGH (codebase fully inspected, all critical data structures verified)

## Summary

Phase 10 adds a "scouting intelligence" layer to the engine: when a user has multi-year point-building strategies toward trophy draw units, the system detects nearby OTC or high-odds units and surfaces them as dual-purpose scouting missions. This requires (1) a geographic proximity model for unit-to-unit distance, (2) a multi-factor scouting opportunity scorer, (3) presentation of scouting recommendations as distinct "Scouting Move" cards, (4) a visual badge/color in the season calendar, and (5) advisor voice explanations with strategic context.

**Critical finding:** Units in `sample-units.ts` have NO latitude/longitude coordinates. They do have `terrainType[]`, `elevationRange`, `nearestAirport`, and `driveTimeFromAirport` -- but no geographic coordinates. This means direct Haversine distance calculation is impossible with current data. The recommended approach is a **unit-region centroid lookup table** that maps unit codes to approximate lat/lon centroids (hardcoded data, ~60 entries for current units), combined with state-level proximity as a fallback for units without centroids.

**Primary recommendation:** Build a static `unit-centroids.ts` lookup table mapping unit IDs to approximate [lat, lon] coordinates. Use Haversine distance for unit-to-unit proximity. For units without centroids, fall back to state-level proximity (already implemented in `getStateDistance()`). Score scouting opportunities as a weighted composite of proximity (40%), terrain similarity (25%), season overlap (20%), and cost (15%).

## Standard Stack

### Core (existing -- no new libraries needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.x | Type-safe scouting engine | Already in stack |
| Next.js | 16 | App Router, SSR | Already in stack |
| Tailwind CSS | 4 | Styling scouting badges/cards | Already in stack |
| shadcn/ui | latest | Card, Badge components | Already in stack |
| Zustand | latest | State management | Already in stack |
| Lucide React | latest | Binoculars icon (already used for scout) | Already in stack |

### Supporting (new, zero-dependency)

| Module | Purpose | When to Use |
|--------|---------|-------------|
| `unit-centroids.ts` | Static lat/lon lookup for unit geographic centers | Proximity calculation |
| `scouting-engine.ts` | Core scouting detection + scoring | Engine layer |
| `advisor-scouting.ts` | Scouting-specific advisor voice insights | Advisor pipeline integration |

### No External Libraries Needed

The Haversine formula is ~10 lines of math. Terrain similarity is array intersection. Season overlap is date range comparison. **Zero new npm dependencies required.**

## Architecture Patterns

### Recommended Project Structure

```
src/lib/
  constants/
    unit-centroids.ts          # Static {unitId: [lat, lon]} lookup (~60 entries)
  engine/
    scouting-engine.ts         # Core: detectScoutingOpportunities(), scoreScoutingMatch()
    advisor-scouting.ts        # generateScoutingInsights() for advisor pipeline
```

```
src/components/
  results/
    sections/
      ScoutingMoveCard.tsx     # "Scouting Move" recommendation card
    shared/
      ScoutingBadge.tsx        # Badge component for calendar + cards
```

### Pattern 1: Scouting Engine (Pure Function Pipeline)

**What:** Pure function that takes the user's assessment (specifically trophy draw units from stateRecommendations) and returns scored scouting opportunities from the SAMPLE_UNITS pool.

**When to use:** After `generateStrategicAssessment()` produces the user's roadmap, call `detectScoutingOpportunities()` to find nearby OTC/high-odds units.

**Data flow:**
```
StrategicAssessment.stateRecommendations (trophy draw units with yearsToUnlock > 1)
  + SAMPLE_UNITS (all units, filtered to OTC/high-odds)
    -> detectScoutingOpportunities()
      -> ScoutingOpportunity[] (scored, sorted)
```

**Example:**
```typescript
// Source: Codebase analysis - follows opportunity-scorer.ts pattern
export interface ScoutingOpportunity {
  // The scouting hunt (OTC/high-odds unit)
  scoutUnit: Unit;
  scoutUnitId: string;

  // The trophy target this scouting serves
  targetUnit: { unitCode: string; unitName: string; stateId: string; speciesId: string };
  targetYearsAway: number;

  // Scoring breakdown
  proximityScore: number;     // 0-40 (Haversine distance or state-level)
  terrainScore: number;       // 0-25 (terrainType[] overlap)
  seasonScore: number;        // 0-20 (season overlap)
  costScore: number;          // 0-15 (tag cost + travel)
  totalScore: number;         // 0-100

  // Human-readable
  distanceMiles: number | null;  // null if centroid data unavailable
  terrainOverlap: string[];      // shared terrain types
  strategicReason: string;       // "Same elk migration corridor" / "Similar alpine terrain"
}
```

### Pattern 2: Unit Centroid Lookup (Static Data)

**What:** A hardcoded lookup table that maps unit IDs to approximate geographic center coordinates. This is NOT a geocoding service -- it's manually curated approximate centroids for the ~60 units in sample-units.ts.

**Why this approach:**
- Units do NOT have lat/lon in the current data model (verified)
- Adding lat/lon to the Unit type would require backfilling all existing units
- A separate lookup table is simpler, can be incrementally populated, and fails gracefully
- ~60 entries is trivially small

**Example:**
```typescript
// Source: New file - unit-centroids.ts
export const UNIT_CENTROIDS: Record<string, [number, number]> = {
  // Colorado - NW
  "co-elk-011": [39.97, -108.07],    // White River Unit 11
  "co-elk-211": [39.93, -107.92],    // Bear's Ears Unit 211
  "co-elk-004": [39.82, -108.23],    // Piceance Basin Unit 4
  "co-elk-003": [40.08, -107.85],    // White River Unit 3
  "co-md-011":  [39.97, -108.07],    // Same geography as elk Unit 11
  "co-md-211":  [39.93, -107.92],    // Same geography as elk Unit 211
  // ... ~60 total entries

  // Wyoming
  "wy-elk-035": [44.55, -107.15],    // Bighorn Mountains
  "wy-elk-100": [41.75, -108.80],    // Desert Elk
  "wy-md-145":  [42.80, -110.35],    // Wyoming Range
  // etc.
};

/** Haversine distance in miles between two [lat, lon] pairs */
export function haversineDistance(
  [lat1, lon1]: [number, number],
  [lat2, lon2]: [number, number],
): number {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
```

### Pattern 3: Terrain Similarity Scoring

**What:** Compare `terrainType[]` arrays between the scouting unit and the trophy target unit. The more terrain types overlap, the higher the scouting value.

**Key insight from codebase:** Units already have `terrainType: TerrainType[]` where `TerrainType = "Alpine" | "Timber" | "Desert" | "Mixed" | "Sagebrush" | "Prairie"`. Many units have 2 terrain types (e.g., `["Sagebrush", "Timber"]`).

**Example:**
```typescript
function scoreTerrainSimilarity(
  scoutTerrain: TerrainType[],
  targetTerrain: TerrainType[],
): number {
  const overlap = scoutTerrain.filter(t => targetTerrain.includes(t));
  const union = new Set([...scoutTerrain, ...targetTerrain]);

  // Jaccard-like similarity scaled to 25 points
  if (union.size === 0) return 12; // neutral
  return Math.round((overlap.length / union.size) * 25);
}
```

### Pattern 4: OTC/High-Odds Detection

**What:** Identify which units qualify as "scouting candidates" (accessible without years of point building).

**Key finding from codebase:** The `opportunity-scorer.ts` already has `classifyDrawAccess()` which returns `"otc" | "high_odds_draw" | "competitive_draw" | "limited_draw" | "unknown_draw"`. Reuse this classification logic:

```typescript
// Units qualify as scouting candidates if:
// 1. pointsRequiredNonresident === 0 (no points needed)
// 2. OR drawAccessType === "otc" or "high_odds_draw"
// 3. AND they are NOT the user's trophy target (would be silly to "scout" your own hunt)
```

**Existing constants in opportunity-scorer.ts:**
- `OTC_QUOTA_THRESHOLD = 500` (500+ NR tags = OTC)
- `HIGH_ODDS_QUOTA_THRESHOLD = 100` (100+ NR tags = favorable odds)
- `LIMITED_QUOTA_THRESHOLD = 20` (under 20 = limited)

### Pattern 5: Calendar Integration

**What:** Scouting hunts get a distinct `itemType: "scout"` in the CalendarSlotData -- this type ALREADY EXISTS in the calendar-grid.ts model. The visual differentiation needs to be added.

**Key finding:** `CalendarSlotData.itemType` already supports `"scout"` as a value. The `CalendarSlot.tsx` component already renders a Binoculars icon for scout items. The SharedResultsShell already has `scout: { label: "Scout", color: "bg-purple-500/15 text-purple-400" }`.

**What's missing:** Scouting-specific hunt calendar items need a DISTINCT visual treatment from regular scout items (which are e-scouting/pre-season trips). The new "Scouting Move" hunts should:
1. Use `itemType: "scout"` (already supported)
2. Add a new `tagType` value or use a metadata flag to distinguish "scouting hunt" from "e-scout trip"
3. Get a special badge in the calendar (e.g., "SCOUT HUNT" instead of generic "Scout")

**Recommended approach:** Add an optional `scoutingTarget` field to `CalendarSlotData`:
```typescript
// Addition to CalendarSlotData
scoutingTarget?: {
  targetStateId: string;
  targetSpeciesId: string;
  targetUnitCode: string;
  strategicReason: string;
};
```

This allows the CalendarSlot component to render a "Scouting Move" badge and tooltip showing the strategic connection.

### Pattern 6: Advisor Voice Integration

**What:** Add `generateScoutingInsights()` as a new sub-generator in the advisor pipeline.

**Key finding:** The `advisor.ts` pipeline already calls 7 sub-generators and merges them. Adding an 8th for scouting follows the exact same pattern. The `AdvisorInsightCategory` type needs a new `"scouting"` value.

**Example:**
```typescript
// New advisor category
export type AdvisorInsightCategory = /* existing */ | "scouting";

// New sub-generator
function generateScoutingInsights(
  assessment: StrategicAssessment,
  scoutingOpps: ScoutingOpportunity[],
): AdvisorInsight[] {
  // Cap at 1-2 scouting insights to avoid overwhelming the feed
  return scoutingOpps.slice(0, 2).map(opp => ({
    id: `scouting-${opp.scoutUnit.stateId}-${opp.scoutUnit.speciesId}`,
    signal: {
      type: "positive",
      message: `Scouting move: ${opp.scoutUnit.stateId} ${formatSpeciesName(opp.scoutUnit.speciesId)}`,
    },
    category: "scouting",
    urgency: "informational",
    interpretation: `While you build ${opp.targetYearsAway} more years for ${opp.targetUnit.stateId} Unit ${opp.targetUnit.unitCode}, hunt ${opp.scoutUnit.stateId} Unit ${opp.scoutUnit.unitCode} for scouting intel. ${opp.strategicReason}`,
    recommendation: `Apply for the OTC/high-odds ${opp.scoutUnit.stateId} ${formatSpeciesName(opp.scoutUnit.speciesId)} tag. Same terrain, fraction of the cost.`,
    cta: { label: "View Scouting Move", href: "/plan-builder" },
  }));
}
```

### Anti-Patterns to Avoid

- **Don't geocode at runtime:** The unit centroid lookup must be static, not an API call. No external geocoding services.
- **Don't add lat/lon to the Unit type:** This would require backfilling all existing units and changing the type definition. Use a separate lookup table.
- **Don't force scouting recommendations:** If no good scouting matches exist (score below threshold), show nothing. Bad recommendations erode trust.
- **Don't duplicate opportunity-scorer logic:** Reuse the existing `classifyDrawAccess()` pattern for OTC/high-odds detection rather than reimplementing.
- **Don't show scouting for units the user already plans to hunt:** If a unit is already in their roadmap, it's not a "scouting move."

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OTC/high-odds detection | Custom tag classification | Reuse `classifyDrawAccess()` from opportunity-scorer.ts | Already handles quota thresholds, OIAL, random draws |
| Geographic distance | Custom distance formula | Haversine formula (~10 lines) | Standard, well-understood, no edge cases |
| Calendar slot rendering | New calendar component | Extend existing CalendarSlot.tsx with badge variant | Reuse existing icon system, urgency colors, slot layout |
| Advisor voice | New insight pipeline | Add sub-generator to existing advisor.ts pipeline | Follows established pattern, already prioritized/capped |
| State-level proximity | New region model | Reuse `getStateDistance()` from roadmap-generator.ts | Already categorizes states into regions |

## Common Pitfalls

### Pitfall 1: Over-Recommending Scouting Hunts
**What goes wrong:** Every unit pair that's "close enough" gets flagged as a scouting opportunity, flooding the user with suggestions.
**Why it happens:** Low scoring thresholds + many units in the same state.
**How to avoid:** Set a minimum total score threshold (e.g., 60/100) AND cap scouting recommendations to 3 per trophy target, 5 total per assessment.
**Warning signs:** More than 3 scouting cards in results.

### Pitfall 2: Same-State "Scouting" Feels Trivial
**What goes wrong:** Recommending CO Unit 4 as scouting for CO Unit 11 when they're in the same region feels like a non-insight.
**Why it happens:** Same-state units naturally have high proximity scores.
**How to avoid:** Apply a "novelty discount" -- if the scouting unit is in the same state AND same region as the trophy target, reduce proximity score by 30%. Cross-state scouting is more valuable because it adds travel variety.
**Warning signs:** All scouting recommendations are in the same state as the trophy target.

### Pitfall 3: Missing Centroid Data Silently Breaks Scoring
**What goes wrong:** A unit has no entry in `UNIT_CENTROIDS`, so `distanceMiles` is null and proximity score defaults to a meaningless value.
**Why it happens:** New units added to sample-units.ts without corresponding centroid entries.
**How to avoid:** (1) Fall back to state-level proximity via `getStateDistance()` when centroids are missing. (2) Log a warning. (3) Use `nearestAirport` as a rough proxy for region clustering.
**Warning signs:** Scouting recommendations between units thousands of miles apart.

### Pitfall 4: Calendar Visual Confusion
**What goes wrong:** Scouting hunts look identical to regular scout items (e-scout trips) in the calendar.
**Why it happens:** Both use `itemType: "scout"`, same Binoculars icon, same purple color.
**How to avoid:** Add the `scoutingTarget` field to distinguish real scouting hunts from e-scout trips. Render a "SCOUT HUNT" badge (instead of no badge) and show the strategic connection in the tooltip. Use a distinct color variant (e.g., `bg-violet-500/15 text-violet-400` vs the existing `bg-purple-500/15 text-purple-400`).
**Warning signs:** Users can't tell the difference between an e-scout task and an actual hunt.

### Pitfall 5: Stale Strategic Reasons
**What goes wrong:** The advisor says "same elk migration corridor" but there's no data to support that claim.
**Why it happens:** The `strategicReason` string is generated from terrain overlap and proximity, but the natural language implies knowledge we don't have.
**How to avoid:** Keep strategic reasons grounded in available data: "Similar terrain (Sagebrush, Timber) at comparable elevation (6,000-9,500 ft)" -- not "same migration corridor." Use `tacticalNotes` from both units to find actual ecological connections.
**Warning signs:** Advisor makes claims about wildlife biology that aren't supported by unit data.

## Code Examples

### Example 1: Haversine Distance Calculation
```typescript
// Source: Standard geodesic formula
export function haversineDistance(
  [lat1, lon1]: [number, number],
  [lat2, lon2]: [number, number],
): number {
  const R = 3959; // Earth radius in miles
  const toRad = (deg: number) => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
```

### Example 2: Scouting Candidate Filter
```typescript
// Source: Extends opportunity-scorer.ts classifyDrawAccess pattern
function isScoutingCandidate(unit: Unit): boolean {
  // Must be accessible without years of waiting
  if (unit.pointsRequiredNonresident > 2) return false;

  // Must have reasonable tag supply
  if (unit.tagQuotaNonresident < 50) return false;

  // Must have decent success rate (scouting hunts should produce encounters)
  if (unit.successRate < 0.15) return false;

  return true;
}
```

### Example 3: Proximity Score
```typescript
// Source: New scouting-engine.ts
function scoreProximity(
  scoutUnitId: string,
  targetUnitId: string,
  scoutStateId: string,
  targetStateId: string,
): { score: number; distanceMiles: number | null } {
  const scoutCoord = UNIT_CENTROIDS[scoutUnitId];
  const targetCoord = UNIT_CENTROIDS[targetUnitId];

  // Best case: both have centroids
  if (scoutCoord && targetCoord) {
    const dist = haversineDistance(scoutCoord, targetCoord);
    // 0-50 miles = 40 pts, 50-100 = 30, 100-200 = 20, 200-400 = 10, 400+ = 5
    let score = 5;
    if (dist <= 50) score = 40;
    else if (dist <= 100) score = 30;
    else if (dist <= 200) score = 20;
    else if (dist <= 400) score = 10;
    return { score, distanceMiles: Math.round(dist) };
  }

  // Fallback: state-level proximity
  const stateProximity = getStateDistance(scoutStateId, targetStateId);
  const fallbackScore = stateProximity === "close" ? 25 : stateProximity === "medium" ? 15 : 5;
  return { score: fallbackScore, distanceMiles: null };
}
```

### Example 4: Season Overlap Score
```typescript
// Source: New scouting-engine.ts
function scoreSeasonOverlap(
  scoutUnit: Unit,
  targetUnit: Unit,
): number {
  // Check if tactical notes suggest overlapping best season tiers
  const scoutSeason = scoutUnit.tacticalNotes?.bestSeasonTier?.toLowerCase() ?? "";
  const targetSeason = targetUnit.tacticalNotes?.bestSeasonTier?.toLowerCase() ?? "";

  // Same season = 20pts (can scout and hunt same trip)
  // Adjacent season = 12pts (scout in prep for next month)
  // Different season = 5pts (still valuable but separate trip)

  if (scoutSeason && targetSeason) {
    if (scoutSeason.includes("rifle") && targetSeason.includes("rifle")) return 20;
    if (scoutSeason.includes("archery") && targetSeason.includes("archery")) return 20;
    // Check month proximity via bestArrivalDate
    const scoutArrival = scoutUnit.tacticalNotes?.bestArrivalDate;
    const targetArrival = targetUnit.tacticalNotes?.bestArrivalDate;
    if (scoutArrival && targetArrival) {
      // Parse month from arrival dates like "Oct 20" -> 10
      const getMonth = (s: string) => {
        const months: Record<string, number> = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 };
        const m = s.slice(0, 3).toLowerCase();
        return months[m] ?? 0;
      };
      const diff = Math.abs(getMonth(scoutArrival) - getMonth(targetArrival));
      if (diff === 0) return 20;
      if (diff === 1) return 12;
    }
  }

  return 8; // neutral default
}
```

### Example 5: Scouting Move Card Presentation
```typescript
// Source: Pattern from existing StatePortfolio cards
interface ScoutingMoveCardProps {
  opportunity: ScoutingOpportunity;
}

function ScoutingMoveCard({ opportunity: opp }: ScoutingMoveCardProps) {
  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Binoculars className="w-4 h-4 text-violet-400" />
        <span className="text-xs font-semibold uppercase tracking-wider text-violet-400">
          Scouting Move
        </span>
      </div>
      {/* Scout unit details */}
      <h3 className="text-base font-semibold">
        {opp.scoutUnit.stateId} Unit {opp.scoutUnit.unitCode}
        {opp.scoutUnit.unitName ? ` (${opp.scoutUnit.unitName})` : ""}
      </h3>
      {/* Strategic connection */}
      <p className="text-sm text-muted-foreground mt-1">
        {opp.strategicReason}
      </p>
      {/* Score breakdown pill row */}
      {/* Target unit link */}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Scout = e-scout only | Scout = e-scout + scouting hunts | Phase 10 | New concept: actual OTC hunts as intel-gathering |
| No unit proximity | Unit centroid + Haversine | Phase 10 | Enables geographic recommendations |
| Single "scout" itemType | "scout" with optional scoutingTarget | Phase 10 | Visual distinction in calendar |
| 7 advisor sub-generators | 8 advisor sub-generators (+scouting) | Phase 10 | New insight category |

**Unchanged:**
- CalendarSlotData.itemType "scout" already exists -- extend, don't replace
- Binoculars icon for scout items -- keep, add badge
- Purple color for scout actions -- use violet variant for scouting hunts

## Existing Infrastructure Summary

### What Already Exists (Reuse, Don't Rebuild)

| Asset | Location | What It Does | How Phase 10 Uses It |
|-------|----------|-------------|---------------------|
| `classifyDrawAccess()` | opportunity-scorer.ts | Classifies OTC/draw/limited | Filter for scouting candidates |
| `getStateDistance()` | roadmap-generator.ts | Region-based proximity | Fallback when centroids missing |
| `CalendarSlotData.itemType: "scout"` | calendar-grid.ts | Calendar slot type | Already supported, extend with badge |
| `generateAdvisorInsights()` pipeline | advisor.ts | 7 sub-generators, sorted + capped | Add 8th scouting generator |
| `AdvisorInsight` type | types/index.ts | Insight structure | Reuse verbatim |
| `SAMPLE_UNITS` | sample-units.ts | ~60 units with terrain, elevation, airports | Pool of scouting candidates |
| `Unit.terrainType[]` | types/index.ts | Array of TerrainType values | Terrain similarity scoring |
| `Unit.elevationRange` | types/index.ts | [low, high] feet | Elevation similarity scoring |
| `Unit.tacticalNotes` | types/index.ts | Season tiers, arrival dates, pro tips | Season overlap + strategic narrative |
| `Binoculars` icon | CalendarSlot.tsx, SharedResultsShell | Scout icon | Keep for scouting hunts |
| `bg-purple-500/15 text-purple-400` | SharedResultsShell.tsx | Scout action color | Differentiate with violet variant |

### What Needs to Be Created

| Asset | Purpose | Estimated Size |
|-------|---------|---------------|
| `unit-centroids.ts` | Static lat/lon lookup for ~60 units | ~150 lines |
| `scouting-engine.ts` | Core detection + scoring | ~250 lines |
| `advisor-scouting.ts` | Advisor voice for scouting insights | ~80 lines |
| `ScoutingMoveCard.tsx` | Dual-purpose recommendation card | ~100 lines |
| `ScoutingBadge.tsx` | Calendar badge component | ~30 lines |
| Type additions | ScoutingOpportunity, scoutingTarget on CalendarSlotData | ~40 lines |

### Data Model Answers to Research Questions

1. **Do sample-units.ts units have lat/lon coordinates?**
   **NO.** Units have `id`, `stateId`, `speciesId`, `unitCode`, `unitName`, `terrainType[]`, `elevationRange`, `publicLandPct`, `nearestAirport`, `driveTimeFromAirport` -- but no geographic coordinates. **Solution: `unit-centroids.ts` static lookup.**

2. **Do units have terrain type metadata?**
   **YES.** `Unit.terrainType: TerrainType[]` is fully populated for all 60+ units. Types: `"Alpine" | "Timber" | "Desert" | "Mixed" | "Sagebrush" | "Prairie"`. Most units have 2 types. **Directly usable for terrain similarity scoring.**

3. **How are OTC/leftover tags identified?**
   **Via `pointsRequiredNonresident` and `tagQuotaNonresident`** on each Unit. The `opportunity-scorer.ts` has `classifyDrawAccess()` which uses these fields plus quota thresholds (`OTC_QUOTA_THRESHOLD = 500`, `HIGH_ODDS_QUOTA_THRESHOLD = 100`) to classify tags. `CalendarSlotData.tagType` supports `"otc" | "leftover"` but these are not yet populated (TODO comment: "Phase 7 -- derive OTC/leftover from scraper data"). **For Phase 10, use `pointsRequiredNonresident === 0` + `tagQuotaNonresident >= 100` as the scouting candidate filter.**

4. **What scoring dimensions does opportunity-scorer.ts use?**
   Four dimensions: `pointPositionScore`, `drawAccessScore`, `huntQualityScore`, `costScore` with configurable weights via `OpportunityWeights`. The scouting scorer should be a **separate** scoring function (different dimensions: proximity, terrain, season, cost) -- not an extension of the existing one. But it can reuse the draw access classification.

5. **How does CalendarSlot.itemType work?**
   `CalendarSlotData.itemType` is a discriminated union: `"application" | "point_purchase" | "hunt" | "scout" | "deadline" | "prep"`. The `"scout"` type is already supported throughout: calendar-grid.ts mapping, CalendarSlot.tsx rendering (Binoculars icon), advisor-calendar.ts notes, ICS builder, auto-fill engine. **"scout" already works end-to-end.** Phase 10 adds the `scoutingTarget` metadata field to distinguish scouting hunts from e-scout prep items.

## Open Questions

1. **Unit centroid accuracy**
   - What we know: We need approximate lat/lon for ~60 units. Unit names and state IDs give us enough to look up approximate coordinates.
   - What's unclear: Exact coordinate sources. Should we use unit centroids from state F&G GIS data, or approximate by town/landmark?
   - Recommendation: Use approximate coordinates from well-known landmarks within each unit. For western hunt units, the nearest town or geographic feature (mentioned in tacticalNotes) gives a good enough centroid for "within 200 miles" comparisons. Precision to ~10 miles is sufficient.

2. **Scouting recommendations for users with no multi-year builds**
   - What we know: Scouting strategy only applies when the user has trophy targets 2+ years away.
   - What's unclear: Should we still show scouting insights for users who are only applying for OTC/random hunts?
   - Recommendation: No. Scouting strategy is only valuable when there's a long-term draw investment. Skip users whose entire roadmap is build=0 or random draws.

3. **Cross-species scouting**
   - What we know: A user building elk points in WY Unit 100 could scout nearby WY mule deer units.
   - What's unclear: How valuable is cross-species scouting vs same-species?
   - Recommendation: Allow cross-species scouting but apply a 20% discount to the terrain similarity score. Same-species is more directly applicable.

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `src/lib/constants/sample-units.ts` -- all 60+ units verified, no lat/lon fields
- Codebase inspection: `src/lib/types/index.ts` -- Unit type, CalendarSlotData type, AdvisorInsight type
- Codebase inspection: `src/lib/engine/opportunity-scorer.ts` -- classifyDrawAccess(), OTC thresholds
- Codebase inspection: `src/lib/engine/calendar-grid.ts` -- CalendarSlotData.itemType includes "scout"
- Codebase inspection: `src/lib/engine/advisor.ts` -- pipeline pattern, 7 sub-generators
- Codebase inspection: `src/lib/engine/roadmap-generator.ts` -- getStateDistance(), scout actions
- Codebase inspection: `src/components/results/sections/CalendarSlot.tsx` -- scout icon + tag badge system
- Codebase inspection: `src/components/results/SharedResultsShell.tsx` -- scout color: bg-purple-500/15

### Secondary (MEDIUM confidence)
- Haversine formula: standard geodesic calculation, well-documented, no library needed

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies, all existing infrastructure verified
- Architecture: HIGH -- follows established codebase patterns (opportunity-scorer, advisor pipeline, calendar-grid)
- Pitfalls: HIGH -- based on actual data model inspection, not speculation
- Unit centroids: MEDIUM -- the approach is sound but the actual coordinate values need manual curation

**Research date:** 2026-02-22
**Valid until:** 2026-04-22 (stable domain, no fast-moving dependencies)
