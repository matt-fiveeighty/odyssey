/**
 * Synthetic Cohort Profile Generator
 *
 * Generates 50 distinct JSON user profiles distributed across 5 allocator personas:
 *   - 10 Spreadsheet Engineers: $8k-$12k, 4-5 states, technical, frequently changes inputs
 *   - 10 Capital-Heavy Allocators: $30k-$40k, 6-8 states, Sheep/Goat/Elk, 10+ year horizon
 *   - 15 Time-Starved Dads: $7k budget, 8-9 PTO days, 1-year focus, avoids overload
 *   - 10 Skeptical CPAs: Multi-state, zero tolerance for mismatched totals or stale fees
 *   - 5 Edge Case Breakers: $0 budget, $100k budget, max PTO, no PTO
 */

import type { ConsultationInput } from "../../roadmap-generator";
import type { HuntStyle, WeaponType, ExperienceLevel, TrophyVsMeat } from "@/lib/types";
import type { HuntFrequency, TimeAvailable, TravelWillingness, PhysicalComfort } from "@/lib/store";

// ── Persona type tags ──

export type PersonaType =
  | "spreadsheet_engineer"
  | "capital_heavy"
  | "time_starved_dad"
  | "skeptical_cpa"
  | "edge_case";

export interface SyntheticProfile {
  id: string;
  name: string;
  persona: PersonaType;
  input: ConsultationInput;
  /** Annual hunt budget (hunt year) — used to validate budget discipline */
  huntYearBudget: number;
  /** Annual point year budget */
  pointYearBudget: number;
  /** PTO days available per year — validates schedule conflicts */
  ptoDays: number;
  /** Expected number of states in play */
  expectedStateCount: number;
  /** Human description of what this profile tests */
  testDescription: string;
}

