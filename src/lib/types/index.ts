// ============================================================================
// Core Domain Types for Odyssey Outdoors
// ============================================================================

// ============================================================================
// Board State System (Strategic Product Sharpening v2)
// ============================================================================

export type BoardStatus =
  | "position_strong"
  | "on_track"
  | "overexposed"
  | "plateau_detected"
  | "conversion_approaching"
  | "conversion_ready"
  | "conversion_executed"
  | "off_track";

export interface BoardSignal {
  type: "positive" | "warning" | "critical";
  message: string;
}

export interface BoardState {
  status: BoardStatus;
  primaryFocus: string;         // e.g. "CO Elk — Year 3 of 5"
  cadence: string;              // e.g. "1.2 hunts/yr — target 1.5"
  capitalDeployed: number;      // total $ deployed this year
  capitalBudgeted: number;      // total $ budgeted this year
  statesActive: number;
  speciesActive: number;
  lastUpdated: string;          // ISO date
  signals: BoardSignal[];
}

// ============================================================================
// Advisor Voice System (Phase 5)
// ============================================================================

/** Urgency calibration for advisor tone */
export type AdvisorUrgency = "immediate" | "soon" | "informational" | "positive";

/** Category of advisor insight for filtering and grouping */
export type AdvisorInsightCategory =
  | "deadline"
  | "portfolio"
  | "point_creep"
  | "discipline"
  | "milestone"
  | "temporal"
  | "calendar"
  | "savings"     // Phase 8
  | "scouting";   // Phase 10

/** CTA target -- where the user should go */
export interface AdvisorCTA {
  label: string;        // e.g., "Apply Now", "Review Deadlines"
  href: string;         // internal path like "/deadlines" or external F&G URL
  external?: boolean;   // true for F&G portal links
}

/** Extended insight with interpretation layer -- wraps a BoardSignal */
export interface AdvisorInsight {
  id: string;                          // Stable ID for dedup, e.g., "deadline-CO-elk"
  signal: BoardSignal;                 // The underlying data signal
  category: AdvisorInsightCategory;
  urgency: AdvisorUrgency;
  interpretation: string;              // "So what?" -- what this means for the user
  recommendation: string;              // What to do about it
  cta: AdvisorCTA;                     // Clickable action
  portfolioContext?: string;           // User-specific: "Your 3 CO elk points..."
  temporalContext?: string;            // "Since your last visit (12 days ago)..."
  confidence?: "verified" | "estimated" | "stale" | "user_reported";  // Matches DataConfidence
  expiresAt?: string;                  // ISO date -- insight only relevant until this date
}

// ============================================================================
// Diff Engine (Phase 9)
// ============================================================================

export type DiffSource = 'deadline_proximity' | 'draw_result' | 'point_creep' | 'new_opportunity';
export type DiffCategory = 'action_required' | 'opportunity' | 'status_update' | 'warning';

export interface DiffItem {
  id: string;                          // Stable, deterministic: "diff-deadline-CO-elk"
  source: DiffSource;
  category: DiffCategory;
  stateId: string;
  speciesId: string;
  headline: string;                    // Short: "CO Elk deadline now urgent"
  interpretation: string;              // Advisor voice with temporal context
  recommendation: string;              // Actionable next step
  cta: AdvisorCTA;                     // Reuse existing AdvisorCTA type
  delta: number;                       // Change magnitude (for sorting)
  previousValue: string | number;      // What it was at last visit
  currentValue: string | number;       // What it is now
}

// ============================================================================
// Scouting Strategy (Phase 10)
// ============================================================================

export interface ScoutingTarget {
  targetStateId: string;
  targetSpeciesId: string;
  targetUnitCode: string;
  targetYearsAway: number;
  strategicReason: string;
}

// ============================================================================
// Savings & Budget Tracker (Phase 8)
// ============================================================================

export type SavingsStatus = "green" | "amber" | "red";

export interface SavingsContribution {
  amount: number;
  date: string;       // ISO date string
  note?: string;      // "February deposit", "Tax refund bonus"
}

export interface SavingsGoal {
  id: string;
  goalId: string;              // Links to UserGoal.id (SAV-02)
  currentSaved: number;        // Running total of contributions
  monthlySavings: number;      // User-set monthly contribution amount
  contributions: SavingsContribution[];  // Audit trail
  createdAt: string;           // ISO date
  updatedAt: string;           // ISO date
}

