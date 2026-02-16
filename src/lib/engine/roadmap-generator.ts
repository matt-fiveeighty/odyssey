/**
 * Strategic Roadmap Generator v2
 *
 * Generates a personalized 10-year strategic assessment based on the user's
 * consultation intake. Thinks like a veteran hunting advisor — considers the
 * hunter's location, experience, budget, physical capabilities, and goals
 * to recommend specific states, units, and a phased timeline.
 *
 * v2 Additions:
 * - Dual budget (point-year vs hunt-year)
 * - Mixed hunt style (primarily DIY + open to guided)
 * - State score breakdowns (visible factor-by-factor reasoning)
 * - Itemized cost breakdowns per action
 * - Macro summary data (chart-ready)
 * - Milestone generation for goals page
 * - Dream hunt recommendations
 *
 * Portfolio management philosophy:
 * - Years 1-3: Building phase (accumulate points, take OTC/random hunts)
 * - Years 4-5: First burn (spend mid-tier points on quality hunts)
 * - Year 6: Gap year (rebuild, reassess, scout)
 * - Years 7-10: Trophy phase (burn premium points on bucket-list hunts)
 */

import type {
  RoadmapYear,
  RoadmapAction,
  HuntStyle,
  PlanFocus,
  CostLineItem,
  Milestone,
  DreamHunt,
  StateScoreBreakdown,
  StateScoreFactor,
  MacroSummary,
  BudgetBreakdown,
  StateRecommendation,
  StrategicAssessment,
  TravelLogistics,
  TravelLogisticsRoute,
  SeasonCalendarEntry,
  PointOnlyGuideEntry,
} from "@/lib/types";
import { STATES, STATES_MAP } from "@/lib/constants/states";
import { SAMPLE_UNITS } from "@/lib/constants/sample-units";
import { findBestRoutes, getPrimaryAirport, HUNTING_AIRPORTS } from "@/lib/constants/flight-hubs";
import { calculateDrawOdds } from "./draw-odds";
import {
  estimateCreepRate,
  yearsToDrawWithCreep,
} from "./point-creep";
import { calculateAnnualSubscription, calculatePointYearCost } from "./roi-calculator";
import type {
  PhysicalComfort,
  HuntFrequency,
  TravelWillingness,
  ExperienceLevel,
  TrophyVsMeat,
  TimeAvailable,
} from "@/lib/store";

// ============================================================================
// Consultation Input (from store)
// ============================================================================

export interface ConsultationInput {
  homeState: string;
  homeCity: string;
  experienceLevel: ExperienceLevel;
  physicalComfort: PhysicalComfort;
  hasHuntedStates: string[];
  species: string[];
  trophyVsMeat: TrophyVsMeat;
  bucketListDescription: string;
  dreamHunts: DreamHunt[];
  pointYearBudget: number;
  huntYearBudget: number;
  huntFrequency: HuntFrequency;
  timeAvailable: TimeAvailable;
  travelWillingness: TravelWillingness;
  hasExistingPoints: boolean;
  existingPoints: Record<string, Record<string, number>>;
  huntStylePrimary: HuntStyle;
  openToGuided: boolean;
  guidedForSpecies: string[];
  preferredTerrain: string[];
  importantFactors: string[];
}

// ============================================================================
// State Recommendation Engine with Visible Scoring
// ============================================================================

function getStateDistance(homeState: string, targetState: string): "close" | "medium" | "far" {
  const regions: Record<string, string[]> = {
    west: ["CO", "WY", "MT", "ID", "UT", "NV", "OR", "NM", "AZ", "KS"],
    midwest: ["NE", "SD", "ND", "MN", "IA", "MO", "WI", "IL", "IN", "OH", "MI"],
    south: ["FL", "GA", "AL", "SC", "NC", "TN", "MS", "LA", "AR", "TX", "OK"],
    northeast: ["NY", "PA", "NJ", "CT", "MA", "VT", "NH", "ME", "MD", "VA", "WV", "DE", "RI"],
  };

  const homeRegion = Object.entries(regions).find(([, states]) => states.includes(homeState))?.[0] ?? "far";
  const targetRegion = Object.entries(regions).find(([, states]) => states.includes(targetState))?.[0] ?? "west";

  if (homeRegion === targetRegion) return "close";
  if (homeRegion === "west" || (homeRegion === "midwest" && targetRegion === "west")) return "close";
  if (homeRegion === "midwest" || homeRegion === "south") return "medium";
  return "far";
}

