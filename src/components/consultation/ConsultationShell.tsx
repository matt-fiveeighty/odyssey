"use client";

import { useState, useRef, useCallback, useMemo } from "react";
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
import { ChevronLeft, ChevronRight, Sparkles, RotateCcw, Zap } from "lucide-react";

interface ConsultationShellProps {
  onGenerate: () => void;
  isGenerating: boolean;
}

// Full 9-step sequence
const FULL_STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
// Express: About You, Species, Budget → auto-fill rest → generate
const EXPRESS_STEPS = [1, 2, 4] as const;

/** Western states that can drive to most hunt destinations */
const WESTERN_STATES = new Set([
  "CO", "WY", "MT", "ID", "UT", "NV", "NM", "AZ", "OR", "WA", "SD", "ND", "NE", "KS",
]);

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

/** Auto-fills defaults for steps skipped in express mode and triggers generation. */
function applyExpressDefaults(wizard: ReturnType<typeof useWizardStore.getState>) {
  const travel = WESTERN_STATES.has(wizard.homeState) ? "drive_only" : "short_flight";

  // Step 3: Paint the picture
  if (!wizard.trophyVsMeat) wizard.setField("trophyVsMeat", "balanced");
  if (!wizard.comfortWithUncertainty) wizard.setField("comfortWithUncertainty", "tolerate");

  // Step 5: Hunting DNA
  if (!wizard.huntStylePrimary) wizard.setField("huntStylePrimary", "diy_truck");
  if (wizard.importantFactors.length === 0) wizard.setField("importantFactors", ["draw_odds", "cost"]);

  // Step 6: Travel reality
  if (!wizard.huntFrequency) wizard.setField("huntFrequency", "every_year");
  if (!wizard.timeAvailable) wizard.setField("timeAvailable", "full_week");
  if (!wizard.travelWillingness) wizard.setField("travelWillingness", travel);

  // Step 8: States — use preview scores if available, otherwise pick top 3 from species availability
  if (wizard.selectedStatesConfirmed.length === 0) {
    if (wizard.previewScores.length > 0) {
      const top3 = [...wizard.previewScores]
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, 3)
        .map((s) => s.stateId);
      wizard.confirmStateSelection(top3);
    }
    // If no preview scores yet, the engine will auto-select based on scoring
  }
}

export function ConsultationShell({ onGenerate, isGenerating }: ConsultationShellProps) {
  const wizard = useWizardStore();
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const prevStep = useRef(wizard.step);

  const steps = wizard.expressMode ? EXPRESS_STEPS : FULL_STEPS;
  const totalSteps = steps.length;

  // Map wizard.step to display position (1-based)
  const displayPosition = useMemo(() => {
    const idx = (steps as readonly number[]).indexOf(wizard.step);
    return idx >= 0 ? idx + 1 : 1;
  }, [wizard.step, steps]);

  const isLastStep = displayPosition === totalSteps;

  const handleNext = useCallback(() => {
    if (wizard.expressMode) {
      const currentIdx = EXPRESS_STEPS.indexOf(wizard.step as (typeof EXPRESS_STEPS)[number]);
      if (currentIdx < EXPRESS_STEPS.length - 1) {
        // Move to next express step
        setDirection("forward");
        prevStep.current = wizard.step;
        wizard.setStep(EXPRESS_STEPS[currentIdx + 1]);
      } else {
        // Last express step — apply defaults and generate
        applyExpressDefaults(wizard);
        onGenerate();
      }
    } else {
      if (wizard.step < 9) {
        setDirection("forward");
        prevStep.current = wizard.step;
        wizard.setStep(wizard.step + 1);
      } else if (wizard.step === 9) {
        onGenerate();
      }
    }
  }, [wizard, onGenerate]);

  const handleBack = useCallback(() => {
    if (wizard.expressMode) {
      const currentIdx = EXPRESS_STEPS.indexOf(wizard.step as (typeof EXPRESS_STEPS)[number]);
      if (currentIdx > 0) {
        setDirection("backward");
        prevStep.current = wizard.step;
        wizard.setStep(EXPRESS_STEPS[currentIdx - 1]);
      }
    } else {
      if (wizard.step > 1) {
        setDirection("backward");
        prevStep.current = wizard.step;
        wizard.setStep(wizard.step - 1);
      }
    }
  }, [wizard]);

  const handleStepClick = useCallback((step: number) => {
    if (wizard.expressMode) return; // No step jumping in express mode
    setDirection(step < wizard.step ? "backward" : "forward");
    prevStep.current = wizard.step;
    wizard.setStep(step);
  }, [wizard]);

  const handleSwitchMode = useCallback(() => {
    const newMode = !wizard.expressMode;
    wizard.setExpressMode(newMode);
    // Reset to step 1 when switching modes
    wizard.setStep(1);
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
      {/* Express mode badge + mode toggle */}
      {wizard.expressMode ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-chart-2/15 text-chart-2 text-xs font-medium">
              <Zap className="w-3 h-3" />
              Quick Plan
            </div>
            <span className="text-xs text-muted-foreground">
              Step {displayPosition} of {totalSteps}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSwitchMode}
            className="text-xs text-muted-foreground gap-1"
          >
            Switch to Full Consultation
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <ConsultationProgress currentStep={wizard.step} onStepClick={handleStepClick} />
          {wizard.step === 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSwitchMode}
              className="text-xs text-muted-foreground gap-1 shrink-0"
            >
              <Zap className="w-3 h-3" />
              Quick Plan
            </Button>
          )}
        </div>
      )}

      <StepTransition direction={direction} stepKey={wizard.step}>
        {renderStep()}
      </StepTransition>

      <div className="flex items-center justify-between pt-2">
        <div>
          {displayPosition > 1 && (
            <Button variant="ghost" onClick={handleBack} className="gap-1.5">
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {wizard.step === 1 && !wizard.expressMode && (
            <Button variant="ghost" size="sm" onClick={() => wizard.reset()} className="gap-1 text-xs text-muted-foreground">
              <RotateCcw className="w-3 h-3" /> Reset
            </Button>
          )}

          {!isLastStep ? (
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
              disabled={isGenerating || !isComplete}
              className={`gap-1.5 ${wizard.expressMode ? "bg-gradient-to-r from-chart-2 to-primary" : "bg-gradient-to-r from-primary to-chart-2"} hover:opacity-90 glow-pulse shimmer-sweep`}
            >
              {wizard.expressMode ? (
                <>
                  <Zap className="w-4 h-4" />
                  {isGenerating ? "Generating..." : "Build Quick Plan"}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {isGenerating ? "Generating..." : <><span className="hidden sm:inline">Build My Roadmap</span><span className="sm:hidden">Build</span></>}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