// ============================================================================
// Year Type & Move Tag System
// ============================================================================

export type YearType = "build" | "positioning" | "burn" | "recovery" | "youth_window";
export type MoveTag = "primary_play" | "opportunity_play" | "hold_preserve" | "locked_anchor";

export const YEAR_TYPE_LABELS: Record<YearType, string> = {
  build: "Build Year",
  positioning: "Positioning Year",
  burn: "Burn Year",
  recovery: "Recovery Year",
  youth_window: "Youth Window",
};

export const MOVE_TAG_LABELS: Record<MoveTag, string> = {
  primary_play: "Primary Play",
  opportunity_play: "Opportunity Play",
  hold_preserve: "Hold",
  locked_anchor: "Locked Anchor",
};

/** Map legacy phase values to new YearType */
export function migratePhaseToYearType(phase: string): YearType {
  const map: Record<string, YearType> = {
    building: "build",
    burn: "burn",
    gap: "recovery",
    trophy: "burn",
  };
  return map[phase] ?? "build";
}

// ============================================================================
// Discipline Rule Engine
// ============================================================================

export type DisciplineRuleId =
  | "budget_concentration"
  | "premium_overload"
  | "build_fatigue"
  | "cadence_below_target"
  | "plateau_detected"
  | "strategic_drift"
  | "point_abandonment";

export interface DisciplineViolation {
  ruleId: DisciplineRuleId;
  severity: "info" | "warning" | "critical";
  observation: string;
  implication: string;
  recommendation: string;
  affectedStates?: string[];
  affectedSpecies?: string[];
  affectedYears?: number[];
}

// ============================================================================
// Lockable Anchors
// ============================================================================

export type AnchorType = "species" | "state" | "youth_arc" | "emotional";

export interface LockedAnchor {
  id: string;
  type: AnchorType;
  label: string;                // "Dall Sheep in AK"
  stateId?: string;
  speciesId?: string;
  reason: string;               // "Once in a lifetime dream"
  createdAt: string;
}

// ============================================================================
// Portfolio Mandate (Onboarding Output)
// ============================================================================

export interface PortfolioMandate {
  annualBudgetCeiling: number;
  annualHuntFrequencyTarget: number;
  speciesPriorityRanking: string[];
  trophyVsOpportunityLeaning: TrophyVsMeat;
  statesInPlay: string[];
  timeHorizonYears: 5 | 10 | 15 | 20 | 25;
  youthToggle: boolean;
  youthAge?: number;
  homeState: string;
  homeCity: string;
  experienceLevel: ExperienceLevel;
  huntStyle: HuntStyle;
  existingPoints: Record<string, Record<string, number>>;
  lockedAnchors: LockedAnchor[];
}

// ============================================================================
// Experience & Preference Types (moved from store.ts for shared access)
// ============================================================================

export type ExperienceLevel = "never_hunted_west" | "1_2_trips" | "3_5_trips" | "veteran";
export type TrophyVsMeat = "trophy_focused" | "lean_trophy" | "balanced" | "lean_meat" | "meat_focused";

// ============================================================================
// Point System & Base Types
// ============================================================================

export type PointSystemType =
  | "preference"       // CO (true preference, 80/20 hybrid)
  | "hybrid"           // WY (75/25), OR (75/25)
  | "bonus"            // AZ (not squared)
  | "bonus_squared"    // NV (squared)
  | "dual"             // MT (preference for combo, bonus squared for special), UT
  | "random"           // ID, NM (pure lottery)
  | "preference_nr";   // KS (NR deer only)

export type TerrainType = "Alpine" | "Timber" | "Desert" | "Mixed" | "Sagebrush" | "Prairie";
export type PressureLevel = "Low" | "Moderate" | "High";
export type HuntStyle = "diy_truck" | "diy_backpack" | "guided" | "drop_camp";
export type PlanFocus = "trophy" | "opportunity" | "balanced";
export type GoalStatus = "active" | "dream" | "completed";
export type DreamHuntTier = "once_in_a_lifetime" | "trophy" | "bucket_list" | "attainable";
export type WeaponType = "archery" | "rifle" | "muzzleloader";
export type SeasonPreference = "early" | "mid" | "late" | "any";
export type PlanStatus = "draft" | "active" | "completed";
export type ApplicationApproach = "per_unit" | "per_state" | "per_region";

