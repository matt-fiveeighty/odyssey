"use client";

import { useState, useRef, useCallback } from "react";
import { useWizardStore } from "@/lib/store";
import { ConsultationProgress } from "./shared/ConsultationProgress";
import { StepTransition } from "./shared/StepTransition";
import { StepAboutYou } from "./steps/StepAboutYou";
import { StepWhatsCalling } from "./steps/StepWhatsCalling";
import { StepPaintThePicture } from "./steps/StepPaintThePicture";
import { StepLetsTalkMoney } from "./steps/StepLetsTalkMoney";
import { StepHuntingDNA } from "./steps/StepHuntingDNA";
import { StepTravelReality } from "./steps/StepTravelReality";
import { StepPointPortfolio } from "./steps/StepPointPortfolio";
import { StepHelpMeChoose } from "./steps/StepHelpMeChoose";
import { StepFineTune } from "./steps/StepFineTune";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Sparkles, RotateCcw } from "lucide-react";

interface ConsultationShellProps {
  onGenerate: () => void;
  isGenerating: boolean;
}

function canProceed(step: number, wizard: ReturnType<typeof useWizardStore.getState>): boolean {
  switch (step) {
    case 1:
      return wizard.homeState !== "" && wizard.experienceLevel !== null && wizard.physicalComfort !== null;
    case 2:
      return wizard.species.length > 0;
    case 3:
      return wizard.trophyVsMeat !== null;
    case 4:
      return wizard.pointYearBudget > 0 && wizard.huntYearBudget > 0;
    case 5:
      return wizard.huntStylePrimary !== null && wizard.importantFactors.length > 0;
    case 6:
      return wizard.huntFrequency !== null && wizard.timeAvailable !== null && wizard.travelWillingness !== null;
    case 7:
      return true; // points are optional
    case 8:
      return wizard.selectedStatesConfirmed.length > 0;
    case 9:
      return true; // fine-tune is optional
    default:
      return false;
  }
}

/** Returns a short hint about what's missing for the current step. */
function getValidationHint(step: number, wizard: ReturnType<typeof useWizardStore.getState>): string | null {
  switch (step) {
    case 1: {
      const missing: string[] = [];
      if (!wizard.homeState) missing.push("home state");
      if (!wizard.experienceLevel) missing.push("experience level");
      if (!wizard.physicalComfort) missing.push("physical comfort");
      return missing.length > 0 ? `Select your ${missing.join(", ")}` : null;
    }
    case 2:
      return wizard.species.length === 0 ? "Select at least one species" : null;
    case 3:
      return wizard.trophyVsMeat === null ? "Choose your priority: trophy, meat, or balanced" : null;
    case 4: {
      const missing: string[] = [];
      if (wizard.pointYearBudget <= 0) missing.push("point-year budget");
      if (wizard.huntYearBudget <= 0) missing.push("hunt-year budget");
      return missing.length > 0 ? `Set your ${missing.join(" and ")}` : null;
    }
    case 5: {
      const missing: string[] = [];
      if (!wizard.huntStylePrimary) missing.push("hunt style");
      if (wizard.importantFactors.length === 0) missing.push("at least one important factor");
      return missing.length > 0 ? `Select ${missing.join(" and ")}` : null;
    }
    case 6: {
      const missing: string[] = [];
      if (!wizard.huntFrequency) missing.push("hunt frequency");
      if (!wizard.timeAvailable) missing.push("time available");
      if (!wizard.travelWillingness) missing.push("travel willingness");
      return missing.length > 0 ? `Choose your ${missing.join(", ")}` : null;
    }
    case 8:
      return wizard.selectedStatesConfirmed.length === 0 ? "Confirm at least one state" : null;
    default:
      return null;
  }
}

export function ConsultationShell({ onGenerate, isGenerating }: ConsultationShellProps) {
  const wizard = useWizardStore();
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const prevStep = useRef(wizard.step);

  const handleNext = useCallback(() => {
    if (wizard.step < 9) {
      setDirection("forward");
      prevStep.current = wizard.step;
      wizard.setStep(wizard.step + 1);
    } else if (wizard.step === 9) {
      onGenerate();
    }
  }, [wizard, onGenerate]);

  const handleBack = useCallback(() => {
    if (wizard.step > 1) {
      setDirection("backward");
      prevStep.current = wizard.step;
      wizard.setStep(wizard.step - 1);
    }
  }, [wizard]);

  const handleStepClick = useCallback((step: number) => {
    setDirection(step < wizard.step ? "backward" : "forward");
    prevStep.current = wizard.step;
    wizard.setStep(step);
  }, [wizard]);

  const renderStep = () => {
    switch (wizard.step) {
      case 1: return <StepAboutYou />;
      case 2: return <StepWhatsCalling />;
      case 3: return <StepPaintThePicture />;
      case 4: return <StepLetsTalkMoney />;
      case 5: return <StepHuntingDNA />;
      case 6: return <StepTravelReality />;
      case 7: return <StepPointPortfolio />;
      case 8: return <StepHelpMeChoose />;
      case 9: return <StepFineTune />;
      default: return null;
    }
  };

  const isComplete = canProceed(wizard.step, wizard);
  const hint = getValidationHint(wizard.step, wizard);

  return (
    <div className="space-y-4">
      <ConsultationProgress currentStep={wizard.step} onStepClick={handleStepClick} />

      <StepTransition direction={direction} stepKey={wizard.step}>
        {renderStep()}
      </StepTransition>

      <div className="flex items-center justify-between pt-2">
        <div>
          {wizard.step > 1 && (
            <Button variant="ghost" onClick={handleBack} className="gap-1.5">
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {wizard.step === 1 && (
            <Button variant="ghost" size="sm" onClick={() => wizard.reset()} className="gap-1 text-xs text-muted-foreground">
              <RotateCcw className="w-3 h-3" /> Reset
            </Button>
          )}

          {wizard.step < 9 ? (
            <div className="flex items-center gap-3">
              {!isComplete && hint && (
                <span className="text-[11px] text-muted-foreground/70 hidden sm:block max-w-[200px] text-right">
                  {hint}
                </span>
              )}
              <Button
                onClick={handleNext}
                disabled={!isComplete}
                className="gap-1.5"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleNext}
              disabled={isGenerating}
              className="gap-1.5 bg-gradient-to-r from-primary to-chart-2 hover:opacity-90 glow-pulse shimmer-sweep"
            >
              <Sparkles className="w-4 h-4" />
              {isGenerating ? "Generating..." : <><span className="hidden sm:inline">Build My Roadmap</span><span className="sm:hidden">Build</span></>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
