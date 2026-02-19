import type { ConsultationInput } from "./roadmap-generator";
import type { useWizardStore } from "@/lib/store";

export function buildConsultationInput(wizard: ReturnType<typeof useWizardStore.getState>): ConsultationInput {
  return {
    homeState: wizard.homeState,
    homeCity: wizard.homeCity,
    experienceLevel: wizard.experienceLevel ?? "never_hunted_west",
    physicalComfort: wizard.physicalComfort ?? "moderate_elevation",
    hasHuntedStates: wizard.hasHuntedStates,
    species: wizard.species,
    trophyVsMeat: wizard.trophyVsMeat ?? "balanced",
    bucketListDescription: wizard.bucketListDescription,
    dreamHunts: wizard.dreamHunts,
    pointYearBudget: wizard.pointYearBudget,
    huntYearBudget: wizard.huntYearBudget,
    huntFrequency: wizard.huntFrequency ?? "every_year",
    timeAvailable: wizard.timeAvailable ?? "full_week",
    travelWillingness: wizard.travelWillingness ?? "will_fly_anywhere",
    hasExistingPoints: wizard.hasExistingPoints,
    existingPoints: wizard.existingPoints,
    huntStylePrimary: wizard.huntStylePrimary ?? "diy_truck",
    openToGuided: wizard.openToGuided,
    guidedForSpecies: wizard.guidedForSpecies,
    preferredTerrain: wizard.preferredTerrain,
    importantFactors: wizard.importantFactors,
    selectedStatesConfirmed: wizard.selectedStatesConfirmed,
  };
}
