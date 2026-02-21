# Feature Research

**Domain:** Autonomous advisory platform (hunting-as-portfolio-management)
**Researched:** 2026-02-21
**Confidence:** MEDIUM (training-data-driven; no web search available for competitor verification)

## Existing System Inventory

Before categorizing new features, here is what already exists -- these are the foundation all new features build on:

| Existing Feature | Engine File | Status |
|------------------|-------------|--------|
| 9-step consultation wizard | `store.ts` ConsultationState | Shipped |
| 10-year phased roadmap | `roadmap-generator.ts` | Shipped |
| Opportunity finder (OTC, high-odds, gap fillers) | `opportunity-finder.ts` | Shipped |
| Opportunity scorer (all state/species ranked) | `opportunity-scorer.ts` | Shipped |
| Unit scoring (6-factor transparent) | `unit-scoring.ts` | Shipped |
| Portfolio health (5-dimension 0-100) | `portfolio-health.ts` | Shipped |
| Board state (status badges + signals) | `board-state.ts` | Shipped |
| Discipline rule violations | `discipline-rules.ts` | Shipped |
| Point creep forecasting | `point-creep.ts` | Shipped |
| Draw odds calculation | `draw-odds.ts` | Shipped |
| Season date parser | `season-parser.ts` | Shipped |
| Auto-fill calendar items | `auto-fill.ts` | Shipped |
| .ics export (individual events) | `calendar-export.ts` | Shipped |
| Journey data (15-year visual) | `journey-data.ts` | Shipped |
| Fee resolver (NR/resident) | `fee-resolver.ts` | Shipped |
| ROI calculator | `roi-calculator.ts` | Shipped |
| Rebalance engine (post-draw) | Shipped (Month 9) |
| Welcome back card | Shipped (Month 9) |
| Express mode (3-step) | Shipped (Month 9) |
| Multi-plan management | `store.ts` SavedPlan | Shipped |
| Budget DB (plans + savings goals) | `db/budget.ts` | Shipped (schema) |
| Locked anchors system | Types + store | Shipped |

---

## Feature Landscape

### Table Stakes (Users Expect These)

These are features where the analogy to financial planning platforms sets user expectations. If the app positions itself as "your hunting portfolio advisor," users will expect these to work.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Intra-year season calendar** | Financial advisors show cash flow calendars (when money moves). Hunting needs the same for deadlines, seasons, and action items. Betterment/Wealthfront show monthly income/outflow timelines. Users validated: "professionalize the scheduling process." The existing auto-fill engine already generates month-level items -- this is the visual layer. | MEDIUM | Builds on existing `auto-fill.ts` + `season-parser.ts`. Engine work is done; this is primarily a calendar UI component with month-by-month swimlanes. |
| **Full-year .ics calendar subscription** | Users who adopt the season calendar will immediately ask "can I get this in my Google Calendar?" One-off .ics downloads exist but a subscribable URL is what Calendly, Fantastical, and every modern scheduling tool provides. Without this, users must re-download after every plan change. | LOW | The existing `calendar-export.ts` handles event generation. Need a server route that serves a persistent .ics URL. Standard iCalendar spec (RFC 5545). No auth needed -- unique token URL. |
| **Shareable plan links (read-only snapshots)** | Analogous to Wealthfront's shareable portfolio summary or a Morningstar snapshot. The validated user pain point is "currently it's a phone call with some dudes." Sharing the plan IS the viral loop. Every advisory platform offers PDF or link sharing. | LOW | Serialize `StrategicAssessment` to a unique token URL. Read-only render of results page. No auth required -- just a hash/UUID route. |
| **Advisor voice / opinionated recommendations** | Betterment and Wealthfront don't just show data -- they interpret it. "You're on track" vs "You need to increase contributions." The existing board-state system produces signals, but the dashboard reads like a data display, not an advisor speaking. This is the personality layer. | MEDIUM | Not a new feature per se -- it's a rewrite of how existing data is presented. Every card, every metric needs a "so what?" interpretation. Pattern: signal + interpretation + recommended action. |

### Differentiators (Competitive Advantage)

