"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Compass } from "lucide-react";
import { useWizardStore, useAppStore } from "@/lib/store";
import { generateStrategicAssessment } from "@/lib/engine/roadmap-generator";
import { loadDataContext } from "@/lib/engine/data-loader";
import { ConsultationShell } from "@/components/consultation/ConsultationShell";
import { ResultsShell } from "@/components/results/ResultsShell";
import { GenerationProgress } from "@/components/results/shared/GenerationProgress";
import type { StrategicAssessment } from "@/lib/types";

function getInitialAssessment(): StrategicAssessment | null {
  const wizardState = useWizardStore.getState();
  const appState = useAppStore.getState();
  // Restore from wizard store first, then app store as fallback
  if (wizardState.step === 10 && wizardState.confirmedPlan) {
    return wizardState.confirmedPlan;
  }
  if (wizardState.step === 10 && appState.confirmedAssessment) {
    return appState.confirmedAssessment;
  }
  if (wizardState.step === 10 || wizardState.step > 10) {
    wizardState.setStep(1);
  }
  return null;
}

export default function PlanBuilderPage() {
  const wizard = useWizardStore();
  const appStore = useAppStore();
  const searchParams = useSearchParams();
  const [isGenerating, setIsGenerating] = useState(false);
  const [assessment, setAssessment] = useState<StrategicAssessment | null>(getInitialAssessment);

  const [generationError, setGenerationError] = useState<string | null>(null);

  // Fresh wizard mode: reset state when coming from "Plan for another person"
  useEffect(() => {
    if (searchParams.get("fresh") === "true") {
      useWizardStore.getState().reset();
      setAssessment(null);
      // Clean the URL so refreshing doesn't reset again
      window.history.replaceState({}, "", "/plan-builder");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Hydration recovery: if Zustand hydrates after initial render with
  // a confirmed plan, sync the assessment state to match
  useEffect(() => {
    const wizState = useWizardStore.getState();
    const appState = useAppStore.getState();
    if (wizState.step === 10 && !assessment) {
      const restored = wizState.confirmedPlan ?? appState.confirmedAssessment;
      if (restored) setAssessment(restored);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const horizonYears = wizard.planningHorizon || 10;

  async function handleGenerate() {
    setIsGenerating(true);
    setGenerationError(null);
    wizard.setGenerationPhase("Loading latest data...");
    wizard.setGenerationProgress(0);

    // Hydrate engine with DB-backed data (silent fallback to constants)
    await loadDataContext().catch(() => {});

    wizard.setGenerationPhase("Analyzing your profile...");

    const phases = [
      { phase: "Scoring states against your profile...", pct: 20 },
      { phase: "Selecting optimal state portfolio...", pct: 40 },
      { phase: `Building ${horizonYears}-year roadmap...`, pct: 60 },
      { phase: "Calculating costs and budgets...", pct: 75 },
      { phase: "Crafting personalized narrative...", pct: 90 },
    ];

    phases.forEach(({ phase, pct }, i) => {
      setTimeout(() => {
        wizard.setGenerationPhase(phase);
        wizard.setGenerationProgress(pct);
      }, (i + 1) * 300);
    });

    setTimeout(() => {
      try {
        const result = generateStrategicAssessment({
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
          selectedStatesConfirmed: wizard.selectedStatesConfirmed,
          planForName: wizard.planForName || undefined,
          planForAge: wizard.planForAge ?? undefined,
          planningHorizon: wizard.planningHorizon,
        });

        // Deduplicate: only add points not already in the store
        const existing = appStore.userPoints;
        Object.entries(wizard.existingPoints).forEach(([stateId, speciesMap]) => {
          Object.entries(speciesMap).forEach(([speciesId, pts]) => {
            if (pts > 0) {
              const alreadyExists = existing.some(
                (p) => p.stateId === stateId && p.speciesId === speciesId
              );
              if (!alreadyExists) {
                appStore.addUserPoint({
                  id: crypto.randomUUID(),
                  userId: "local",
                  stateId,
                  speciesId,
                  points: pts,
                  pointType: "preference",
                });
              }
            }
          });
        });

        wizard.setGenerationProgress(100);
        wizard.setGenerationPhase("Complete!");
        setAssessment(result);
        wizard.confirmPlan(result);

        // Save with person name if this is a plan for someone else
        if (wizard.planForName) {
          appStore.savePlan(wizard.planForName, result, "person");
        } else {
          appStore.setConfirmedAssessment(result);
        }
        wizard.setStep(10);
      } catch (err) {
        console.error("Strategy generation failed:", err);
        setGenerationError(
          "Something went wrong generating your strategy. Please try again."
        );
      } finally {
        setIsGenerating(false);
      }
    }, 2000);
  }

  const showConsultation = wizard.step >= 1 && wizard.step <= 9 && !isGenerating;
  const showResults = wizard.step === 10 && assessment && !isGenerating;

  const personLabel = wizard.planForName
    ? `${wizard.planForName}'s`
    : "Your";

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight flex items-center justify-center gap-2">
          <Compass className="w-6 h-6 text-primary" />
          Strategic Hunt Consultation
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {showResults
            ? `${personLabel} personalized ${assessment.roadmap.length}-year western big game strategy`
            : "Answer honestly \u2014 the best strategy comes from understanding who you are as a hunter."}
        </p>
      </div>

      {showConsultation && (
        <ConsultationShell onGenerate={handleGenerate} isGenerating={isGenerating} />
      )}

      {isGenerating && <GenerationProgress />}

      {generationError && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
          <p className="text-sm text-destructive">{generationError}</p>
        </div>
      )}

      {showResults && <ResultsShell assessment={assessment} />}
    </div>
  );
}
