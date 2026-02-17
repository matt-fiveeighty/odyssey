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
            <Button
              onClick={handleNext}
              disabled={!canProceed(wizard.step, wizard)}
              className="gap-1.5"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={isGenerating}
              className="gap-1.5 bg-gradient-to-r from-primary to-chart-2 hover:opacity-90 glow-pulse shimmer-sweep"
            >
              <Sparkles className="w-4 h-4" />
              {isGenerating ? "Generating..." : <><span className="hidden sm:inline">Generate My Strategy</span><span className="sm:hidden">Generate</span></>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