export function scoreStateForHunter(
  stateId: string,
  input: ConsultationInput
): StateScoreBreakdown {
  const state = STATES_MAP[stateId];
  if (!state) return { stateId, totalScore: 0, maxPossibleScore: 100, factors: [] };

  const factors: StateScoreFactor[] = [];

  // --- Factor 1: Elevation Compatibility (max 15) ---
  const stateElevations: Record<string, [number, number]> = {
    CO: [6000, 11000], WY: [5000, 11000], MT: [4500, 10000], NV: [5000, 10000],
    AZ: [5000, 9000], UT: [5000, 11000], NM: [6000, 10000], OR: [3000, 7500],
    ID: [3000, 10000], KS: [2500, 4500],
  };
  const [lo, hi] = stateElevations[stateId] ?? [5000, 9000];
  let elevScore = 10;
  let elevExplanation = `${lo.toLocaleString()}-${hi.toLocaleString()} ft range`;

  if (input.physicalComfort === "sea_level") {
    if (hi > 10000) { elevScore = 3; elevExplanation += " — may require significant acclimatization"; }
    else if (hi > 9000) { elevScore = 7; elevExplanation += " — manageable with a few days to acclimatize"; }
    else { elevScore = 12; elevExplanation += " — comfortable elevation range for acclimation"; }
  } else if (input.physicalComfort === "moderate_elevation") {
    elevScore = hi > 10500 ? 8 : 12;
    elevExplanation += hi > 10500 ? " — some high-country may be challenging" : " — well within your comfort zone";
  } else if (input.physicalComfort === "high_alpine") {
    elevScore = 14;
    elevExplanation += " — you're comfortable at any elevation";
  } else {
    elevScore = 10;
    elevExplanation += " — flexible on elevation";
  }
  factors.push({ label: "Elevation Compatibility", score: elevScore, maxScore: 15, explanation: elevExplanation });

  // --- Factor 2: Budget Fit (max 15) ---
  const stateUnits = SAMPLE_UNITS.filter(
    (u) => u.stateId === stateId && input.species.some(s => state.availableSpecies.includes(s))
  );
  const relevantSpecies = input.species.filter(s => state.availableSpecies.includes(s));
  const pointYearResult = calculatePointYearCost(stateId, relevantSpecies);
  const annualCostPerState = pointYearResult.total;

  let budgetScore = 8;
  let budgetExplanation = `~$${Math.round(annualCostPerState)}/yr in point years`;

  if (annualCostPerState <= input.pointYearBudget * 0.12) {
    budgetScore = 14;
    budgetExplanation += " — very affordable for your budget";
  } else if (annualCostPerState <= input.pointYearBudget * 0.20) {
    budgetScore = 11;
    budgetExplanation += " — fits comfortably in budget";
  } else if (annualCostPerState > input.pointYearBudget * 0.35) {
    budgetScore = 4;
    budgetExplanation += " — takes a significant chunk of point-year budget";
  }
  factors.push({ label: "Budget Fit", score: budgetScore, maxScore: 15, explanation: budgetExplanation });

  // --- Factor 3: Point System Match (max 15) ---
  let pointScore = 8;
  let pointExplanation = state.pointSystemDetails.description;

  if (input.trophyVsMeat === "trophy_focused" || input.trophyVsMeat === "lean_trophy") {
    if (state.pointSystem === "preference" || state.pointSystem === "hybrid") {
      pointScore = 14;
      pointExplanation = "Predictable draw timeline — ideal for planning trophy hunts";
    } else if (state.pointSystem === "bonus_squared") {
      pointScore = 12;
      pointExplanation = "Bonus squared rewards patience — exponential odds improvement for trophies";
    } else if (state.pointSystem === "random") {
      pointScore = 5;
      pointExplanation = "Random draw — harder to plan but offers wild-card trophy opportunities";
    }
  } else if (input.trophyVsMeat === "meat_focused" || input.trophyVsMeat === "lean_meat") {
    if (state.pointSystem === "random") {
      pointScore = 14;
      pointExplanation = "Equal odds every year — no waiting for points, just apply";
    } else if (stateId === "MT") {
      pointScore = 13;
      pointExplanation = "Combo license gives elk + deer — maximum opportunity per dollar";
    } else {
      pointScore = 8;
    }
  }
  factors.push({ label: "Point System Match", score: pointScore, maxScore: 15, explanation: pointExplanation });

  // --- Factor 4: Hunt Frequency Fit (max 10) ---
  let freqScore = 5;
  let freqExplanation = "";

  if (input.huntFrequency === "every_year") {
    if (state.pointSystem === "random") {
      freqScore = 8;
      freqExplanation = "Random draw gives you a shot every year";
    }
    if (stateId === "CO") {
      freqScore = 10;
      freqExplanation = "Second-choice tactic lets you hunt CO annually while building points";
    }
    if (stateId === "ID") {
      freqScore = 9;
      freqExplanation = "General tags come with your license — hunt every year guaranteed";
    }
  } else if (input.huntFrequency === "every_other") {
    freqScore = 7;
    freqExplanation = "Good cadence for point building with periodic hunts";
  } else if (input.huntFrequency === "every_3") {
    if (state.pointSystem === "preference" || state.pointSystem === "hybrid") {
      freqScore = 9;
      freqExplanation = "Perfect for building points then burning on quality tags every few years";
    }
  } else {
    freqScore = 6;
    freqExplanation = "Flexible timing works with any state";
  }
  factors.push({ label: "Hunt Frequency Fit", score: freqScore, maxScore: 10, explanation: freqExplanation });

  // --- Factor 5: Travel & Location (max 10) ---
  const dist = getStateDistance(input.homeState, stateId);
  let travelScore = 5;
  let travelExplanation = "";

  if (input.travelWillingness === "drive_only") {
    if (dist === "far") { travelScore = 1; travelExplanation = "Long drive — may not be practical without flying"; }
    else if (dist === "medium") { travelScore = 5; travelExplanation = "Doable drive with planning"; }
    else { travelScore = 9; travelExplanation = "Easy driving distance from home"; }
  } else if (input.travelWillingness === "short_flight") {
    if (dist === "far") { travelScore = 4; travelExplanation = "Requires a longer flight"; }
    else { travelScore = 8; travelExplanation = "Short flight or comfortable drive"; }
  } else {
    travelScore = 8;
    travelExplanation = "You're willing to fly anywhere — all states accessible";
    if (dist === "close") { travelScore = 10; travelExplanation = "Close to home AND you're flexible — best of both worlds"; }
  }
  factors.push({ label: "Travel & Location", score: travelScore, maxScore: 10, explanation: travelExplanation });

  // --- Factor 6: Hunt Style Match (max 10) ---
  let styleScore = 5;
  let styleExplanation = "";

  if (input.huntStylePrimary === "diy_truck") {
    const hasRoadAccess = stateUnits.some((u) => u.publicLandPct > 0.35);
    if (hasRoadAccess) {
      styleScore = 9;
      styleExplanation = "Good road access and public land for truck-based hunting";
    } else {
      styleScore = 4;
      styleExplanation = "Limited road access — better suited for backpack or guided hunts";
    }
  } else if (input.huntStylePrimary === "diy_backpack") {
    const hasWild = stateUnits.some((u) => u.publicLandPct > 0.6 && u.pressureLevel === "Low");
    if (hasWild) {
      styleScore = 9;
      styleExplanation = "Excellent backcountry access with low pressure";
    } else {
      styleScore = 5;
    }
  } else if (input.huntStylePrimary === "guided") {
    styleScore = 7;
    styleExplanation = "Guided operations available in most units";
  }

  // Bonus if open to guided and state has trophy units
  if (input.openToGuided) {
    const trophyUnits = stateUnits.filter(u => u.trophyRating >= 8);
    if (trophyUnits.length > 0) {
      styleScore = Math.min(10, styleScore + 2);
      styleExplanation += styleExplanation ? ". Open to guided — trophy units benefit from local knowledge" : "Trophy units where guided hunts shine";
    }
  }
  factors.push({ label: "Hunt Style Match", score: styleScore, maxScore: 10, explanation: styleExplanation });

  // --- Factor 7: Terrain & Factors Match (max 10) ---
  let terrainScore = 5;
  let terrainExplanation = "";

  if (input.preferredTerrain.length > 0) {
    const terrainMatch = stateUnits.some((u) =>
      u.terrainType.some((t) => input.preferredTerrain.includes(t.toLowerCase()))
    );
    if (terrainMatch) {
      terrainScore = 8;
      terrainExplanation = "Terrain matches your preference";
    } else {
      terrainScore = 3;
      terrainExplanation = "Limited terrain match for your preferences";
    }
  }

  if (input.importantFactors.includes("low_pressure")) {
    if (stateUnits.some((u) => u.pressureLevel === "Low")) {
      terrainScore = Math.min(10, terrainScore + 2);
      terrainExplanation += terrainExplanation ? ". Low-pressure units available" : "Low-pressure units available";
    }
  }
  if (input.importantFactors.includes("public_land")) {
    if (stateUnits.some((u) => u.publicLandPct > 0.5)) {
      terrainScore = Math.min(10, terrainScore + 2);
      terrainExplanation += terrainExplanation ? ". Strong public land access" : "Strong public land access";
    }
  }
  if (input.importantFactors.includes("high_success")) {
    if (stateUnits.some((u) => u.successRate > 0.3)) {
      terrainScore = Math.min(10, terrainScore + 1);
    }
  }
  factors.push({ label: "Terrain & Factors", score: terrainScore, maxScore: 10, explanation: terrainExplanation });

  // --- Factor 8: Existing Investment (max 10) ---
  let investScore = 0;
  let investExplanation = "No existing points in this state";

  const existingPts = Object.values(input.existingPoints[stateId] ?? {});
  if (existingPts.some((p) => p > 0)) {
    investScore = 10;
    investExplanation = "You have points invested here — don't abandon the investment";
  }
  if (input.hasHuntedStates.includes(stateId)) {
    investScore = Math.min(10, investScore + 5);
    investExplanation = investScore >= 10
      ? "Points + hunting experience — strong foundation"
      : "You've hunted here before — familiar territory";
  }
  factors.push({ label: "Existing Investment", score: investScore, maxScore: 10, explanation: investExplanation });

  // --- Factor 9: Species Availability (max 5) ---
  const speciesMatch = input.species.filter(s => state.availableSpecies.includes(s));
  const speciesScore = Math.min(5, Math.round((speciesMatch.length / Math.max(input.species.length, 1)) * 5));
  const speciesExplanation = speciesMatch.length === input.species.length
    ? `Offers all ${speciesMatch.length} of your target species`
    : `Offers ${speciesMatch.length} of ${input.species.length} target species: ${speciesMatch.join(", ")}`;
  factors.push({ label: "Species Availability", score: speciesScore, maxScore: 5, explanation: speciesExplanation });

  const totalScore = factors.reduce((sum, f) => sum + f.score, 0);
  const maxPossibleScore = factors.reduce((sum, f) => sum + f.maxScore, 0);

  return { stateId, totalScore, maxPossibleScore, factors };
}

function getStateRole(
  stateId: string,
  totalScore: number,
  maxScore: number,
): StateRecommendation["role"] {
  const state = STATES_MAP[stateId];
  if (!state) return "secondary";

  if (state.pointSystem === "random") return "wildcard";
  if (state.pointSystem === "bonus_squared") return "long_term";

  const pct = totalScore / maxScore;
  if (pct > 0.65) return "primary";
  return "secondary";
}

// ============================================================================
// Core Generator
// ============================================================================

