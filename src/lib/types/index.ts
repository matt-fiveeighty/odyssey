// ============================================================================
// Core Domain Types for Odyssey Outdoors
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
}

export interface CostLineItem {
  label: string;           // "CO Qualifying License"
  amount: number;
  category: "license" | "application" | "points" | "tag" | "travel";
  stateId: string;
  speciesId?: string;
  url?: string;            // Link to purchase
  dueDate?: string;        // Application deadline
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
  applicationDeadlines: {
    elk?: { open: string; close: string };
    mule_deer?: { open: string; close: string };
    bear?: { open: string; close: string };
    moose?: { open: string; close: string };
    whitetail?: { open: string; close: string };
  };
  // Legacy flat fees (still used for backwards compat)
  licenseFees: {
    qualifyingLicense?: number;
    appFee?: number;
    pointFee?: number;
  };
  // Itemized fee schedule
  feeSchedule: FeeLineItem[];
  // Application approach
  applicationApproach: ApplicationApproach;
  applicationApproachDescription: string;
  applicationTips: string[];
  // Which species this state offers
  availableSpecies: string[];
  // Draw result dates per species
  drawResultDates?: Record<string, string>;
  pointCost: Record<string, number>;
  color: string;
  lastScrapedAt?: string;
  // v3: Travel logistics
  logistics?: StateLogistics;
  // v3: Point-only application instructions
  pointOnlyApplication?: PointOnlyApplication;
  // v3: Season tiers
  seasonTiers?: SeasonTier[];
  // v3: Advisor personality narrative
  statePersonality?: string;
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

export interface RoadmapYear {
  year: number;
  phase: "building" | "burn" | "gap" | "trophy";
  actions: RoadmapAction[];
  estimatedCost: number;
  isHuntYear: boolean;
  pointYearCost: number;
  huntYearCost: number;
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
    successRate: number;
    trophyRating: number;
    tacticalNotes?: UnitTacticalNotes;
    nearestAirport?: string;
    driveTimeFromAirport?: string;
  }[];
  pointStrategy: string;
  scoreBreakdown: StateScoreBreakdown;
}

export interface StrategicAssessment {
  id: string;
  profileSummary: string;
  strategyOverview: string;
  stateRecommendations: StateRecommendation[];
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
}
