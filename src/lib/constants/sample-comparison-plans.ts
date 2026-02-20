/**
 * Static sample plans for the homepage outcome comparison section.
 * Plan A = unstructured / applying blind.
 * Plan B = disciplined, Odyssey-style strategy.
 *
 * Both spend ~$1,200/year over an 8-year horizon so the comparison is fair.
 */

export interface SamplePlanYear {
  year: number;
  /** "build" = point-year, "draw" = hunt-year, "idle" = no action */
  phase: "build" | "draw" | "idle";
  state?: string;
  species?: string;
}

export interface SamplePlan {
  label: string;
  annualSpend: number;
  states: number;
  horizonYears: number;
  huntsProjected: string;
  coordinatedBurnCycle: boolean;
  drawClarity: boolean;
  timeline: SamplePlanYear[];
  summary: string;
}

export const planBlind: SamplePlan = {
  label: "Applying Blind",
  annualSpend: 1200,
  states: 6,
  horizonYears: 8,
  huntsProjected: "0–1",
  coordinatedBurnCycle: false,
  drawClarity: false,
  timeline: [
    { year: 1, phase: "build", state: "CO", species: "Elk" },
    { year: 2, phase: "build", state: "WY", species: "Elk" },
    { year: 3, phase: "build", state: "MT", species: "Mule Deer" },
    { year: 4, phase: "build", state: "AZ", species: "Elk" },
    { year: 5, phase: "build", state: "NV", species: "Mule Deer" },
    { year: 6, phase: "build", state: "UT", species: "Elk" },
    { year: 7, phase: "build", state: "CO", species: "Elk" },
    { year: 8, phase: "idle" },
  ],
  summary: "8 Years \u2192 1 Opportunity",
};

export const planDisciplined: SamplePlan = {
  label: "Disciplined Strategy",
  annualSpend: 1200,
  states: 4,
  horizonYears: 8,
  huntsProjected: "3–5",
  coordinatedBurnCycle: true,
  drawClarity: true,
  timeline: [
    { year: 1, phase: "build", state: "WY", species: "Elk" },
    { year: 2, phase: "draw", state: "WY", species: "Pronghorn" },
    { year: 3, phase: "build", state: "MT", species: "Elk" },
    { year: 4, phase: "draw", state: "CO", species: "Elk" },
    { year: 5, phase: "build", state: "NM", species: "Elk" },
    { year: 6, phase: "draw", state: "MT", species: "Mule Deer" },
    { year: 7, phase: "build", state: "WY", species: "Elk" },
    { year: 8, phase: "draw", state: "NM", species: "Elk" },
  ],
  summary: "8 Years \u2192 3\u20135 Hunts",
};