export function generateStrategicAssessment(
  input: ConsultationInput
): StrategicAssessment {
  const currentYear = new Date().getFullYear();

  // Score all states
  const stateScores = STATES.map((s) => scoreStateForHunter(s.id, input))
    .sort((a, b) => b.totalScore - a.totalScore);

  // Select top states based on budget
  const avgBudget = (input.pointYearBudget + input.huntYearBudget) / 2;
  const maxStates = avgBudget < 2000 ? 3 : avgBudget < 5000 ? 5 : 7;
  const selectedScores = stateScores.slice(0, maxStates);

  // Build state recommendations
  const stateRecommendations: StateRecommendation[] = selectedScores.map(
    (scoreBreakdown) => {
      const { stateId } = scoreBreakdown;
      const state = STATES_MAP[stateId]!;
      const role = getStateRole(stateId, scoreBreakdown.totalScore, scoreBreakdown.maxPossibleScore);

      const relevantSpecies = input.species.filter(s => state.availableSpecies.includes(s));
      const stateUnits = SAMPLE_UNITS.filter(
        (u) => u.stateId === stateId && relevantSpecies.includes(u.speciesId)
      );

      const bestUnits = stateUnits
        .map((unit) => {
          const userPts = input.existingPoints[stateId]?.[unit.speciesId] ?? 0;
          calculateDrawOdds({ stateId, userPoints: userPts, unit });
          const creepRate = estimateCreepRate(unit.trophyRating);
          const years = yearsToDrawWithCreep(userPts, unit.pointsRequiredNonresident, creepRate);

          return {
            unitCode: unit.unitCode,
            unitName: unit.unitName ?? unit.unitCode,
            drawTimeline: years === 0 ? "Drawable now" : `Year ${years} with points (est. ${currentYear + years})`,
            successRate: unit.successRate,
            trophyRating: unit.trophyRating,
            tacticalNotes: unit.tacticalNotes,
            nearestAirport: unit.nearestAirport,
            driveTimeFromAirport: unit.driveTimeFromAirport,
          };
        })
        .sort((a, b) => {
          // Sort by a combo of accessibility and quality
          const aVal = a.successRate * 0.4 + (a.trophyRating / 10) * 0.6;
          const bVal = b.successRate * 0.4 + (b.trophyRating / 10) * 0.6;
          return bVal - aVal;
        })
        .slice(0, 3);

      // Itemized annual cost
      const costResult = calculatePointYearCost(stateId, relevantSpecies);

      // Role description
      const roleDescriptions: Record<string, string> = {
        primary: "Core state in your portfolio — consistent annual investment with predictable returns",
        secondary: "Supporting state — builds medium-term value and diversifies your portfolio",
        wildcard: "Lottery play — no points needed, apply every year for bonus opportunity",
        long_term: "Trophy investment — points compound exponentially for a high-reward payoff",
      };

      // Point strategy — quantified with specific codes and costs
      const pointStrategy = buildPointStrategy(stateId, role, state, costResult.total, bestUnits, input);

      // Reason — narrative paragraph referencing the hunter's profile
      const reason = buildStateReason(stateId, role, scoreBreakdown, input, bestUnits, state);

      return {
        stateId,
        role,
        roleDescription: roleDescriptions[role] ?? "",
        reason,
        annualCost: costResult.total,
        annualCostItems: costResult.items,
        bestUnits,
        pointStrategy,
        scoreBreakdown,
      };
    }
  );

  // Calculate subscription
  const subscription = calculateAnnualSubscription(
    selectedScores.map((s) => s.stateId),
    input.species
  );

  // Generate insights
  const insights = generateInsights(input, stateRecommendations, subscription.total);

  // Generate roadmap
  const roadmap = generateYearlyPlan(input, stateRecommendations);

  // Generate key years
  const keyYears = generateKeyYears(stateRecommendations, currentYear);

  // Generate milestones for year 1
  const milestones = generateMilestonesFromPlan(stateRecommendations, input, currentYear);

  // Generate macro summary
  const macroSummary = generateMacroSummary(roadmap, stateRecommendations, subscription.total);

  // Generate budget breakdown
  const budgetBreakdown = generateBudgetBreakdown(input, stateRecommendations, roadmap);

  // Dream hunt recommendations
  const dreamHuntRecommendations = generateDreamHuntRecs(input);

  // Profile & strategy summaries
  const distance = getStateDistance(input.homeState, "CO");
  const profileSummary = buildProfileSummary(input, distance, stateRecommendations);
  const strategyOverview = buildStrategyOverview(stateRecommendations, subscription.total);

  // v3: Curated logistics and guides
  const travelLogistics = generateTravelLogistics(input, stateRecommendations);
  const seasonCalendar = generateSeasonCalendar(input, stateRecommendations);
  const pointOnlyGuide = generatePointOnlyGuide(stateRecommendations);

  const tenYearTotal = roadmap.reduce((sum, yr) => sum + yr.estimatedCost, 0);
  const totalHunts = roadmap.reduce(
    (sum, yr) => sum + yr.actions.filter((a) => a.type === "hunt").length,
    0
  );

  return {
    id: `assessment-${Date.now()}`,
    profileSummary,
    strategyOverview,
    stateRecommendations,
    roadmap,
    insights: insights.map(i => i.description),
    keyYears: keyYears.map(k => ({ year: k.year, description: k.description })),
    financialSummary: {
      annualSubscription: subscription.total,
      tenYearTotal,
      yearOneInvestment: roadmap[0]?.estimatedCost ?? 0,
      roi: `${totalHunts} planned hunts over 10 years`,
    },
    macroSummary,
    budgetBreakdown,
    stateScoreBreakdowns: selectedScores,
    milestones,
    dreamHuntRecommendations,
    travelLogistics,
    seasonCalendar,
    pointOnlyGuide,
    createdAt: new Date().toISOString(),
  };
}

// ============================================================================
// Milestone Generator
// ============================================================================

export function generateMilestonesFromPlan(
  recs: StateRecommendation[],
  input: ConsultationInput,
  year: number
): Milestone[] {
  const milestones: Milestone[] = [];
  let idx = 0;

  for (const rec of recs) {
    const state = STATES_MAP[rec.stateId];
    if (!state) continue;

    const relevantSpecies = input.species.filter(s => state.availableSpecies.includes(s));

    for (const speciesId of relevantSpecies) {
      const deadline = state.applicationDeadlines[speciesId as keyof typeof state.applicationDeadlines];
      const drawDate = state.drawResultDates?.[speciesId];

      if (state.pointSystem === "random") {
        // Random draw states: just apply
        milestones.push({
          id: `ms-${year}-${rec.stateId}-${speciesId}-apply-${idx++}`,
          title: `Apply for ${state.name} ${speciesId.replace("_", " ")} draw`,
          description: `Submit application through ${state.name} Fish & Game portal. Pure random draw — no points needed.`,
          type: "apply",
          stateId: rec.stateId,
          speciesId,
          year,
          dueDate: deadline?.close,
          drawResultDate: drawDate,
          url: state.buyPointsUrl,
          costs: rec.annualCostItems.filter(i => i.speciesId === speciesId || i.category === "license"),
          totalCost: rec.annualCostItems
            .filter(i => i.speciesId === speciesId || i.category === "license")
            .reduce((s, i) => s + i.amount, 0),
          completed: false,
          applicationApproach: state.applicationApproach,
          applicationTip: state.applicationTips[0],
        });
      } else {
        // Point states: buy points
        const pointCost = state.pointCost[speciesId] ?? 0;
        if (pointCost > 0) {
          const costs: CostLineItem[] = [];

          // License (shared, but include for visibility)
          if (state.licenseFees.qualifyingLicense && state.licenseFees.qualifyingLicense > 0) {
            costs.push({
              label: `${state.abbreviation} ${state.feeSchedule.find(f => f.name.includes("License"))?.name ?? "Qualifying License"}`,
              amount: state.licenseFees.qualifyingLicense,
              category: "license",
              stateId: rec.stateId,
              url: state.fgUrl,
            });
          }

          if (state.licenseFees.appFee && state.licenseFees.appFee > 0) {
            costs.push({
              label: `${state.abbreviation} ${speciesId.replace("_", " ")} application fee`,
              amount: state.licenseFees.appFee,
              category: "application",
              stateId: rec.stateId,
              speciesId,
            });
          }

          costs.push({
            label: `${state.abbreviation} ${speciesId.replace("_", " ")} preference point`,
            amount: pointCost,
            category: "points",
            stateId: rec.stateId,
            speciesId,
            url: state.buyPointsUrl,
          });

          milestones.push({
            id: `ms-${year}-${rec.stateId}-${speciesId}-points-${idx++}`,
            title: `Buy ${state.name} ${speciesId.replace("_", " ")} preference point`,
            description: `Purchase through ${state.name} Fish & Game online portal. ${state.applicationTips[0] ?? ""}`,
            type: "buy_points",
            stateId: rec.stateId,
            speciesId,
            year,
            dueDate: deadline?.close,
            drawResultDate: drawDate,
            url: state.buyPointsUrl,
            costs,
            totalCost: costs.reduce((s, c) => s + c.amount, 0),
            completed: false,
            applicationApproach: state.applicationApproach,
            applicationTip: state.applicationTips[0],
          });
        }
      }
    }
  }

  // Sort by due date
  milestones.sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });

  return milestones;
}