These features go beyond what users explicitly expect and create genuine competitive moats. No hunting platform does any of these. Some financial platforms do analogous things.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **"Since your last visit" diff view** | Wealthfront shows portfolio changes since last login. Mint shows spending changes. No hunting platform shows "3 states released draw results since your last visit, CO elk deadline is now 14 days away, point creep in WY moved your projected draw from Year 5 to Year 6." This is the single most impactful feature for making the app feel autonomous -- it works for you while you're away. | MEDIUM | Compare stored `lastVisitTimestamp` against current data. Diff sources: milestone dates vs today, deadline proximity, draw result dates, point creep projections. Render as a dismissible interstitial or dashboard section. The Welcome Back card is a prototype -- this replaces it with a structured diff engine. |
| **Goal-based savings tracker** | Analogous to Vanguard's goal-based investing: "Retirement: 68% funded. House: 45% funded." Each hunt goal gets its own savings bucket with a progress bar, monthly contribution target, and projected funded date. The DB schema (`savings_goals` table) already exists with `targetCost`, `monthlySavings`, `currentSaved`. This turns the abstract roadmap into "save $200/mo and your CO elk trip is funded by March 2028." | MEDIUM | Backend exists (`db/budget.ts`). Frontend needs: savings goal cards per hunt, progress rings, monthly target calculator, projection chart. Pattern from Betterment: target amount / monthly contribution / time = automatic projection. Key insight: link each savings goal to a specific `UserGoal` so the hunt fund and the strategic plan are unified. |
| **Opportunistic discovery feed** | Analogous to stock screeners or Robinhood's "Top Movers" -- curated opportunities that match your profile. The opportunity-finder and opportunity-scorer engines exist but surface results only during plan generation. This feature creates a persistent feed: "3 new opportunities since last week: CO 2nd rifle leftover tags dropped, ID general deer OTC available, NV bonus-squared odds improved." The key differentiator vs GoHunt: personalized to YOUR points, YOUR species, YOUR budget -- not generic tag availability tables. | HIGH | Engine exists (`opportunity-finder.ts`, `opportunity-scorer.ts`). Needs: (1) periodic re-scoring against current data, (2) filtering for "new since last check," (3) feed UI with dismiss/save/add-to-plan actions. Depends on live data pipeline for freshness -- without real data updates, the feed would be static. |
| **Youth pathway optimization** | Analogous to 529 education savings plans with age-based glide paths. 529 plans auto-adjust asset allocation as the child ages: aggressive when young, conservative near college. Youth hunting pathways should do the same: identify states where points start accumulating at birth/age-12, map the trajectory to first legal hunt (14-16), and show which species become drawable by which birthdays. No hunting platform models this. The existing `YearType = "youth_window"` and `AnchorType = "youth_arc"` types prove this was architecturally anticipated. The `planForAge` field in wizard state captures youth age. | HIGH | Requires: (1) per-state youth license age requirements data, (2) per-state youth point accumulation rules, (3) age-aware draw projection model, (4) dedicated UI section showing "Jake (age 8) -- by age 14, he'll have 6 CO elk points (projected draw: age 19)." Not all states allow NR youth point accumulation -- this needs state-by-state research. |
| **Scouting hunt strategy (dual-purpose detection)** | Analogous to tax-loss harvesting in investing -- a secondary strategy layered on top of primary moves. Tax-loss harvesting sells losing positions to offset gains; scouting hunt detection identifies OTC tags in the same geography as your trophy draw unit, so you can scout your trophy area while actually hunting. Example: "You're building points for WY elk Unit 100. While you wait, buy an OTC CO general elk tag in Unit 76 (30 miles south, same terrain) -- you'll learn the migration patterns and get a hunt." No hunting platform connects these dots. | MEDIUM | Requires: (1) geographic proximity calculation between units (lat/long or region-based), (2) OTC/high-odds filter on nearby units, (3) species and terrain compatibility scoring, (4) presentation as "dual-purpose recommendations" on each build-year roadmap action. The existing `unit-alternates.ts` file suggests this pattern was anticipated. |
| **Live data pipeline with provenance** | Analogous to Bloomberg Terminal's data provenance -- every number has a source, timestamp, and confidence level. The PROJECT.md mandates `VerifiedDatum<T>` wrappers. This isn't a user feature per se, but it enables the "every number is real" promise that differentiates from GoHunt's aggregate data. | HIGH | Infrastructure feature. Scraping framework, data storage, provenance chain, freshness badges. Already identified in PROJECT.md as foundational. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Real-time push notifications** | Users want alerts for deadlines and draw results. | Requires auth, push infrastructure, permission management, and creates notification fatigue. The hunting calendar has ~20-30 events per year -- not enough volume to justify push infrastructure. Users will dismiss/ignore after the novelty wears off. | .ics calendar subscription pushes events to Google Calendar/Apple Calendar natively. Calendar apps already handle notifications, snooze, reminders. The user's existing notification infrastructure does this better than we can. |
| **Social/community feed** | "See what other hunters drew" / "share my success." | Community features are a product in themselves (moderation, abuse, spam, legal liability for game law discussions). GoHunt and HuntTalk forums already serve this. Building community dilutes the advisor value proposition. | Shareable plan links enable 1:1 sharing with hunting buddies. The viral loop is "look at my plan" not "look at everyone's plans." |
| **Tag purchase integration** | "Let me buy my tag right here." | Every state has its own purchase portal with different auth flows, payment systems, and legal requirements. Building a universal tag purchase layer is a multi-year, multi-state legal project. Also: liability if a purchase fails and the user misses a deadline. | Deep links to official F&G purchase pages with pre-filled context (state, species, hunt code). The existing `buyPointsUrl` and `fgUrl` fields on State type do this. |
| **AI chat assistant** | "Ask the advisor questions." | Conversational AI creates expectation of unlimited scope. Users will ask about gear, outfitters, recipes, regulations -- all outside our domain. Hallucination risk is catastrophic in a domain with legal consequences (game law violations). The "advisor" metaphor works because it's structured, not conversational. | Opinionated advisor voice in structured UI cards. Every recommendation has a "why" explanation. The discipline violation system already does this well -- expand the pattern. |
| **GPS/mapping integration** | "Show me the unit on a map." | OnX Hunt owns this space with $100M+ investment. Building a mapping layer is not competitive and creates maintenance burden (land ownership data, trail data, offline maps). | Link to OnX Hunt or Google Maps with unit boundary context. "View Unit 76 on OnX" button. |
| **Multi-state regulatory engine** | "Tell me the exact regulations for my unit." | Regulations change annually, vary by weapon type, season, unit, and license type. A wrong regulation display has legal consequences. State F&G sites are the authoritative source and we can't replicate their accuracy. | Deep links to state-specific regulation pages. "View CO GMU 76 regulations" linking to CPW's unit-specific page. |
| **Automated plan re-generation on every data change** | "Always keep my plan up to date." | Frequent re-generation creates plan instability -- the user sees different recommendations every visit, eroding trust. Financial advisors don't rebalance daily; they rebalance at defined intervals (quarterly, annually, after major events). | Draw results as annual rebalance trigger. Quarterly "portfolio review" prompted by the advisor voice. User-initiated "Refresh Strategy" button. The rebalance engine already handles post-draw adjustments. |