// ── Deterministic seeded randomness (no Math.random — fully reproducible) ──

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pickN<T>(rng: () => number, arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => rng() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

// ── Constants ──

const ALL_STATES = ["CO", "WY", "MT", "NV", "AZ", "UT", "NM", "OR", "ID", "KS", "AK"];
const HOME_STATES = ["TX", "CA", "FL", "WA", "MN", "PA", "OH", "GA", "CO", "AZ"];
const HOME_CITIES = ["Dallas", "Los Angeles", "Tampa", "Seattle", "Minneapolis", "Pittsburgh", "Columbus", "Atlanta", "Denver", "Phoenix"];

const ELK_DEER_SPECIES = ["elk", "mule_deer", "whitetail", "pronghorn"];
const PREMIUM_SPECIES = ["bighorn_sheep", "mountain_goat", "dall_sheep", "moose", "grizzly"];
const ALL_SPECIES = [...ELK_DEER_SPECIES, ...PREMIUM_SPECIES, "black_bear", "bison", "caribou", "mountain_lion"];
const WEAPONS: WeaponType[] = ["rifle", "archery", "muzzleloader"];
const HUNT_STYLES: HuntStyle[] = ["diy_truck", "diy_backpack", "guided", "drop_camp"];

// ── Profile Builders ──

function buildSpreadsheetEngineer(idx: number, rng: () => number): SyntheticProfile {
  const stateCount = randInt(rng, 4, 5);
  const states = pickN(rng, ALL_STATES, stateCount);
  const species = pickN(rng, [...ELK_DEER_SPECIES, "black_bear"], randInt(rng, 3, 5));
  const ptBudget = randInt(rng, 3000, 5000);
  const huntBudget = randInt(rng, 8000, 12000);
  const homeIdx = idx % HOME_STATES.length;

  // Generate some existing points (they track everything)
  const existingPoints: Record<string, Record<string, number>> = {};
  for (const st of states.slice(0, 3)) {
    existingPoints[st] = {};
    for (const sp of species.slice(0, 2)) {
      existingPoints[st][sp] = randInt(rng, 1, 6);
    }
  }

  return {
    id: `SE-${String(idx).padStart(2, "0")}`,
    name: `Spreadsheet Engineer ${idx + 1}`,
    persona: "spreadsheet_engineer",
    huntYearBudget: huntBudget,
    pointYearBudget: ptBudget,
    ptoDays: randInt(rng, 10, 21),
    expectedStateCount: stateCount,
    testDescription: `Technical user, $${ptBudget}/$${huntBudget} budget, ${stateCount} states, existing points in ${Object.keys(existingPoints).length} states`,
    input: {
      homeState: HOME_STATES[homeIdx],
      homeCity: HOME_CITIES[homeIdx],
      experienceLevel: pick(rng, ["3_5_trips", "veteran"] as ExperienceLevel[]),
      physicalComfort: pick(rng, ["moderate_elevation", "high_alpine"] as PhysicalComfort[]),
      hasHuntedStates: pickN(rng, states, 2),
      species,
      trophyVsMeat: pick(rng, ["lean_trophy", "balanced"] as TrophyVsMeat[]),
      bucketListDescription: "Maximize ROI across multiple states, diversify point portfolio",
      dreamHunts: [],
      pointYearBudget: ptBudget,
      huntYearBudget: huntBudget,
      huntFrequency: pick(rng, ["every_year", "every_other_year"] as HuntFrequency[]),
      timeAvailable: "2_weeks" as TimeAvailable,
      travelWillingness: "will_fly_anywhere" as TravelWillingness,
      hasExistingPoints: true,
      existingPoints,
      huntStylePrimary: pick(rng, ["diy_truck", "diy_backpack"] as HuntStyle[]),
      openToGuided: false,
      guidedForSpecies: [],
      preferredTerrain: ["Mixed", "Sagebrush"],
      importantFactors: ["draw_odds", "cost_efficiency", "public_land"],
      selectedStatesConfirmed: states,
      weaponType: pick(rng, WEAPONS),
      partySize: randInt(rng, 1, 2),
      planningHorizon: 10,
    },
  };
}

function buildCapitalHeavy(idx: number, rng: () => number): SyntheticProfile {
  const stateCount = randInt(rng, 6, 8);
  const states = pickN(rng, ALL_STATES, stateCount);
  // Always target premium species
  const species = [
    ...pickN(rng, PREMIUM_SPECIES, randInt(rng, 2, 4)),
    "elk",
    ...pickN(rng, ["mule_deer", "pronghorn"], 1),
  ];
  const uniqueSpecies = [...new Set(species)];
  const ptBudget = randInt(rng, 10000, 15000);
  const huntBudget = randInt(rng, 30000, 40000);
  const homeIdx = idx % HOME_STATES.length;

  // Significant existing points
  const existingPoints: Record<string, Record<string, number>> = {};
  for (const st of states.slice(0, 5)) {
    existingPoints[st] = {};
    for (const sp of uniqueSpecies.slice(0, 3)) {
      existingPoints[st][sp] = randInt(rng, 3, 15);
    }
  }

  return {
    id: `CH-${String(idx).padStart(2, "0")}`,
    name: `Capital-Heavy Allocator ${idx + 1}`,
    persona: "capital_heavy",
    huntYearBudget: huntBudget,
    pointYearBudget: ptBudget,
    ptoDays: randInt(rng, 14, 28),
    expectedStateCount: stateCount,
    testDescription: `High-budget ($${ptBudget}/$${huntBudget}), ${stateCount} states, premium species (${uniqueSpecies.join(", ")}), 10+ year horizon`,
    input: {
      homeState: HOME_STATES[homeIdx],
      homeCity: HOME_CITIES[homeIdx],
      experienceLevel: "veteran" as ExperienceLevel,
      physicalComfort: pick(rng, ["moderate_elevation", "high_alpine"] as PhysicalComfort[]),
      hasHuntedStates: pickN(rng, states, 4),
      species: uniqueSpecies,
      trophyVsMeat: pick(rng, ["trophy_focused", "lean_trophy"] as TrophyVsMeat[]),
      bucketListDescription: "Once-in-a-lifetime sheep, goat, and moose hunts. Money is not the constraint — time is.",
      dreamHunts: [
        {
          id: `dream-${idx}-1`,
          title: "Dall Sheep in Alaska",
          description: "Brooks Range fly-in sheep hunt",
          stateOrRegion: "AK",
          species: "dall_sheep",
          estimatedTimelineYears: 5,
          notes: "Guided $20K+",
        },
      ],
      pointYearBudget: ptBudget,
      huntYearBudget: huntBudget,
      huntFrequency: "every_year" as HuntFrequency,
      timeAvailable: "3_plus_weeks" as TimeAvailable,
      travelWillingness: "will_fly_anywhere" as TravelWillingness,
      hasExistingPoints: true,
      existingPoints,
      huntStylePrimary: pick(rng, ["guided", "drop_camp"] as HuntStyle[]),
      openToGuided: true,
      guidedForSpecies: pickN(rng, PREMIUM_SPECIES, 3),
      preferredTerrain: ["Alpine", "Mixed"],
      importantFactors: ["trophy_quality", "draw_odds", "public_land"],
      selectedStatesConfirmed: states,
      weaponType: pick(rng, WEAPONS),
      partySize: 1,
      planningHorizon: pick(rng, [10, 15, 20] as (10 | 15 | 20)[]),
    },
  };
}

function buildTimeStarvedDad(idx: number, rng: () => number): SyntheticProfile {
  const stateCount = randInt(rng, 2, 3);
  const states = pickN(rng, ["CO", "WY", "MT", "AZ", "NM", "KS"], stateCount); // Closer, simpler states
  const species = pickN(rng, ["elk", "mule_deer", "pronghorn", "whitetail"], randInt(rng, 1, 3));
  const ptBudget = randInt(rng, 2000, 3500);
  const huntBudget = 7000;
  const ptoDays = randInt(rng, 8, 9);
  const homeIdx = idx % HOME_STATES.length;

  return {
    id: `TD-${String(idx).padStart(2, "0")}`,
    name: `Time-Starved Dad ${idx + 1}`,
    persona: "time_starved_dad",
    huntYearBudget: huntBudget,
    pointYearBudget: ptBudget,
    ptoDays,
    expectedStateCount: stateCount,
    testDescription: `$7k budget, ${ptoDays} PTO days, ${stateCount} states, needs clear 1-year plan`,
    input: {
      homeState: HOME_STATES[homeIdx],
      homeCity: HOME_CITIES[homeIdx],
      experienceLevel: pick(rng, ["1_2_trips", "3_5_trips"] as ExperienceLevel[]),
      physicalComfort: "moderate" as PhysicalComfort,
      hasHuntedStates: pickN(rng, states, 1),
      species,
      trophyVsMeat: pick(rng, ["balanced", "lean_meat", "meat_focused"] as TrophyVsMeat[]),
      bucketListDescription: "Just want one good hunt a year without blowing the family budget",
      dreamHunts: [],
      pointYearBudget: ptBudget,
      huntYearBudget: huntBudget,
      huntFrequency: "every_other_year" as HuntFrequency,
      timeAvailable: "1_week" as TimeAvailable,
      travelWillingness: pick(rng, ["short_flight", "will_fly_anywhere"] as TravelWillingness[]),
      hasExistingPoints: rng() > 0.5,
      existingPoints: rng() > 0.5 ? { [states[0]]: { [species[0]]: randInt(rng, 0, 3) } } : {},
      huntStylePrimary: "diy_truck" as HuntStyle,
      openToGuided: false,
      guidedForSpecies: [],
      preferredTerrain: ["Mixed", "Prairie"],
      importantFactors: ["cost_efficiency", "accessibility", "success_rate"],
      selectedStatesConfirmed: states,
      weaponType: "rifle" as WeaponType,
      partySize: randInt(rng, 1, 2),
      planningHorizon: 10,
    },
  };
}

function buildSkepticalCPA(idx: number, rng: () => number): SyntheticProfile {
  const stateCount = randInt(rng, 4, 6);
  const states = pickN(rng, ALL_STATES, stateCount);
  const species = pickN(rng, ALL_SPECIES, randInt(rng, 3, 6));
  const ptBudget = randInt(rng, 4000, 8000);
  const huntBudget = randInt(rng, 10000, 18000);
  const homeIdx = idx % HOME_STATES.length;

  // They track every point
  const existingPoints: Record<string, Record<string, number>> = {};
  for (const st of states) {
    existingPoints[st] = {};
    for (const sp of species.slice(0, 2)) {
      existingPoints[st][sp] = randInt(rng, 0, 8);
    }
  }

  return {
    id: `CPA-${String(idx).padStart(2, "0")}`,
    name: `Skeptical CPA ${idx + 1}`,
    persona: "skeptical_cpa",
    huntYearBudget: huntBudget,
    pointYearBudget: ptBudget,
    ptoDays: randInt(rng, 10, 14),
    expectedStateCount: stateCount,
    testDescription: `Multi-state ($${ptBudget}/$${huntBudget}), ${stateCount} states, zero tolerance for math errors`,
    input: {
      homeState: HOME_STATES[homeIdx],
      homeCity: HOME_CITIES[homeIdx],
      experienceLevel: pick(rng, ["3_5_trips", "veteran"] as ExperienceLevel[]),
      physicalComfort: "moderate" as PhysicalComfort,
      hasHuntedStates: pickN(rng, states, 3),
      species,
      trophyVsMeat: "balanced" as TrophyVsMeat,
      bucketListDescription: "Want to verify every dollar is accounted for across all states",
      dreamHunts: [],
      pointYearBudget: ptBudget,
      huntYearBudget: huntBudget,
      huntFrequency: "every_year" as HuntFrequency,
      timeAvailable: "2_weeks" as TimeAvailable,
      travelWillingness: "will_fly_anywhere" as TravelWillingness,
      hasExistingPoints: true,
      existingPoints,
      huntStylePrimary: pick(rng, ["diy_truck", "drop_camp"] as HuntStyle[]),
      openToGuided: rng() > 0.5,
      guidedForSpecies: rng() > 0.5 ? pickN(rng, PREMIUM_SPECIES, 1) : [],
      preferredTerrain: ["Mixed"],
      importantFactors: ["cost_efficiency", "draw_odds", "public_land"],
      selectedStatesConfirmed: states,
      weaponType: pick(rng, WEAPONS),
      partySize: 1,
      planningHorizon: 10,
    },
  };
}

function buildEdgeCaseBreaker(idx: number, rng: () => number): SyntheticProfile {
  const homeIdx = idx % HOME_STATES.length;

  // 5 distinct edge cases
  const edgeCases: Array<{
    desc: string;
    ptBudget: number;
    huntBudget: number;
    pto: number;
    stateCount: number;
    species: string[];
    horizon: number;
  }> = [
    { desc: "$0 budget — zero allocation", ptBudget: 0, huntBudget: 0, pto: 14, stateCount: 3, species: ["elk", "mule_deer"], horizon: 10 },
    { desc: "$100K budget — maximum allocation", ptBudget: 30000, huntBudget: 100000, pto: 30, stateCount: 11, species: ALL_SPECIES.slice(0, 10), horizon: 20 },
    { desc: "0 PTO days — no time to hunt", ptBudget: 5000, huntBudget: 10000, pto: 0, stateCount: 4, species: ["elk", "mule_deer"], horizon: 10 },
    { desc: "Single species, single state — minimum viable plan", ptBudget: 500, huntBudget: 3000, pto: 5, stateCount: 1, species: ["elk"], horizon: 10 },
    { desc: "All 11 states, all species — maximum complexity", ptBudget: 15000, huntBudget: 50000, pto: 30, stateCount: 11, species: ALL_SPECIES.slice(0, 12), horizon: 25 },
  ];

  const ec = edgeCases[idx % edgeCases.length];
  const states = pickN(rng, ALL_STATES, ec.stateCount);

  return {
    id: `EC-${String(idx).padStart(2, "0")}`,
    name: `Edge Case Breaker ${idx + 1}`,
    persona: "edge_case",
    huntYearBudget: ec.huntBudget,
    pointYearBudget: ec.ptBudget,
    ptoDays: ec.pto,
    expectedStateCount: ec.stateCount,
    testDescription: ec.desc,
    input: {
      homeState: HOME_STATES[homeIdx],
      homeCity: HOME_CITIES[homeIdx],
      experienceLevel: "veteran" as ExperienceLevel,
      physicalComfort: ec.pto === 0 ? "low" as PhysicalComfort : "high" as PhysicalComfort,
      hasHuntedStates: [],
      species: ec.species,
      trophyVsMeat: "balanced" as TrophyVsMeat,
      bucketListDescription: ec.desc,
      dreamHunts: [],
      pointYearBudget: ec.ptBudget,
      huntYearBudget: ec.huntBudget,
      huntFrequency: "every_year" as HuntFrequency,
      timeAvailable: ec.pto >= 14 ? "3_plus_weeks" as TimeAvailable : ec.pto >= 7 ? "1_week" as TimeAvailable : "long_weekends" as TimeAvailable,
      travelWillingness: "will_fly_anywhere" as TravelWillingness,
      hasExistingPoints: false,
      existingPoints: {},
      huntStylePrimary: "diy_truck" as HuntStyle,
      openToGuided: ec.huntBudget > 20000,
      guidedForSpecies: ec.huntBudget > 20000 ? pickN(rng, PREMIUM_SPECIES, 2) : [],
      preferredTerrain: ["Mixed"],
      importantFactors: ["draw_odds", "cost_efficiency"],
      selectedStatesConfirmed: states,
      weaponType: "rifle" as WeaponType,
      partySize: 1,
      planningHorizon: ec.horizon as 10 | 15 | 20 | 25,
    },
  };
}

// ── Main Generator ──

export function generateSyntheticCohort(): SyntheticProfile[] {
  const profiles: SyntheticProfile[] = [];
  const rng = seededRandom(42); // Deterministic seed — same profiles every run

  // 10 Spreadsheet Engineers
  for (let i = 0; i < 10; i++) profiles.push(buildSpreadsheetEngineer(i, rng));
  // 10 Capital-Heavy Allocators
  for (let i = 0; i < 10; i++) profiles.push(buildCapitalHeavy(i, rng));
  // 15 Time-Starved Dads
  for (let i = 0; i < 15; i++) profiles.push(buildTimeStarvedDad(i, rng));
  // 10 Skeptical CPAs
  for (let i = 0; i < 10; i++) profiles.push(buildSkepticalCPA(i, rng));
  // 5 Edge Case Breakers
  for (let i = 0; i < 5; i++) profiles.push(buildEdgeCaseBreaker(i, rng));

  return profiles;
}