// ============================================================================
// Macro Summary Generator
// ============================================================================

function generateMacroSummary(
  roadmap: RoadmapYear[],
  recs: StateRecommendation[],
  annualSub: number
): MacroSummary {
  const totalCost = roadmap.reduce((s, y) => s + y.estimatedCost, 0);

  const costByState = recs.map(r => ({
    stateId: r.stateId,
    annualCost: r.annualCost,
    pctOfTotal: totalCost > 0 ? Math.round((r.annualCost * 10 / totalCost) * 100) / 100 : 0,
  }));

  const costByYear = roadmap.map(y => ({
    year: y.year,
    pointCosts: y.pointYearCost,
    huntCosts: y.huntYearCost,
    totalCost: y.estimatedCost,
  }));

  const huntTimeline: MacroSummary["huntTimeline"] = [];
  for (const yr of roadmap) {
    for (const action of yr.actions) {
      huntTimeline.push({
        year: yr.year,
        stateId: action.stateId,
        speciesId: action.speciesId,
        type: action.type as "apply" | "hunt" | "buy_points",
      });
    }
  }

  const uniqueStates = new Set(recs.map(r => r.stateId)).size;
  const uniqueSpecies = new Set(recs.flatMap(r =>
    STATES_MAP[r.stateId]?.availableSpecies ?? []
  )).size;
  const portfolioDiversity = Math.min(100, Math.round((uniqueStates * 10 + uniqueSpecies * 5)));

  const plannedHunts = roadmap.reduce(
    (sum, yr) => sum + yr.actions.filter(a => a.type === "hunt").length,
    0
  );

  return {
    costByState,
    costByYear,
    huntTimeline,
    portfolioDiversity,
    annualSubscription: annualSub,
    tenYearTotal: totalCost,
    plannedHunts,
  };
}

// ============================================================================
// Budget Breakdown Generator
// ============================================================================

function generateBudgetBreakdown(
  input: ConsultationInput,
  recs: StateRecommendation[],
  roadmap: RoadmapYear[]
): BudgetBreakdown {
  // Point-year items = all state subscription costs
  const pointYearItems: CostLineItem[] = recs.flatMap(r => r.annualCostItems);
  const pointYearCost = pointYearItems.reduce((s, i) => s + i.amount, 0);

  // Hunt-year adds tag costs for a typical hunt
  const huntYearItems: CostLineItem[] = [...pointYearItems];
  const primaryRec = recs.find(r => r.role === "primary") ?? recs[0];
  if (primaryRec) {
    const state = STATES_MAP[primaryRec.stateId];
    if (state) {
      const primarySpecies = input.species.find(s => state.availableSpecies.includes(s)) ?? input.species[0];
      if (primarySpecies) {
        huntYearItems.push({
          label: `${state.abbreviation} ${primarySpecies.replace("_", " ")} tag (estimated)`,
          amount: 700,
          category: "tag",
          stateId: primaryRec.stateId,
          speciesId: primarySpecies,
        });
        huntYearItems.push({
          label: "Travel (gas/flights, lodging, food)",
          amount: 1500,
          category: "travel",
          stateId: primaryRec.stateId,
        });
      }
    }
  }
  const huntYearCost = huntYearItems.reduce((s, i) => s + i.amount, 0);

  const tenYearProjection = roadmap.map(yr => ({
    year: yr.year,
    isHuntYear: yr.isHuntYear,
    cost: yr.estimatedCost,
    items: yr.isHuntYear ? huntYearItems : pointYearItems,
  }));

  return {
    pointYearCost,
    pointYearItems,
    huntYearCost,
    huntYearItems,
    tenYearProjection,
  };
}

// ============================================================================
// Dream Hunt Recommendations
// ============================================================================

function generateDreamHuntRecs(input: ConsultationInput): DreamHunt[] {
  const recs: DreamHunt[] = [];

  // User's own dream hunts passed through
  for (const dh of input.dreamHunts) {
    recs.push(dh);
  }

  // Auto-suggest based on profile if they haven't added their own
  if (recs.length === 0) {
    if (input.trophyVsMeat === "trophy_focused" || input.trophyVsMeat === "lean_trophy") {
      recs.push({
        id: "dream-az-elk",
        title: "Arizona Trophy Bull Elk",
        description: "Arizona produces some of the largest bulls in North America. A once-in-a-lifetime draw with bonus points.",
        stateOrRegion: "AZ",
        species: "elk",
        estimatedTimelineYears: 15,
        annualPointCost: 175,
        notes: "Buy AZ hunting license ($160) + app fee ($15) annually. Bonus points are not squared, so it's a slow build but the quality is exceptional.",
      });
    }

    if (input.species.includes("moose") || input.trophyVsMeat === "trophy_focused") {
      recs.push({
        id: "dream-wy-moose",
        title: "Wyoming Shiras Moose",
        description: "World-class Shiras moose hunting in the Tetons. 15+ year NR wait but near 100% success when drawn.",
        stateOrRegion: "WY",
        species: "moose",
        estimatedTimelineYears: 20,
        annualPointCost: 70,
        notes: "Apply and buy preference point annually ($55 point + $15 app). Some of the largest Shiras moose in the world.",
      });
    }
  }

  return recs;
}

// ============================================================================
// Insight Generator
// ============================================================================

function generateInsights(
  input: ConsultationInput,
  recs: StateRecommendation[],
  annualSub: number
): { title: string; description: string; type: string }[] {
  const insights: { title: string; description: string; type: string }[] = [];

  if (input.experienceLevel === "never_hunted_west") {
    insights.push({
      title: "First Time Out West",
      description: "We recommend starting with a state that has manageable elevation and good road access. An OTC or high-draw-odds tag will get you in the field quickly so you can learn the landscape.",
      type: "tip",
    });
  }

  if (input.physicalComfort === "sea_level") {
    insights.push({
      title: "Elevation Strategy",
      description: "Coming from low elevation, plan to arrive 2-3 days early for acclimation. We've prioritized units in the 6,000-9,500 ft range.",
      type: "tip",
    });
  }

  if (annualSub > input.pointYearBudget * 0.6) {
    insights.push({
      title: "Budget Consideration",
      description: `Your annual point subscription across ${recs.length} states is ~$${Math.round(annualSub)}/yr, which is ${Math.round((annualSub / input.pointYearBudget) * 100)}% of your point-year budget. Consider trimming to your top 3-4 states.`,
      type: "warning",
    });
  }

  if (recs.some((r) => r.stateId === "CO")) {
    insights.push({
      title: "Colorado Second-Choice Tactic",
      description: "Put a point-only code as your first choice and a hunt code with high second-choice odds as your second. You build a point AND get a tag — hunt CO nearly every year.",
      type: "opportunity",
    });
  }

  const wildcards = recs.filter((r) => r.role === "wildcard");
  if (wildcards.length > 0) {
    insights.push({
      title: "Wild Card Lottery",
      description: `${wildcards.map((w) => STATES_MAP[w.stateId]?.name).join(" and ")} — pure random draw. No points needed, same odds as a veteran. Apply every year.`,
      type: "opportunity",
    });
  }

  if (input.openToGuided) {
    insights.push({
      title: "Mixed Style Advantage",
      description: "Being open to guided hunts for special opportunities means you can target trophy-tier units that benefit from local outfitter knowledge while keeping most hunts DIY to save money.",
      type: "advantage",
    });
  }

  return insights;
}

// ============================================================================
// Key Years Generator
// ============================================================================