// ============================================================================
// Fee & Cost Types
// ============================================================================

export interface FeeLineItem {
  name: string;           // "Qualifying License", "Application Fee", "Preference Point"
  amount: number;
  frequency: "annual" | "per_species" | "once";
  required: boolean;
  notes?: string;         // "Required before applying"
  sourceUrl?: string;     // Official F&G URL where this fee is documented
  lastVerified?: string;  // ISO date when fee was last verified (e.g. "2025-11-15")
}

export interface CostLineItem {
  label: string;           // "CO Qualifying License"
  amount: number;
  category: "license" | "application" | "points" | "tag" | "travel";
  stateId: string;
  speciesId?: string;
  url?: string;            // Link to purchase
  dueDate?: string;        // Application deadline
  notes?: string;          // Additional context
}

// ============================================================================
// Milestone & Goal Types
// ============================================================================

export interface Milestone {
  id: string;
  planId?: string;
  title: string;           // "Buy WY elk preference point"
  description: string;     // "Purchase through WY Game & Fish online portal"
  type: "buy_points" | "apply" | "hunt" | "scout" | "deadline";
  stateId: string;
  speciesId: string;
  year: number;
  dueDate?: string;        // "2026-03-15"
  drawResultDate?: string; // When draw results come out
  url?: string;            // Direct link to F&G
  costs: CostLineItem[];   // Itemized costs for this milestone
  totalCost: number;
  completed: boolean;
  completedAt?: string;
  drawOutcome?: "drew" | "didnt_draw" | null; // Set after draw results are released
  drawOutcomeAt?: string;                     // ISO date when outcome was recorded
  applicationApproach?: ApplicationApproach;
  applicationTip?: string; // "Apply per-unit. List first + second choice."
}

export interface DreamHunt {
  id: string;
  title: string;           // "Caribou in Alaska"
  description: string;
  stateOrRegion: string;   // "AK" or "Canada"
  species: string;
  estimatedTimelineYears: number;
  annualPointCost?: number; // Optional annual investment
  notes: string;           // "Discretionary $XX/yr at AK F&G"
}

// ============================================================================
// Budget & Style Types
// ============================================================================

export interface BudgetModel {
  pointYearBudget: number;   // Low-cost years (building points only)
  huntYearBudget: number;    // Years with actual hunts (tags, travel, gear)
}

export interface HuntStylePreference {
  primary: HuntStyle;        // "diy_truck"
  openToGuided: boolean;     // "Would do a guided hunt for a special tag"
  guidedForSpecies?: string[]; // Which species they'd go guided for
}

// ============================================================================
// State Scoring Types (Visible Reasoning)
// ============================================================================

export interface StateScoreFactor {
  label: string;           // "Elevation Compatibility"
  score: number;           // +10
  maxScore: number;        // 15
  explanation: string;     // "6,000-9,500 ft range is manageable"
}

export interface StateScoreBreakdown {
  stateId: string;
  totalScore: number;
  maxPossibleScore: number;
  factors: StateScoreFactor[];
}

// ============================================================================
// v3: Travel & Logistics Types
// ============================================================================

export interface StateLogistics {
  primaryAirport: string;        // "DEN (Denver International)"
  secondaryAirports?: string[];  // ["GJT (Grand Junction)", "EGE (Eagle/Vail)"]
  rentalCarNotes: string;        // "4WD mandatory for forest roads after rain."
  meatProcessing: string;        // "Ship via FedEx cold pack — $150-250."
  drivingNotes: string;          // "2-3 hrs from DEN to Unit 11."
}

export interface PointOnlyApplication {
  instructions: string;          // "Select 'Preference Point Only' as your first choice"
  huntCode?: string;             // "PP001"
  secondChoiceTactic?: string;   // "List point-only first, real unit code second."
  purchaseUrl: string;           // Direct URL
  deadline: string;              // "April 7, 2026"
}

