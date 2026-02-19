/**
 * State Preview Engine
 * Lightweight scoring for Step 8 "Help Me Choose" — runs the full 9-factor
 * scoring without generating the full roadmap, milestones, or narratives.
 * Also generates adaptive fine-tune questions for Step 9.
 *
 * Uses the shared DataContext from roadmap-generator to ensure preview
 * and full generation always operate on the same data (DB or constants).
 */

import { scoreStateForHunter, getDataContext } from "./roadmap-generator";
import type { ConsultationInput } from "./roadmap-generator";
import type { StateScoreBreakdown } from "@/lib/types";

export function generateStatePreview(input: ConsultationInput): StateScoreBreakdown[] {
  const data = getDataContext();
  return data.states
    .map((s) => scoreStateForHunter(s.id, input))
    .sort((a, b) => b.totalScore - a.totalScore);
}


export interface FineTuneQuestion {
  id: string;
  stateId?: string;
  question: string;
  options: { id: string; label: string; description: string }[];
}

export function generateFineTuneQuestions(
  confirmedStates: string[],
  input: ConsultationInput
): FineTuneQuestion[] {
  const questions: FineTuneQuestion[] = [];
  const data = getDataContext();

  // Colorado second-choice tactic
  if (confirmedStates.includes("CO")) {
    questions.push({
      id: "co-strategy",
      stateId: "CO",
      question: "Colorado has a powerful second-choice tactic. Would you rather hunt CO almost every year, or save all your points for a premium unit?",
      options: [
        { id: "hunt_yearly", label: "Hunt Every Year", description: "Use the second-choice tactic to build a point AND get a tag most years." },
        { id: "save_premium", label: "Save for Premium", description: "Bank all points for a top-tier unit draw in Year 5+." },
        { id: "mix", label: "Mix Both", description: "Hunt CO some years, bank points in others. Flexible approach." },
      ],
    });
  }

  // Nevada long game
  if (confirmedStates.includes("NV")) {
    questions.push({
      id: "nv-commitment",
      stateId: "NV",
      question: "Nevada's bonus-squared system is a long-term play — potentially 10+ years for premium units. Are you comfortable with that timeline?",
      options: [
        { id: "committed", label: "All In", description: "I'll invest annually for the long haul. The payoff is worth it." },
        { id: "try_it", label: "Give It 5 Years", description: "I'll build points for 5 years and reassess if it's worth continuing." },
        { id: "skip", label: "Maybe Not", description: "That's too long for me. Remove NV from the portfolio." },
      ],
    });
  }

  // Random draw states
  const randomStates = confirmedStates.filter((s) => {
    const state = data.statesMap[s];
    return state?.pointSystem === "random";
  });
  if (randomStates.length > 0) {
    const names = randomStates.map((s) => data.statesMap[s]?.name).join(" and ");
    questions.push({
      id: "random-strategy",
      question: `${names} ${randomStates.length > 1 ? "are" : "is a"} pure random draw — no points matter. Do you want to apply every year as a lottery play?`,
      options: [
        { id: "every_year", label: "Apply Every Year", description: "Low cost, same odds every year. Why not take the shot?" },
        { id: "hunt_years_only", label: "Only When I Can Go", description: "Only apply in years I can actually make the trip if drawn." },
      ],
    });
  }

  // Wyoming moose dream hunt
  if (confirmedStates.includes("WY") && input.species.includes("moose")) {
    questions.push({
      id: "wy-moose",
      stateId: "WY",
      question: "Wyoming Shiras moose is a 15+ year NR wait but near 100% success when drawn. Should we add this as a dream hunt investment?",
      options: [
        { id: "add_dream", label: "Add It", description: "Include moose as a long-term dream hunt. ~$70/yr investment." },
        { id: "skip_moose", label: "Skip for Now", description: "Focus the budget on more accessible species." },
      ],
    });
  }

  // Budget stretch warning
  const avgBudget = input.pointYearBudget;
  const estimatedCostPerState = 200;
  if (confirmedStates.length * estimatedCostPerState > avgBudget * 0.8) {
    questions.push({
      id: "budget-trim",
      question: `Your ${confirmedStates.length}-state portfolio may push close to your $${avgBudget.toLocaleString()}/yr point budget. Would you like us to optimize for fewer states?`,
      options: [
        { id: "keep_all", label: "Keep All States", description: "I'll stretch the budget to maintain maximum coverage." },
        { id: "trim_auto", label: "Optimize for Me", description: "Trim to the highest-value states that fit my budget comfortably." },
        { id: "trim_manual", label: "I'll Choose", description: "Go back and deselect specific states." },
      ],
    });
  }

  // Guided hunt follow-up for trophy states
  if (input.openToGuided) {
    const trophyStates = confirmedStates.filter((s) => {
      const state = data.statesMap[s];
      return state?.pointSystem === "bonus" || state?.pointSystem === "bonus_squared";
    });
    if (trophyStates.length > 0) {
      const names = trophyStates.map((s) => data.statesMap[s]?.name).join(" and ");
      questions.push({
        id: "guided-trophy",
        question: `For trophy-tier draws in ${names}, a local guide can be the difference between a tag and a trophy. Book a guide when you draw?`,
        options: [
          { id: "yes_guide", label: "Yes, Book a Guide", description: "Budget $3,000-5,000 extra for guided trophy hunts." },
          { id: "diy_trophy", label: "DIY Even for Trophies", description: "I'll do my own scouting and preparation." },
          { id: "decide_later", label: "Decide When Drawn", description: "Cross that bridge when I get there." },
        ],
      });
    }
  }

  return questions;
}