function generateKeyYears(
  recs: StateRecommendation[],
  currentYear: number
): { year: number; label: string; description: string }[] {
  const keyYears: { year: number; label: string; description: string }[] = [];

  // Year 1: First applications
  keyYears.push({
    year: currentYear,
    label: "Portfolio Launch",
    description: `Submit applications across ${recs.length} states. Start building points in preference states, apply for random draw wild cards.`,
  });

  // Year 3: First potential burns
  const shortTermUnits = recs
    .flatMap(r => r.bestUnits.filter(u => u.drawTimeline.includes("Year 2") || u.drawTimeline.includes("Year 3")));
  if (shortTermUnits.length > 0) {
    keyYears.push({
      year: currentYear + 2,
      label: "First Burn Opportunity",
      description: `Points may be sufficient to draw in ${shortTermUnits.map(u => u.unitName).slice(0, 2).join(" or ")}. Time to cash in early investments.`,
    });
  }

  // Year 6: Gap year
  keyYears.push({
    year: currentYear + 5,
    label: "Gap Year — Reassess",
    description: "Evaluate point totals vs. creep. E-scout for trophy phase. Rebuild points where you burned early.",
  });

  // Year 8+: Trophy phase
  const trophyRecs = recs.filter(r => r.role === "long_term" || r.bestUnits.some(u => u.trophyRating >= 8));
  if (trophyRecs.length > 0) {
    keyYears.push({
      year: currentYear + 7,
      label: "Trophy Phase",
      description: `Cash in accumulated points for premium hunts. ${trophyRecs.map(r => STATES_MAP[r.stateId]?.name).join(", ")} are the targets.`,
    });
  }

  return keyYears;
}

// ============================================================================
// Yearly Plan Generator
// ============================================================================

function generateYearlyPlan(
  input: ConsultationInput,
  recs: StateRecommendation[]
): RoadmapYear[] {
  const currentYear = new Date().getFullYear();
  const roadmap: RoadmapYear[] = [];
  const duration = 10;

  for (let i = 0; i < duration; i++) {
    const year = currentYear + i;
    const actions: RoadmapAction[] = [];
    let phase: RoadmapYear["phase"];

    if (i < 3) phase = "building";
    else if (i < 5) phase = "burn";
    else if (i === 5) phase = "gap";
    else phase = "trophy";

    const isHuntYear = phase === "burn" || phase === "trophy" || (phase === "building" && i <= 1);

    // Point buying for all non-random states
    for (const rec of recs) {
      const state = STATES_MAP[rec.stateId];
      if (!state || state.pointSystem === "random") continue;

      const relevantSpecies = input.species.filter(s => state.availableSpecies.includes(s));
      for (const speciesId of relevantSpecies) {
        const cost = state.pointCost[speciesId] ?? 0;
        if (cost > 0) {
          const itemCosts: CostLineItem[] = [];
          if (state.licenseFees.qualifyingLicense && state.licenseFees.qualifyingLicense > 0) {
            itemCosts.push({
              label: `${state.abbreviation} Qualifying License`,
              amount: state.licenseFees.qualifyingLicense,
              category: "license",
              stateId: rec.stateId,
              url: state.fgUrl,
            });
          }
          if (state.licenseFees.appFee && state.licenseFees.appFee > 0) {
            itemCosts.push({
              label: `${state.abbreviation} ${speciesId.replace("_", " ")} app fee`,
              amount: state.licenseFees.appFee,
              category: "application",
              stateId: rec.stateId,
              speciesId,
            });
          }
          itemCosts.push({
            label: `${state.abbreviation} ${speciesId.replace("_", " ")} point`,
            amount: cost,
            category: "points",
            stateId: rec.stateId,
            speciesId,
            url: state.buyPointsUrl,
          });

          const deadline = state.applicationDeadlines[speciesId as keyof typeof state.applicationDeadlines];

          const totalPointCost = itemCosts.reduce((s, c) => s + c.amount, 0);
          const pointApp = state.pointOnlyApplication;
          const pointDesc = pointApp
            ? `Buy ${state.abbreviation} ${speciesId.replace("_", " ")} preference point via ${state.name} portal${pointApp.huntCode ? ` (code: ${pointApp.huntCode})` : ""}. Total: $${Math.round(totalPointCost)}.${pointApp.secondChoiceTactic ? ` Pro tip: ${pointApp.secondChoiceTactic}` : ""}${deadline?.close ? ` Deadline: ${deadline.close}.` : ""}`
            : `${phase === "building" ? "Build" : "Maintain"} ${state.abbreviation} ${speciesId.replace("_", " ")} points — $${Math.round(totalPointCost)}/yr.${deadline?.close ? ` Deadline: ${deadline.close}.` : ""}`;

          actions.push({
            type: "buy_points",
            stateId: rec.stateId,
            speciesId,
            description: pointDesc,
            cost: totalPointCost,
            costs: itemCosts,
            dueDate: deadline?.close,
            url: state.buyPointsUrl,
          });
        }
      }
    }

    // Wild card applications (random draw states)
    const wildcards = recs.filter((r) => r.role === "wildcard");
    for (const wc of wildcards) {
      const state = STATES_MAP[wc.stateId];
      if (!state) continue;

      const relevantSpecies = input.species.filter(s => state.availableSpecies.includes(s));
      for (const speciesId of relevantSpecies) {
        const deadline = state.applicationDeadlines[speciesId as keyof typeof state.applicationDeadlines];
        const appCost = state.licenseFees.appFee ?? 0;
        const licenseCost = state.licenseFees.qualifyingLicense ?? 0;

        const itemCosts: CostLineItem[] = [];
        if (licenseCost > 0) {
          itemCosts.push({ label: `${state.abbreviation} License`, amount: licenseCost, category: "license", stateId: wc.stateId });
        }
        if (appCost > 0) {
          itemCosts.push({ label: `${state.abbreviation} ${speciesId.replace("_", " ")} app fee`, amount: appCost, category: "application", stateId: wc.stateId, speciesId });
        }

        const applyTotal = appCost + licenseCost;
        const applyDesc = `Apply for ${state.name} ${speciesId.replace("_", " ")} — pure random draw, same odds every year. Cost: $${Math.round(applyTotal)}.${deadline?.close ? ` Deadline: ${deadline.close}.` : ""} ${state.statePersonality ? state.name + " is a wild-card play worth taking every year." : ""}`.trim();

        actions.push({
          type: "apply",
          stateId: wc.stateId,
          speciesId,
          description: applyDesc,
          cost: applyTotal,
          costs: itemCosts,
          dueDate: deadline?.close,
          url: state.buyPointsUrl,
        });
      }
    }

    // Hunt actions based on phase
    if (phase === "building" && i <= 1) {
      // Early hunts: OTC or immediate-draw units
      for (const rec of recs) {
        const immediateUnit = rec.bestUnits.find(u => u.drawTimeline === "Drawable now");
        if (immediateUnit) {
          const huntState = STATES_MAP[rec.stateId];
          const speciesId = input.species[0] ?? "elk";
          const unitObj = SAMPLE_UNITS.find(u => u.unitCode === immediateUnit.unitCode && u.stateId === rec.stateId);
          const tNotes = unitObj?.tacticalNotes;
          const routes = findBestRoutes(input.homeState, rec.stateId);
          const flightNote = routes.length > 0 ? ` Fly ${routes[0].from}→${routes[0].to} (~$${routes[0].avgCost} RT).` : "";
          const seasonNote = tNotes?.bestSeasonTier ? ` Best season: ${tNotes.bestSeasonTier}.` : "";
          const arrivalNote = tNotes?.bestArrivalDate ? ` ${tNotes.bestArrivalDate}.` : "";
          const huntLength = tNotes?.typicalHuntLength ? ` Plan ${tNotes.typicalHuntLength}.` : "";

          actions.push({
            type: "hunt",
            stateId: rec.stateId,
            speciesId,
            unitCode: immediateUnit.unitCode,
            description: `Hunt ${speciesId.replace("_", " ")} in ${huntState?.abbreviation ?? rec.stateId} Unit ${immediateUnit.unitCode} (${immediateUnit.unitName}).${flightNote}${seasonNote}${arrivalNote}${huntLength} ${Math.round(immediateUnit.successRate * 100)}% success rate.`,
            estimatedDrawOdds: immediateUnit.successRate,
            cost: 600,
            costs: [
              { label: "Estimated tag + travel", amount: 600, category: "tag", stateId: rec.stateId, speciesId },
            ],
          });
          break;
        }
      }
    }

    if (phase === "building" && i === 2) {
      actions.push({
        type: "scout",
        stateId: recs[0]?.stateId ?? "CO",
        speciesId: input.species[0] ?? "elk",
        description: "E-scout top units for burn phase. Identify glassing spots, camp locations, access routes.",
        cost: 0,
        costs: [],
      });
    }

    if (phase === "burn") {
      const burnTarget = recs
        .flatMap(r => r.bestUnits)
        .find(u => u.drawTimeline.includes("Year") && u.trophyRating >= 6);

      if (burnTarget) {
        const burnStateId = recs.find(r => r.bestUnits.includes(burnTarget))?.stateId ?? recs[0]?.stateId ?? "CO";
        const burnState = STATES_MAP[burnStateId];
        const speciesId = input.species[0] ?? "elk";
        const unitObj = SAMPLE_UNITS.find(u => u.unitCode === burnTarget.unitCode && u.stateId === burnStateId);
        const tNotes = unitObj?.tacticalNotes;
        const routes = findBestRoutes(input.homeState, burnStateId);
        const flightNote = routes.length > 0 ? ` Fly ${routes[0].from}→${routes[0].to} (~$${routes[0].avgCost} RT).` : "";
        const trophyNote = tNotes?.trophyExpectation ? ` Trophy expectation: ${tNotes.trophyExpectation}` : "";
        const seasonNote = tNotes?.bestSeasonTier ? ` Target ${tNotes.bestSeasonTier}.` : "";

        actions.push({
          type: "hunt",
          stateId: burnStateId,
          speciesId,
          unitCode: burnTarget.unitCode,
          description: `Burn points — ${speciesId.replace("_", " ")} in ${burnState?.abbreviation ?? burnStateId} Unit ${burnTarget.unitCode} (${burnTarget.unitName}).${flightNote}${seasonNote}${trophyNote} This is where your years of point-building pay off.`,
          estimatedDrawOdds: 0.75,
          cost: 1200,
          costs: [
            { label: "Tag + travel (burn year)", amount: 1200, category: "tag", stateId: burnStateId, speciesId },
          ],
        });
      }
    }

    if (phase === "gap") {
      actions.push({
        type: "scout",
        stateId: recs[0]?.stateId ?? "CO",
        speciesId: input.species[0] ?? "elk",
        description: "Gap year: Reassess portfolio. Deep e-scout for trophy phase. Review point totals vs. creep.",
        cost: 0,
        costs: [],
      });
    }

    if (phase === "trophy") {
      const trophyTarget = recs
        .flatMap(r => r.bestUnits)
        .find(u => u.trophyRating >= 8);

      if (trophyTarget) {
        const trophyStateId = recs.find(r => r.bestUnits.includes(trophyTarget))?.stateId ?? recs[0]?.stateId ?? "CO";
        const trophyState = STATES_MAP[trophyStateId];
        const speciesId = input.species[0] ?? "elk";
        const unitObj = SAMPLE_UNITS.find(u => u.unitCode === trophyTarget.unitCode && u.stateId === trophyStateId);
        const tNotes = unitObj?.tacticalNotes;
        const routes = findBestRoutes(input.homeState, trophyStateId);
        const flightNote = routes.length > 0 ? ` Fly ${routes[0].from}→${routes[0].to} (~$${routes[0].avgCost} RT).` : "";
        const trophyNote = tNotes?.trophyExpectation ? ` Trophy potential: ${tNotes.trophyExpectation}` : "";
        const guidedNote = input.openToGuided ? " Consider hiring a local guide for this caliber of hunt." : "";

        actions.push({
          type: "hunt",
          stateId: trophyStateId,
          speciesId,
          unitCode: trophyTarget.unitCode,
          description: `Trophy hunt — ${speciesId.replace("_", " ")} in ${trophyState?.abbreviation ?? trophyStateId} Unit ${trophyTarget.unitCode} (${trophyTarget.unitName}).${flightNote}${trophyNote}${guidedNote} This is the payoff for years of disciplined point-building.`,
          estimatedDrawOdds: 0.85,
          cost: 1800,
          costs: [
            { label: "Trophy tag + travel + gear", amount: 1800, category: "tag", stateId: trophyStateId, speciesId },
          ],
        });
      }
    }

    const pointCosts = actions
      .filter(a => a.type === "buy_points" || a.type === "apply")
      .reduce((s, a) => s + a.cost, 0);
    const huntCosts = actions
      .filter(a => a.type === "hunt")
      .reduce((s, a) => s + a.cost, 0);
    const yearCost = pointCosts + huntCosts;

    roadmap.push({
      year,
      phase,
      actions,
      estimatedCost: Math.round(yearCost),
      isHuntYear,
      pointYearCost: Math.round(pointCosts),
      huntYearCost: Math.round(huntCosts),
    });
  }

  return roadmap;
}