---

## Feature Dependencies

```
[Live Data Pipeline]
    |
    +--enables--> [Opportunistic Discovery Feed] (needs fresh data to surface "new" opportunities)
    +--enables--> ["Since Your Last Visit" Diff] (needs data change detection)
    +--enables--> [Data Provenance Badges] (every number shows source + freshness)

[Intra-Year Season Calendar]
    |
    +--enables--> [Full-Year .ics Subscription] (calendar generates the events)
    +--enhances-> [Advisor Voice] (calendar items get advisor commentary)

[Advisor Voice / Opinionated Recommendations]
    |
    +--enhances-> [Season Calendar] (each item has advisor interpretation)
    +--enhances-> [Savings Tracker] ("you're $400 behind on your CO elk fund")
    +--enhances-> [Discovery Feed] ("this leftover tag is perfect because...")
    +--enhances-> [Diff View] ("since your last visit, here's what I'd change")

[Savings Tracker]
    |
    +--requires-> [UserGoal system] (already exists)
    +--requires-> [Budget DB schema] (already exists in db/budget.ts)
    +--enhances-> [Season Calendar] (savings milestones appear on calendar)

[Shareable Plan Links]
    |
    +--standalone (no dependencies beyond existing StrategicAssessment serialization)
    +--enhances-> [Youth Pathways] (share kid's plan with spouse/family)

[Youth Pathway Optimization]
    |
    +--requires-> [Youth license age data per state] (NEW DATA -- must be researched)
    +--requires-> [Youth point accumulation rules per state] (NEW DATA)
    +--enhances-> [Savings Tracker] ("Jake's elk fund: save $80/mo for 6 years")
    +--enhances-> [Season Calendar] (youth-specific deadlines and age milestones)

[Scouting Hunt Strategy]
    |
    +--requires-> [Unit geographic data] (lat/long or region codes -- partial in sample-units.ts)
    +--requires-> [OTC/leftover detection] (exists in opportunity-finder.ts)
    +--enhances-> [Season Calendar] ("scout trip: CO Unit 76 for dual-purpose recon")
    +--enhances-> [Advisor Voice] ("while you wait for WY elk, hunt CO general for scouting intel")

["Since Your Last Visit" Diff]
    |
    +--requires-> [lastVisitTimestamp tracking] (sessionStorage or Zustand)
    +--enhances-> [Dashboard] (replaces/upgrades Welcome Back card)
    +--partially-requires-> [Live Data Pipeline] (for data-driven diffs; deadline diffs work without it)
```

