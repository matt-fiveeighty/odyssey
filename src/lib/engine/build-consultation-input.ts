import type { ConsultationInput } from "./roadmap-generator";
import type { useWizardStore } from "@/lib/store";

export function buildConsultationInput(wizard: ReturnType<typeof useWizardStore.getState>): ConsultationInput {
  return {
    homeState: wizard.homeState,
    homeCity: wizard.homeCity,
    experienceLevel: wizard.experienceLevel!,
    physicalComfort: wizard.physicalComfort!,
    hasHuntedStates: wizard.hasHuntedStates,
    species: wizard.species,
    trophyVsMeat: wizard.trophyVsMeat!,
    bucketListDescription: wizard.bucketListDescription,
    dreamHunts: wizard.dreamHunts,
    pointYearBudget: wizard.pointYearBudget,
    huntYearBudget: wizard.huntYearBudget,
    huntFrequency: wizard.huntFrequency!,
    timeAvailable: wizard.timeAvailable!,
    travelWillingness: wizard.travelWillingness!,
    hasExistingPoints: wizard.hasExistingPoints,
    existingPoints: wizard.existingPoints,
    huntStylePrimary: wizard.huntStylePrimary!,
    openToGuided: wizard.openToGuided,
    guidedForSpecies: wizard.guidedForSpecies,
    preferredTerrain: wizard.preferredTerrain,
    importantFactors: wizard.importantFactors,
  };
}