// ============================================================================
// Helpers
// ============================================================================

function buildProfileSummary(
  input: ConsultationInput,
  distance: "close" | "medium" | "far",
  recs?: StateRecommendation[]
): string {
  const loc = input.homeCity
    ? `${input.homeCity}, ${input.homeState}`
    : input.homeState;

  const homeAirport = getPrimaryAirport(input.homeState);

  const expNarrative: Record<string, string> = {
    never_hunted_west: `You're new to western hunting, based in ${loc}. That's not a disadvantage — it means every recommendation here is built from the ground up for your situation, with no bad habits to unlearn. We've prioritized units with good road access, manageable terrain, and high-enough success rates that your first trip west will be a confidence builder, not a suffer-fest.`,
    "1_2_trips": `You've been out west once or twice, so you know the basics — the scale of the landscape, how different the air feels at 8,000 feet, how far a "short drive" really is. Based in ${loc}, your portfolio builds on that foundation with units that reward return trips and familiarity rather than pure luck.`,
    "3_5_trips": `With several western hunts under your belt, you know what works and what doesn't. Based in ${loc}, you're ready for a strategic portfolio that balances immediate hunting opportunities with long-term point investments that pay off in years 5-10.`,
    veteran: `As a veteran western hunter based in ${loc}, this portfolio is tuned for efficiency — maximizing the return on every dollar and every point. We've prioritized high-value units where your experience gives you an edge over the first-timers.`,
  };

  const styleMap: Record<string, string> = {
    diy_truck: "truck-camp, glass-from-roads style",
    diy_backpack: "backcountry, pack-in-and-stay style",
    guided: "guided hunt approach",
    drop_camp: "drop-camp approach",
  };
  const styleName = styleMap[input.huntStylePrimary ?? "diy_truck"] ?? "DIY approach";

  const trophyNarrative: Record<string, string> = {
    trophy_focused: `You're chasing quality over quantity — this means we weight toward states with predictable preference point systems (CO, WY) where you can plan exactly when you'll draw a premium unit, and long-term investments (NV, AZ) where patience pays off with the biggest animals.`,
    lean_trophy: `You lean trophy but want to hunt along the way. That's the sweet spot — we can build points in preference states while taking random-draw shots and OTC opportunities almost every year. Your ${styleName} opens up great road-accessible units.`,
    balanced: `You want a mix of quality hunts and regular opportunities. Your portfolio balances preference-point states (where you know when you'll draw) with random-draw wildcards (where you might draw tomorrow). Your ${styleName} gives you flexibility across unit types.`,
    lean_meat: `You're focused on getting out there regularly with quality as a bonus. We've prioritized states with annual hunting opportunities — OTC tags, high-draw-odds units, and random-draw states where you don't have to wait years for a tag.`,
    meat_focused: `Freezer first, antlers second. Your portfolio maximizes tags-per-year with OTC opportunities, general tags, and random draws. Point building is secondary — we invest where it's cheap and guarantees a quality hunt down the road.`,
  };

  // Paragraph 1: Who you are
  const para1 = expNarrative[input.experienceLevel] ?? expNarrative.never_hunted_west;

  // Paragraph 2: Goals and style
  const guidedNote = input.openToGuided
    ? ` You're open to guided hunts for special opportunities — that's smart. For premium draws like AZ elk or NV mule deer, a local outfitter's knowledge can be the difference between a tag and a trophy.`
    : "";
  const para2 = (trophyNarrative[input.trophyVsMeat] ?? trophyNarrative.balanced) + guidedNote;

  // Paragraph 3: Travel and logistics strategy
  let para3 = "";
  if (distance === "far") {
    para3 = `Every trip is a flight-based expedition from ${homeAirport}. We've built your portfolio around states with direct or one-stop flights, factored in rental car logistics (4WD where needed), and identified meat shipping solutions so you can focus on hunting instead of planning. Your $${input.pointYearBudget.toLocaleString()} point-year and $${input.huntYearBudget.toLocaleString()} hunt-year budgets support a ${recs?.length ?? 5}-state portfolio with enough headroom for flights and gear.`;
  } else if (distance === "medium") {
    para3 = `From ${loc}, you can drive to some states and fly to others — that flexibility is a real asset. Your $${input.pointYearBudget.toLocaleString()} point-year and $${input.huntYearBudget.toLocaleString()} hunt-year budgets let you build a ${recs?.length ?? 5}-state portfolio that mixes driveable hunts with fly-in trips for premium draws.`;
  } else {
    para3 = `Your proximity to western hunting states is a major advantage — you can scout, do day trips, and extend hunts without the overhead of flights. Your $${input.pointYearBudget.toLocaleString()} point-year and $${input.huntYearBudget.toLocaleString()} hunt-year budgets stretch further when travel costs are lower, supporting a full ${recs?.length ?? 5}-state portfolio.`;
  }

  return `${para1}\n\n${para2}\n\n${para3}`;
}