### Dependency Notes

- **Opportunistic Discovery requires Live Data Pipeline:** Without real data updates, the discovery feed is static after initial plan generation. The opportunity-scorer engine exists but would resurface the same results every time. The feed's value proposition is "new since last check" which requires data that actually changes.
- **Season Calendar enables .ics Subscription:** The subscription endpoint serves events generated by the calendar engine. Build the calendar first, then expose the subscription URL. They share the same event data model.
- **Advisor Voice is not a feature -- it's a presentation layer:** It enhances every other feature but doesn't require any of them. It can be applied incrementally: start with dashboard cards, extend to calendar items, then discovery feed.
- **Savings Tracker backend already exists:** The `db/budget.ts` file defines `SavingsGoal` with all needed fields. This is primarily a frontend build, not a full-stack feature.
- **Youth Pathways requires new domain data:** Unlike other features that build on existing engines, youth pathways needs state-by-state research on youth license ages, youth point accumulation rules, and youth-specific draw allocations. This is the highest-risk feature for unknown unknowns.
- **Shareable Plan Links have zero dependencies:** This is the easiest win with the highest viral impact. Build it first.

---

## MVP Definition

### Launch With (v1) -- Milestone Core

The minimum set to transform the app from "static results" to "living advisor":

- [x] **Intra-year season calendar** -- the most validated user need ("professionalize the scheduling process"); engine already built via `auto-fill.ts`
- [x] **Shareable plan links** -- zero dependencies, highest viral coefficient, lowest complexity
- [x] **Full-year .ics calendar subscription** -- trivial extension of season calendar; makes the advisor "autonomous" via calendar push
- [x] **Advisor voice (initial pass)** -- apply opinionated interpretation to dashboard cards, calendar items, and board state signals

### Add After Validation (v1.x)

Features that build on the core calendar + share + voice foundation:

- [ ] **Savings tracker** -- trigger: users ask "how much should I be saving?" after seeing their roadmap costs on the calendar. Backend exists; frontend build.
- [ ] **"Since your last visit" diff view** -- trigger: returning users have been away 30+ days and need context reinstatement. Upgrades the Welcome Back card.
- [ ] **Scouting hunt strategy** -- trigger: users with 3+ year build phases ask "what can I do while I wait?" Moderate complexity, high perceived value.

### Future Consideration (v2+)

Features requiring significant new data or infrastructure:

- [ ] **Opportunistic discovery feed** -- defer until live data pipeline provides real freshness. Without data updates, the feed is static and misleading. High complexity.
- [ ] **Youth pathway optimization** -- defer until state-by-state youth data is researched and validated. HIGH data risk. The wizard already captures youth age; the pathway engine is the hard part.
- [ ] **Live data pipeline** -- foundational infrastructure. High complexity, high value, but can be built incrementally (start with Oregon CSV, then Utah REST, then others). This is a separate milestone.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority | Dependencies |
|---------|------------|---------------------|----------|--------------|
| Shareable plan links | HIGH | LOW | **P1** | None |
| Intra-year season calendar | HIGH | MEDIUM | **P1** | None (engine exists) |
| Full-year .ics subscription | MEDIUM | LOW | **P1** | Season calendar |
| Advisor voice (initial) | HIGH | MEDIUM | **P1** | None (enhances existing) |
| Savings tracker | MEDIUM | MEDIUM | **P2** | UserGoal system (exists) |
| "Since your last visit" diff | HIGH | MEDIUM | **P2** | lastVisitTimestamp |
| Scouting hunt strategy | MEDIUM | MEDIUM | **P2** | Unit geographic data |
| Opportunistic discovery feed | HIGH | HIGH | **P3** | Live data pipeline |
| Youth pathway optimization | MEDIUM | HIGH | **P3** | Youth state data (new research) |
| Live data pipeline | HIGH | HIGH | **P3** | Separate milestone |