export interface SeasonTier {
  tier: string;                  // "1st Rifle", "2nd Rifle", "Archery"
  dates: string;                 // "Oct 14-18"
  notes: string;                 // "Best for rut action."
  bestFor: string;               // "truck_camp" | "backpack" | "any"
}

export interface UnitTacticalNotes {
  accessMethod: string;           // "Truck-accessible with 2WD to trailheads."
  glassingStrategy?: string;      // "Morning: glass south-facing sage parks."
  campingOptions: string;         // "Dispersed camping on BLM."
  bestSeasonTier?: string;        // "2nd Rifle"
  bestArrivalDate?: string;       // "Arrive Oct 20"
  typicalHuntLength: string;      // "5-7 days"
  trophyExpectation?: string;     // "260-300 class bulls."
  waterSources?: string;          // "Stock tanks and natural springs."
  cellService?: string;           // "Verizon spotty. AT&T none."
  proTip?: string;                // "Camp at X trailhead, glass Y ridge at first light"
}

// ============================================================================
// v3: Assessment Output Types
// ============================================================================

export interface TravelLogisticsRoute {
  stateId: string;
  airport: string;
  flightCost: number;
  flightTime: string;
  direct: boolean;
  rentalCarNeeded: boolean;
  rentalNotes: string;
  driveToHuntArea: string;
  meatShipping: string;
}

export interface TravelLogistics {
  homeAirport: string;
  stateRoutes: TravelLogisticsRoute[];
  totalTravelBudget: number;
  tip: string;
}

export interface SeasonCalendarEntry {
  stateId: string;
  species: string;
  tiers: {
    name: string;
    dates: string;
    recommendation: string;
    arrivalDate: string;
  }[];
}

export interface PointOnlyGuideEntry {
  stateId: string;
  stateName: string;
  instructions: string;
  huntCode?: string;
  secondChoiceTactic?: string;
  deadline: string;
  annualCost: number;
  url: string;
  inPlan?: boolean;          // true if state is in user's active plan
}

// ============================================================================
// State Type
// ============================================================================

export interface State {
  id: string;
  name: string;
  abbreviation: string;
  pointSystem: PointSystemType;
  pointSystemDetails: {
    preferencePct?: number;
    randomPct?: number;
    squared?: boolean;
    description: string;
  };
  fgUrl: string;
  buyPointsUrl: string;
  applicationDeadlines: Record<string, { open: string; close: string }>;
  // IANA timezone for deadline interpretation (e.g. "America/Denver")
  deadlineTimezone?: string;
  // Legacy flat fees — NR (still used for backwards compat)
  licenseFees: {
    qualifyingLicense?: number;
    appFee?: number;
    pointFee?: number;
  };
  // Itemized NR fee schedule
  feeSchedule: FeeLineItem[];
  // Resident flat fees (mirrors licenseFees structure)
  residentLicenseFees?: {
    qualifyingLicense?: number;
    appFee?: number;
    pointFee?: number;
  };
  // Itemized resident fee schedule
  residentFeeSchedule?: FeeLineItem[];
  // Resident point costs (per species) — defaults to NR pointCost if absent
  residentPointCost?: Record<string, number>;
  // Application approach
  applicationApproach: ApplicationApproach;
  applicationApproachDescription: string;
  applicationTips: string[];
  // Species that are once-in-a-lifetime draws (successful draw = lifetime ban from species)
  onceInALifetime?: string[];
  // Which species this state offers
  availableSpecies: string[];
  // Draw result dates per species
  drawResultDates?: Record<string, string>;
  pointCost: Record<string, number>;
  // Actual tag/permit costs per species when drawn (NR)
  tagCosts: Record<string, number>;
  // Resident tag/permit costs per species when drawn
  residentTagCosts?: Record<string, number>;
  color: string;
  lastScrapedAt?: string;
  sourceUrl?: string;           // Authoritative F&G URL for this state's data
  dataVersion?: string;         // Semver of the state data snapshot (e.g. "2026.1")
  // v3: Travel logistics
  logistics?: StateLogistics;
  // v3: Point-only application instructions
  pointOnlyApplication?: PointOnlyApplication;
  // v3: Season tiers
  seasonTiers?: SeasonTier[];
  // v7: Scraped season dates keyed by "speciesId:seasonType"
  seasonDates?: Record<string, { start: string; end: string }>;
  // v3: Advisor personality narrative
  statePersonality?: string;
  // Niche insider facts that affect strategy (e.g., "Draw elk? You auto-get a spring bear tag")
  nicheFacts?: string[];
}