// ============================================================================
// v3: Narrative Builders — Advisor-Quality Text
// ============================================================================

function buildPointStrategy(
  stateId: string,
  role: StateRecommendation["role"],
  state: typeof STATES_MAP[string],
  annualCost: number,
  bestUnits: StateRecommendation["bestUnits"],
  input: ConsultationInput
): string {
  if (!state) return "";

  const pointApp = state.pointOnlyApplication;
  const topUnit = bestUnits[0];
  const existingPts = Object.values(input.existingPoints[stateId] ?? {}).reduce((a, b) => a + b, 0);

  if (role === "wildcard") {
    // Random draw states
    const appCost = (state.licenseFees.appFee ?? 0) + (state.licenseFees.qualifyingLicense ?? 0);
    return `No points needed — ${state.name} is a pure random draw. Apply every year for $${Math.round(appCost)} total. Same odds whether it's your first application or your tenth. ${
      stateId === "NM"
        ? "New Mexico doesn't even require a license to apply — just the $12 application fee. It's the cheapest lottery ticket in western hunting."
        : stateId === "ID"
          ? "Your Idaho hunting license IS your tag for general units. Buy it ($606), and you're guaranteed to hunt elk and deer in general-tag zones."
          : "Low-cost annual play that could pay off any year."
    }`;
  }

  if (role === "long_term") {
    return `Long-term trophy investment. ${
      state.pointSystem === "bonus_squared"
        ? `Nevada's squared bonus system means your odds double exponentially — at 5 points your odds are 25x a first-timer, at 10 points it's 100x. `
        : state.pointSystem === "bonus"
          ? `Arizona's bonus system rewards patience but isn't squared — steady accumulation with bonus odds each year. `
          : ""
    }Annual cost: ~$${Math.round(annualCost)}/yr.${
      topUnit ? ` Target: Unit ${topUnit.unitCode} (${topUnit.unitName}) — ${topUnit.drawTimeline}.` : ""
    }${topUnit?.tacticalNotes?.trophyExpectation ? ` Trophy potential: ${topUnit.tacticalNotes.trophyExpectation}` : ""} This is your long-game play — don't burn these points early.`;
  }

  if (role === "primary") {
    let strategy = `Core state — buy points annually. Annual investment: ~$${Math.round(annualCost)}/yr.`;

    if (pointApp) {
      strategy += ` On the ${state.name} portal${pointApp.huntCode ? `, use code ${pointApp.huntCode}` : ""} to purchase your preference point.`;
      if (pointApp.deadline) {
        strategy += ` Deadline: ${pointApp.deadline}.`;
      }
      if (pointApp.secondChoiceTactic) {
        strategy += ` Key tactic: ${pointApp.secondChoiceTactic}`;
      }
    }

    if (existingPts > 0) {
      strategy += ` With your ${existingPts} existing point${existingPts > 1 ? "s" : ""}, you're already ahead of schedule.`;
    }

    if (topUnit) {
      strategy += ` Target: Unit ${topUnit.unitCode} — ${topUnit.drawTimeline}.`;
    }

    return strategy;
  }

  // Secondary
  let strategy = `Build points steadily at ~$${Math.round(annualCost)}/yr. Plan to burn in years 4-6 on quality mid-tier units.`;
  if (pointApp?.deadline) {
    strategy += ` Deadline: ${pointApp.deadline}.`;
  }
  if (topUnit) {
    strategy += ` Target: Unit ${topUnit.unitCode} (${topUnit.unitName}) — ${topUnit.drawTimeline}.`;
  }
  return strategy;
}

function buildStateReason(
  stateId: string,
  role: StateRecommendation["role"],
  scoreBreakdown: StateScoreBreakdown,
  input: ConsultationInput,
  bestUnits: StateRecommendation["bestUnits"],
  state: typeof STATES_MAP[string]
): string {
  if (!state) return "";

  const topUnit = bestUnits[0];
  const unitNames = bestUnits.map(u => `${u.unitCode} (${u.unitName})`).join(", ");

  const styleLabel: Record<string, string> = {
    diy_truck: "truck-camp",
    diy_backpack: "backcountry",
    guided: "guided",
    drop_camp: "drop-camp",
  };
  const hunterStyle = styleLabel[input.huntStylePrimary ?? "diy_truck"] ?? "DIY";

  // Role-based intro
  const roleIntro: Record<string, string> = {
    primary: `${state.name} is your anchor state.`,
    secondary: `${state.name} rounds out your portfolio as a strong supporting state.`,
    wildcard: `${state.name} is your wild card — a free lottery ticket every year.`,
    long_term: `${state.name} is your long-game trophy investment.`,
  };

  let reason = roleIntro[role] ?? `${state.name} fits well in your portfolio.`;

  // Point system narrative
  if (state.pointSystem === "preference" || state.pointSystem === "hybrid") {
    const prefPct = state.pointSystemDetails.preferencePct ?? 80;
    reason += ` The ${prefPct}/${100 - prefPct} preference/random system gives you a clear, predictable timeline.`;
    if (topUnit) {
      const yearMatch = topUnit.drawTimeline.match(/Year (\d+)/);
      if (yearMatch) {
        reason += ` By Year ${yearMatch[1]}, you'll draw units like ${unitNames}`;
        reason += topUnit.tacticalNotes?.trophyExpectation
          ? ` — ${topUnit.tacticalNotes.trophyExpectation}`
          : ".";
      } else if (topUnit.drawTimeline === "Drawable now") {
        reason += ` Units like ${unitNames} are drawable immediately — you can hunt ${state.name} Year 1.`;
      }
    }
  } else if (state.pointSystem === "random") {
    reason += ` No points, no wait — equal odds every year regardless of when you started.`;
  } else if (state.pointSystem === "bonus_squared") {
    reason += ` The squared bonus system exponentially rewards patience — your odds compound each year.`;
  } else if (state.pointSystem === "bonus") {
    reason += ` The bonus point system gives you incrementally better odds each year.`;
  }

  // Hunt style fit
  if (input.huntStylePrimary === "diy_truck") {
    const publicUnits = bestUnits.filter(u => {
      const unitObj = SAMPLE_UNITS.find(su => su.unitCode === u.unitCode && su.stateId === stateId);
      return unitObj && unitObj.publicLandPct > 0.35;
    });
    if (publicUnits.length > 0) {
      reason += ` These units have good road density and public land access — perfect for your ${hunterStyle} approach.`;
    }
  } else if (input.huntStylePrimary === "diy_backpack") {
    reason += ` The backcountry access here rewards your willingness to go deep.`;
  }

  // Budget efficiency
  const budgetFactor = scoreBreakdown.factors.find(f => f.label === "Budget Fit");
  if (budgetFactor && budgetFactor.score >= budgetFactor.maxScore * 0.7) {
    reason += ` At ~$${Math.round(state.feeSchedule.reduce((s, f) => s + (f.required ? f.amount : 0), 0) || 150)}/year in point costs, it's one of your most capital-efficient investments.`;
  }

  // State personality kicker
  if (state.statePersonality) {
    // Extract the most relevant sentence from the personality
    const sentences = state.statePersonality.split(". ");
    const kicker = sentences.find(s =>
      s.toLowerCase().includes("second-choice") ||
      s.toLowerCase().includes("combo") ||
      s.toLowerCase().includes("secret") ||
      s.toLowerCase().includes("sleeper") ||
      s.toLowerCase().includes("wild card")
    );
    if (kicker) {
      reason += ` ${kicker.endsWith(".") ? kicker : kicker + "."}`;
    }
  }

  return reason;
}