**Priority key:**
- P1: Must have for this milestone -- delivers the "autonomous advisor" promise
- P2: Should have, add in second wave after P1 ships and is validated
- P3: Future milestone -- requires infrastructure or data not yet available

---

## Competitor Feature Analysis

| Feature | GoHunt | onX Hunt | INSIDER/Gohunt | Our Approach |
|---------|--------|----------|-----------------|--------------|
| Season calendar | Generic state-level season tables | No (mapping focus) | Generic draw deadline lists | Personalized to YOUR plan -- only shows deadlines and seasons for species/states in your roadmap, with advisor commentary |
| Savings tracking | None | None | None | Goal-linked hunt funds with monthly targets and projection charts -- no competitor does this |
| Opportunistic discovery | "Leftover tag" lists (generic) | No | Generic tag alert emails | Personalized scoring using your point position, budget, species prefs, and hunt style -- algorithmic curation, not generic lists |
| Youth pathways | None | None | None | Age-aware draw projections, youth-specific point strategies, milestone tracking from current age to first legal hunt -- completely novel |
| Scouting strategy | None (manual research) | GPS/mapping for scouting | None | Algorithmic detection of OTC units near your trophy draw units with terrain compatibility scoring -- no competitor connects these dots |
| Shareable plans | None | No | None | Read-only snapshot URLs showing your full strategy -- enables "show your buddy" viral loop |
| Calendar sync | None | No | Email reminders only | Full .ics subscription that auto-updates in Google Calendar -- the advisor speaks through your calendar |
| Advisor voice | Generic articles | No | Generic recommendations | Every data point has a "so what?" interpretation specific to your portfolio state, budget, and timeline |
| Diff view | None | None | None | Structured "since your last visit" showing deadline changes, draw results, point creep shifts, new opportunities -- completely novel |

**Competitive gap summary:** GoHunt serves the research phase (which state/unit should I consider?). OnX serves the execution phase (I have a tag, help me navigate the unit). Nobody serves the strategic planning phase -- the multi-year, multi-state portfolio management layer between "I want to hunt elk" and "I'm boots on the ground." Every feature in this milestone deepens that moat.

---

## Analogous Domain Patterns -- How Financial Advisors Do This

### 1. Season Calendar = Cash Flow Calendar (Betterment, Personal Capital)

**Pattern:** Financial planning apps show monthly cash flow with income, expenses, and savings mapped to a timeline. Events are categorized (recurring, one-time, projected) and color-coded by type.

**Key UX insights (MEDIUM confidence, training data):**
- Show the YEAR at a glance, not just the next month. Betterment's goal timeline shows all 12 months with key events.
- Group by category (applications, hunts, scouting, prep) not by date. Users think in categories.
- Color-code by urgency: red = deadline within 14 days, amber = within 30, green = on track.
- Include cost totals per month so users can see spending cadence.
- The existing `auto-fill.ts` generates `AutoFillItem` objects with `month`, `itemType`, `priority`, and `estimatedCost` -- this is already the right data shape for a calendar view.

**Adaptation for hunting:**
- Swimlane rows = states (CO, WY, MT, etc.)
- Columns = months (Jan-Dec)
- Items = applications, point purchases, deadlines, hunts, scouting, prep
- Summary row = total monthly cost, total monthly items

### 2. Savings Tracker = Goal-Based Investing (Vanguard, Betterment, Wealthfront)

**Pattern:** Vanguard's goal-based approach assigns every dollar to a purpose: "Retirement," "House Down Payment," "Vacation." Each goal has a target amount, current balance, monthly contribution, and projected completion date. Progress is shown as a ring/bar with percentage funded.

**Key UX insights (MEDIUM confidence, training data):**
- Show projected completion date, not just current balance. "At $200/mo, you'll hit $8,000 by March 2028."
- Show what happens if the user changes the contribution amount: "Increase to $250/mo and you'll be funded 4 months earlier."
- Use traffic lights: green (on track), amber (behind but recoverable), red (significantly behind).
- Group micro-goals under a macro vision: "CO Elk Trip: Tag Fund (65%) + Travel Fund (40%) + Gear Fund (80%)" = Overall 58% funded.