export interface Species {
  id: string;
  name: string;
  icon: string;
}

export interface Unit {
  id: string;
  stateId: string;
  speciesId: string;
  unitCode: string;
  unitName?: string;
  successRate: number;
  trophyRating: number;
  pointsRequiredResident: number;
  pointsRequiredNonresident: number;
  terrainType: TerrainType[];
  pressureLevel: PressureLevel;
  elevationRange: [number, number];
  publicLandPct: number;
  tagQuotaNonresident: number;
  seasonDates?: Record<string, { start: string; end: string }>;
  drawData?: {
    year: number;
    applicants: number;
    tags: number;
    oddsPercent: number;
  }[];
  notes?: string;
  // v3: Tactical hunt notes
  tacticalNotes?: UnitTacticalNotes;
  nearestAirport?: string;
  driveTimeFromAirport?: string;
}

// ============================================================================
// User Data Types
// ============================================================================

export interface UserPoints {
  id: string;
  userId: string;
  stateId: string;
  speciesId: string;
  points: number;
  pointType: "preference" | "bonus";
  yearStarted?: number;
}

export interface UserPlan {
  id: string;
  userId: string;
  name: string;
  durationYears: number;
  annualBudgetMin: number;
  annualBudgetMax: number;
  huntStyle: HuntStyle;
  focus: PlanFocus;
  speciesPriority: string[];
  targetStates: string[];
  roadmap: RoadmapYear[];
  status: PlanStatus;
  wizardStep: number;
  wizardData?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Roadmap Types
// ============================================================================

/** Legacy phase values for backwards compat */
export type LegacyPhase = "building" | "burn" | "gap" | "trophy";

export interface RoadmapYear {
  year: number;
  phase: YearType | LegacyPhase;
  phaseLabel?: string;          // "Build Year", "Burn Year", etc. (new assessments always set this)
  actions: RoadmapAction[];
  estimatedCost: number;
  isHuntYear: boolean;
  pointYearCost: number;
  huntYearCost: number;
  /** Per-state narrative for this year (key = stateId). Generated by engine. */
  stateNarratives?: Record<string, string>;
}

export interface RoadmapAction {
  type: "apply" | "buy_points" | "hunt" | "scout";
  stateId: string;
  speciesId: string;
  unitCode?: string;
  description: string;
  estimatedDrawOdds?: number;
  cost: number;
  costs: CostLineItem[];    // Itemized cost breakdown
  dueDate?: string;          // Application deadline
  url?: string;              // Direct link to F&G
  moveTag?: MoveTag;         // Strategic role of this action (new assessments always set this)
  locked?: boolean;          // User-locked anchor (engine cannot override)
  lockReason?: string;       // "Dream species", "Youth arc", etc.
}

// ============================================================================
// Goal Types
// ============================================================================

export interface UserGoal {
  id: string;
  userId: string;
  planId?: string;
  title: string;
  speciesId: string;
  stateId: string;
  unitId?: string;
  targetYear: number;
  projectedDrawYear?: number;
  status: GoalStatus;
  notes?: string;
  milestones: Milestone[];  // Actionable steps with due dates, costs, links
  weaponType?: WeaponType;
  seasonPreference?: SeasonPreference;
  huntStyle?: HuntStyle;
  trophyDescription?: string;
  dreamTier?: DreamHuntTier;
}

// ============================================================================
// Cost & Budget Types
// ============================================================================

export interface CostEstimate {
  pointCostPerYear: number;
  totalPointCost: number;
  estimatedTagCost: number;
  estimatedLicenseFees: number;
  totalEstimatedCost: number;
  yearsToAccumulate: number;
  annualSubscriptionCost: number;
}

export interface BudgetTier {
  id: string;
  label: string;
  sublabel: string;
  min: number;
  max: number;
}

// ============================================================================
// Unit Scoring Types (6-Factor Transparent Scoring)
// ============================================================================

export interface UnitScoreResult {
  totalScore: number;
  maxPossibleScore: number;
  factors: UnitScoreFactor[];
}

export interface UnitScoreFactor {
  label: string;
  score: number;
  maxScore: number;
  explanation: string;
}

export interface UnitScoreInput {
  weaponType?: "archery" | "rifle" | "muzzleloader";
  seasonPreference?: "early" | "mid" | "late" | "any";
  userPoints?: number;
  huntStyle?: HuntStyle;
}

// ============================================================================
// Opportunity Finder Types
// ============================================================================

export type OpportunityTier = "excellent" | "good" | "moderate" | "long_term";

export interface OpportunityResult {
  stateId: string;
  speciesId: string;