// ============================================================================
// v3: Travel Logistics Generator
// ============================================================================

function generateTravelLogistics(
  input: ConsultationInput,
  recs: StateRecommendation[]
): TravelLogistics | undefined {
  const dist = getStateDistance(input.homeState, "CO");
  // Only generate travel logistics for non-local hunters
  if (dist === "close" && input.travelWillingness === "drive_only") return undefined;

  const homeAirport = getPrimaryAirport(input.homeState);
  const stateRoutes: TravelLogisticsRoute[] = [];
  let totalBudget = 0;

  for (const rec of recs) {
    const state = STATES_MAP[rec.stateId];
    if (!state) continue;

    const routes = findBestRoutes(input.homeState, rec.stateId);
    const bestRoute = routes[0];
    const huntAirport = HUNTING_AIRPORTS[rec.stateId];

    const route: TravelLogisticsRoute = {
      stateId: rec.stateId,
      airport: bestRoute?.to ?? huntAirport?.primary ?? state.logistics?.primaryAirport?.split(" ")[0] ?? "regional",
      flightCost: bestRoute?.avgCost ?? 250,
      flightTime: bestRoute?.flightTime ?? "varies",
      direct: bestRoute?.direct ?? false,
      rentalCarNeeded: true,
      rentalNotes: state.logistics?.rentalCarNotes ?? "Standard rental car recommended.",
      driveToHuntArea: state.logistics?.drivingNotes ?? "See unit-specific details.",
      meatShipping: state.logistics?.meatProcessing ?? "Contact local processors for shipping options.",
    };

    stateRoutes.push(route);
    totalBudget += route.flightCost + 500; // flight + estimated rental
  }

  const tip = dist === "far"
    ? `Book flights 6-8 weeks before your hunt date for best prices. ${homeAirport} has the most direct flight options from your area. Consider Southwest/Frontier for budget-friendly options with free/cheap checked bags for gear.`
    : dist === "medium"
      ? `You're close enough to consider driving to ${recs.slice(0, 2).map(r => STATES_MAP[r.stateId]?.name).join(" and ")} while flying to farther states. Driving lets you bring more gear and game meat home without shipping hassles.`
      : `Your proximity to western states means driving is often the best option. Save flight money for premium hunts in harder-to-reach states.`;

  return {
    homeAirport,
    stateRoutes,
    totalTravelBudget: Math.round(totalBudget),
    tip,
  };
}

// ============================================================================
// v3: Season Calendar Generator
// ============================================================================

function generateSeasonCalendar(
  input: ConsultationInput,
  recs: StateRecommendation[]
): SeasonCalendarEntry[] {
  const calendar: SeasonCalendarEntry[] = [];

  for (const rec of recs) {
    const state = STATES_MAP[rec.stateId];
    if (!state?.seasonTiers || state.seasonTiers.length === 0) continue;

    const relevantSpecies = input.species.filter(s => state.availableSpecies.includes(s));

    for (const speciesId of relevantSpecies) {
      const tiers = state.seasonTiers.map(tier => {
        // Determine recommendation based on hunt style
        let recommendation = "";
        const styleMatch = input.huntStylePrimary === "diy_truck"
          ? tier.bestFor === "truck_camp" || tier.bestFor === "any"
          : input.huntStylePrimary === "diy_backpack"
            ? tier.bestFor === "backpack" || tier.bestFor === "any"
            : true;

        if (styleMatch && (tier.bestFor === "truck_camp" && input.huntStylePrimary === "diy_truck")) {
          recommendation = `Best match for your truck-camp style. ${tier.notes}`;
        } else if (styleMatch && (tier.bestFor === "backpack" && input.huntStylePrimary === "diy_backpack")) {
          recommendation = `Ideal for backcountry hunting. ${tier.notes}`;
        } else if (tier.bestFor === "any") {
          recommendation = `Good all-around option. ${tier.notes}`;
        } else {
          recommendation = tier.notes;
        }

        // Arrival date = 2 days before season opens
        const dateMatch = tier.dates.match(/^(\w+ \d+)/);
        const arrivalDate = dateMatch
          ? `Arrive 2 days before ${tier.tier} opens (${dateMatch[1]})`
          : `Arrive 2 days early for acclimation`;

        return {
          name: tier.tier,
          dates: tier.dates,
          recommendation,
          arrivalDate,
        };
      });

      calendar.push({
        stateId: rec.stateId,
        species: speciesId,
        tiers,
      });
    }
  }

  return calendar;
}

// ============================================================================
// v3: Point-Only Application Guide Generator
// ============================================================================

function generatePointOnlyGuide(
  recs: StateRecommendation[]
): PointOnlyGuideEntry[] {
  const guide: PointOnlyGuideEntry[] = [];

  for (const rec of recs) {
    const state = STATES_MAP[rec.stateId];
    if (!state) continue;

    // Skip random draw states — they don't have points to buy
    if (state.pointSystem === "random") continue;

    const pointApp = state.pointOnlyApplication;
    if (!pointApp) continue;

    guide.push({
      stateId: rec.stateId,
      stateName: state.name,
      instructions: pointApp.instructions,
      huntCode: pointApp.huntCode,
      secondChoiceTactic: pointApp.secondChoiceTactic,
      deadline: pointApp.deadline,
      annualCost: rec.annualCost,
      url: pointApp.purchaseUrl,
    });
  }

  // Sort by deadline
  guide.sort((a, b) => a.deadline.localeCompare(b.deadline));

  return guide;
}

// ============================================================================

function buildStrategyOverview(
  recs: StateRecommendation[],
  annualSub: number
): string {
  const primaries = recs.filter((r) => r.role === "primary");
  const secondaries = recs.filter((r) => r.role === "secondary");
  const wildcards = recs.filter((r) => r.role === "wildcard");
  const longTerms = recs.filter((r) => r.role === "long_term");

  let overview = "Your portfolio is built around ";
  if (primaries.length > 0) {
    overview += `${primaries.map((a) => STATES_MAP[a.stateId]?.name).join(" and ")} as your anchor state${primaries.length > 1 ? "s" : ""}`;
  }
  if (secondaries.length > 0) {
    overview += `, with ${secondaries.map((b) => STATES_MAP[b.stateId]?.name).join(", ")} building medium-term value`;
  }
  if (wildcards.length > 0) {
    overview += `, ${wildcards.map((w) => STATES_MAP[w.stateId]?.name).join(", ")} as wild-card lottery plays`;
  }
  if (longTerms.length > 0) {
    overview += `, and ${longTerms.map((l) => STATES_MAP[l.stateId]?.name).join(", ")} as long-term trophy investments`;
  }
  overview += `. At ~$${Math.round(annualSub)}/year in point subscriptions, this keeps you positioned across ${recs.length} states.`;

  return overview;
}

// Legacy wrapper for backward compat
interface RoadmapInput {
  species: string[];
  targetStates: string[];
  currentPoints: Record<string, Record<string, number>>;
  huntStyle: HuntStyle;
  focus: PlanFocus;
  budgetMin: number;
  budgetMax: number;
  durationYears?: number;
}

export function generateRoadmap(input: RoadmapInput): RoadmapYear[] {
  const assessment = generateStrategicAssessment({
    homeState: "",
    homeCity: "",
    experienceLevel: "3_5_trips",
    physicalComfort: "any",
    hasHuntedStates: [],
    species: input.species,
    trophyVsMeat: input.focus === "trophy" ? "trophy_focused" : input.focus === "opportunity" ? "meat_focused" : "balanced",
    bucketListDescription: "",
    dreamHunts: [],
    pointYearBudget: input.budgetMax * 0.4,
    huntYearBudget: input.budgetMax,
    huntFrequency: "every_year",
    timeAvailable: "full_week",
    travelWillingness: "will_fly_anywhere",
    hasExistingPoints: Object.keys(input.currentPoints).length > 0,
    existingPoints: input.currentPoints,
    huntStylePrimary: input.huntStyle,
    openToGuided: false,
    guidedForSpecies: [],
    preferredTerrain: [],
    importantFactors: [],
  });
  return assessment.roadmap;
}