**Adaptation for hunting:**
- Each `UserGoal` gets a linked `SavingsGoal` (the DB schema already supports `stateId` and `speciesId` foreign keys on savings_goals).
- Savings targets derive from the roadmap's cost estimates (`huntYearCost`, `CostLineItem` breakdowns).
- Monthly contribution = target / months remaining.
- Progress rings per goal on the dashboard, with the advisor voice saying "You're $400 behind on your CO elk fund -- increase monthly savings by $50 to get back on track."

### 3. Opportunistic Discovery = Stock Screener + Market Alerts (Robinhood, Fidelity)

**Pattern:** Stock screeners let users define criteria (P/E ratio < 15, dividend yield > 3%) and get a filtered, ranked list of matches. Market alerts notify when a watched stock hits a price target. Robinhood's "Top Movers" surfaces unexpected opportunities.

**Key UX insights (MEDIUM confidence, training data):**
- **Personalized relevance scoring** is the differentiator over generic lists. "This leftover tag matches 4 of your 5 criteria" vs "leftover tags available in CO."
- Show WHY each opportunity matches the user's profile (the existing `whyBullets` array in `OpportunityResult` already does this).
- Allow "dismiss" and "save for later" actions so the feed learns.
- Time-bound urgency: "Leftover tags go on sale July 1 -- 14 days away."

**Adaptation for hunting:**
- The `opportunity-scorer.ts` engine already ranks all state/species combinations by `opportunityScore` using 4 weighted factors.
- What's missing: temporal freshness. The feed needs "new since last check" semantics, which requires data that changes (leftover tag availability dates, deadline changes, draw result releases).
- Without live data pipeline: show "Opportunities matching your profile" as a static section (like Fidelity's screener). With live data: add "New this week" badge (like Robinhood's alerts).

### 4. Youth Pathways = 529 Education Savings (Vanguard, Fidelity)

**Pattern:** 529 plans use age-based glide paths: aggressive allocation when the child is young (100% stocks), shifting to conservative as college approaches (100% bonds). The key insight: the optimization function changes over time based on age.

**Key UX insights (MEDIUM confidence, training data):**
- **Age milestones drive the narrative:** "At age 8, start accumulating. At age 12, eligible for hunter safety. At age 14, first legal hunt. At age 16, can apply independently."
- **Show the acceleration advantage:** "Starting at age 8 gives Jake 6 CO elk preference points by his first legal hunt at 14. Starting at 12 gives him only 2."
- **Compare trajectories:** "Youth pathway vs adult pathway -- Jake draws CO elk 8 years before an adult starting today."
- The constraint tree matters: not all states let minors accumulate points. Not all states let NR youth buy preference points. This is domain-specific data that must be researched per state.

**Adaptation for hunting:**
- The wizard already captures `planForAge` and `youthToggle` in the PortfolioMandate.
- `YearType = "youth_window"` and `AnchorType = "youth_arc"` exist in the type system -- the architecture anticipated this.
- Needs: per-state research on (a) minimum age to hold a license, (b) minimum age to buy preference/bonus points, (c) minimum age to hunt, (d) youth-specific tag allocations or draw advantages.
- Output: age-indexed timeline showing point accumulation and unlock events, linked to savings goals ("Jake's elk fund").

### 5. Scouting Hunt Strategy = Tax-Loss Harvesting (Betterment, Wealthfront)

**Pattern:** Tax-loss harvesting is a secondary strategy layered on primary investment decisions. You don't change your portfolio allocation -- you just add a tax-efficiency optimization on top. Betterment automates this: "We sold X at a loss to offset Y's gains, then bought a correlated asset to maintain exposure."

**Key UX insights (MEDIUM confidence, training data):**
- The user doesn't need to understand the strategy -- the advisor detects it and suggests it. "While you build points for WY elk, here's a dual-purpose move: hunt CO general elk in a unit adjacent to your WY target."
- The value proposition is secondary benefit stacking: one action serves two purposes (just like tax-loss harvesting where the sale serves both portfolio exposure and tax optimization).
- Must be opt-in/advisory, not automatic: the user decides whether to add the scouting hunt to their plan.

**Adaptation for hunting:**
- For each build-year action (buying points for a premium unit), scan for OTC or high-odds units:
  - In the same state (same species, easier units)
  - In adjacent states with similar terrain
  - With overlapping season dates
- Score by: geographic proximity to dream unit, terrain similarity, season overlap, cost
- Present as: "Dual-Purpose Move: While building for WY Unit 100 elk, hunt CO Unit 76 (30 miles south, similar alpine terrain). You'll learn the migration patterns that cross the state line."