  // State+species metadata (always present)
  pointSystem: PointSystemType;
  pointSystemLabel: string;
  annualPointCost: number;
  applicationDeadline?: { open: string; close: string };
  isOnceInALifetime: boolean;

  // User-specific
  userPoints: number;
  pointsRequired: number;
  yearsToUnlock: number;

  // Scoring
  opportunityScore: number;
  pointPositionScore: number;
  drawAccessScore: number;
  huntQualityScore: number;
  costScore: number;

  // Quality (optional — only with unit data)
  hasUnitData: boolean;
  bestUnit?: {
    unitCode: string;
    unitName: string;
    successRate: number;
    trophyRating: number;
    publicLandPct: number;
    pressureLevel: string;
  };
  unitCount: number;

  // Draw access classification
  drawAccessType: "otc" | "high_odds_draw" | "competitive_draw" | "limited_draw" | "unknown_draw";

  // Explanation
  whyBullets: string[];
  topReason: string;
  tier: OpportunityTier;
}

export interface DrawHistoryEntry {
  year: number;
  applicants: number | null;
  tagsAvailable: number | null;
  tagsIssued: number | null;
  oddsPercent: number | null;
  minPointsDrawn: number | null;
}

// ============================================================================
// Capital Allocator Types (Master Allocator Blueprint)
// ============================================================================

/** Point Creep Velocity — average annual inflation of point requirements */
export interface PCVResult {
  pcv: number;                         // Points per year inflation rate
  isDeadAsset: boolean;                // PCV >= earnRate → can never draw
  trend: "accelerating" | "stable" | "decelerating";
  dataPoints: number;                  // How many years of history were used
  confidence: "high" | "medium" | "low"; // Based on data availability
}

/** Dynamic Time-To-Draw incorporating PCV */
export interface TTDResult {
  years: number;                       // Years until drawable (Infinity if dead asset)
  targetYear: number;                  // Calendar year of expected draw
  isReachable: boolean;                // False if PCV >= earn rate
  projectedPointsAtDraw: number;       // What you'll have when you draw
  projectedRequiredAtDraw: number;     // What will be required when you draw
}

/** Monte Carlo cumulative probability over a time horizon */
export interface MonteCarloResult {
  singleYearOdds: number;             // p: single-year draw probability (0-1)
  cumulativeOdds: number;             // C = 1 - (1-p)^n over the full horizon
  yearByYear: { year: number; cumulative: number }[]; // Running cumulative
  medianDrawYear: number | null;       // Year at which cumulative > 50%, null if never
  horizonYears: number;                // n: how many years projected
}

/** Capital classification for a fee/cost item */
export type CapitalType = "sunk" | "floated" | "contingent";

/** Fee with refund classification */
export interface ClassifiedFee {
  label: string;
  amount: number;
  stateId: string;
  speciesId?: string;
  capitalType: CapitalType;           // sunk = non-refundable, floated = refundable if unsuccessful
  refundPolicy?: string;              // "Full refund if not drawn", "Non-refundable"
}

/** Capital summary for the entire portfolio */
export interface CapitalSummary {
  sunkCapital: number;                 // Total non-refundable (app fees, points, licenses)
  floatedCapital: number;              // Total refundable-if-unsuccessful (upfront tag fees)
  contingentCapital: number;           // Tag costs IF drawn (not yet committed)
  totalDeployed: number;               // sunk + floated
  totalExposure: number;               // sunk + floated + contingent
  byState: { stateId: string; sunk: number; floated: number; contingent: number }[];
  classifiedFees: ClassifiedFee[];
}

/** Burn Rate row — per state/species point position snapshot */
export interface BurnRateEntry {
  stateId: string;
  speciesId: string;
  currentPoints: number;
  requiredPoints: number;
  pcv: number;                         // Point Creep Velocity
  pcvTrend: "accelerating" | "stable" | "decelerating";
  etaYear: number;                     // Projected draw year
  isDeadAsset: boolean;                // True if PCV >= earn rate
  drawType: "preference" | "lottery" | "bonus";  // Simplified draw mechanism
  cumulativeOdds?: number;             // For lottery states: 10-year cumulative
}

/** Annual status classification for the status ticker */
export type AnnualStatusTag = "build" | "lottery" | "dividend" | "burn" | "recovery";

export interface AnnualStatusEntry {
  stateId: string;
  tag: AnnualStatusTag;
  label: string;                       // "WY" or "CO Elk"
}

export interface YearStatusTicker {
  year: number;
  entries: AnnualStatusEntry[];
  summary: string;                     // "BUILD (WY, CO) + LOTTERY (NM) + DIVIDEND (MT OTC)"
}

// ============================================================================
// Strategic Assessment Types (Roadmap Generator Output)
// ============================================================================

export interface MacroSummary {
  costByState: { stateId: string; annualCost: number; pctOfTotal: number }[];
  costByYear: { year: number; pointCosts: number; huntCosts: number; totalCost: number }[];
  huntTimeline: { year: number; stateId: string; speciesId: string; type: "apply" | "hunt" | "buy_points" }[];
  portfolioDiversity: number; // 0-100 score
  annualSubscription: number;
  tenYearTotal: number;
  plannedHunts: number;
}

export interface BudgetBreakdown {
  pointYearCost: number;
  pointYearItems: CostLineItem[];
  huntYearCost: number;
  huntYearItems: CostLineItem[];
  tenYearProjection: {
    year: number;
    isHuntYear: boolean;
    cost: number;
    items: CostLineItem[];
  }[];
}

export interface StateRecommendation {
  stateId: string;
  role: "primary" | "secondary" | "wildcard" | "long_term";
  roleDescription: string;
  reason: string;           // Multi-sentence personalized reasoning
  annualCost: number;
  annualCostItems: CostLineItem[];
  bestUnits: {
    unitCode: string;
    unitName: string;
    drawTimeline: string;   // "Year 3-5 with preference points"
    drawYears: number;      // 0 = drawable now, 30 = cap (effectively never)
    drawConfidence?: { optimistic: number; expected: number; pessimistic: number };
    successRate: number;
    trophyRating: number;
    tacticalNotes?: UnitTacticalNotes;
    nearestAirport?: string;
    driveTimeFromAirport?: string;
  }[];
  pointStrategy: string;
  scoreBreakdown: StateScoreBreakdown;
}

export interface AlsoConsideredState {
  stateId: string;
  totalScore: number;
  maxPossibleScore: number;
  topReasons: string[];     // Top 2-3 factor explanations
  annualCost: number;
  speciesAvailable: string[];
}

export interface StrategicAssessment {
  id: string;
  profileSummary: string;
  strategyOverview: string;
  stateRecommendations: StateRecommendation[];
  alsoConsidered?: AlsoConsideredState[];
  roadmap: RoadmapYear[];
  insights: string[];
  keyYears: { year: number; description: string }[];
  financialSummary: {
    annualSubscription: number;
    tenYearTotal: number;
    yearOneInvestment: number;
    roi: string;
  };
  macroSummary: MacroSummary;
  budgetBreakdown: BudgetBreakdown;
  stateScoreBreakdowns: StateScoreBreakdown[];
  milestones: Milestone[];
  dreamHuntRecommendations: DreamHunt[];
  // v3: Curated logistics and guides
  travelLogistics?: TravelLogistics;
  seasonCalendar?: SeasonCalendarEntry[];
  pointOnlyGuide?: PointOnlyGuideEntry[];
  createdAt: string;
  // v4: Strategic Product Sharpening
  boardState?: BoardState;
  disciplineViolations?: DisciplineViolation[];
  portfolioMandate?: PortfolioMandate;
  lockedAnchors?: LockedAnchor[];
}