---

## Cross-Cutting Feature: Advisor Voice Implementation

The advisor voice is not a standalone feature -- it's a pattern applied across all features. Based on how financial advisory platforms present recommendations:

### Voice Principles (from Betterment/Wealthfront/Personal Capital patterns)

1. **Interpret, don't just display.** "Portfolio Health: 72" becomes "Your portfolio is solid but has room to grow. Your hunt frequency is below target -- consider adding a gap-year OTC hunt."
2. **Be specific, not generic.** "Save more" becomes "Increase your CO elk fund by $50/mo to be fully funded by your Year 4 draw window."
3. **Acknowledge uncertainty.** "Point creep is trending up in WY elk -- your projected draw year shifted from 2030 to 2031. Here's what that means for your budget."
4. **Recommend actions, not just observations.** Every insight ends with "Here's what I'd do" -- a clickable CTA that takes the user to the relevant action.
5. **Use temporal context.** "Since your last visit (34 days ago), CO released draw results and your WY elk application deadline is 21 days away."

### Implementation Pattern

```typescript
interface AdvisorInsight {
  id: string;
  category: "action_required" | "opportunity" | "status_update" | "warning";
  headline: string;          // "CO Draw Results Are In"
  interpretation: string;    // "You didn't draw CO elk this year, but you gained a preference point."
  recommendation: string;    // "Stay the course -- you're now at 4 points, projected draw in Year 3."
  urgency: "immediate" | "soon" | "informational";
  cta?: {
    label: string;           // "Record Draw Result"
    href: string;            // "/goals"
  };
  dismissible: boolean;
  source: "board_state" | "discipline" | "deadline" | "draw_result" | "point_creep" | "opportunity";
}
```

This type already has a spiritual predecessor in the existing `BoardSignal` type. The advisor insight pattern extends it with interpretation, recommendation, and CTA.

---

## Complexity Budget

Estimated implementation effort for each feature (in engineering days, solo developer):

| Feature | Engine Work | UI Work | Data Work | Total | Risk |
|---------|-----------|---------|-----------|-------|------|
| Shareable plan links | 1 day | 1 day | 0 | **2 days** | Low |
| Intra-year season calendar | 0 (exists) | 3-4 days | 0 | **3-4 days** | Low |
| .ics calendar subscription | 1 day | 0.5 day | 0 | **1.5 days** | Low |
| Advisor voice (initial) | 1 day | 2-3 days | 0 | **3-4 days** | Low |
| "Since your last visit" diff | 2 days | 2 days | 0 | **4 days** | Medium |
| Savings tracker | 1 day | 3 days | 0 (schema exists) | **4 days** | Low |
| Scouting hunt strategy | 2-3 days | 2 days | 1 day (geo data) | **5-6 days** | Medium |
| Opportunistic discovery feed | 2 days | 3 days | Depends on pipeline | **5+ days** | High (data dependency) |
| Youth pathway optimization | 3-4 days | 3 days | 3-5 days (state research) | **9-12 days** | High (data unknowns) |

**Total milestone estimate:** ~37-42 engineering days for all features, with P1 features at ~10-13 days.

---

## Sources

- Codebase analysis: `src/lib/engine/auto-fill.ts`, `opportunity-finder.ts`, `opportunity-scorer.ts`, `calendar-export.ts`, `season-parser.ts`, `portfolio-health.ts`, `board-state.ts`, `journey-data.ts`, `db/budget.ts`, `store.ts`, `types/index.ts`
- PROJECT.md milestone definition and user validation quotes
- Existing `.plan` build plan for Month 9 retention features
- Financial advisory platform patterns (Betterment, Wealthfront, Vanguard, Personal Capital, Mint): training data, MEDIUM confidence
- 529 education savings plan patterns: training data, MEDIUM confidence
- Tax-loss harvesting UX patterns: training data, MEDIUM confidence
- iCalendar RFC 5545 specification: training data, HIGH confidence (stable standard)

**Confidence note:** All financial platform comparisons are based on training data (cutoff May 2025). These platforms may have changed features since then. The patterns described (goal-based tracking, cash flow calendars, personalized screeners) are well-established and unlikely to have fundamentally changed, but specific UX details should be validated against current versions before implementation.

---
*Feature research for: Autonomous hunting advisor platform*
*Researched: 2026-02-21*
