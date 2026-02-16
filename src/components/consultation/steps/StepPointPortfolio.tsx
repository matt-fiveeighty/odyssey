"use client";

import { useWizardStore } from "@/lib/store";
import { AdvisorInsight } from "../shared/AdvisorInsight";
import { Card, CardContent } from "@/components/ui/card";
import { STATES_MAP } from "@/lib/constants/states";
import { Wallet } from "lucide-react";
import { HuntingTerm } from "@/components/shared/HuntingTerm";

export function StepPointPortfolio() {
  const wizard = useWizardStore();

  const totalPoints = Object.entries(wizard.existingPoints).reduce((sum, [, speciesMap]) => {
    return sum + Object.values(speciesMap).reduce((s, p) => s + p, 0);
  }, 0);

  const statesWithPoints = Object.entries(wizard.existingPoints)
    .filter(([, speciesMap]) => Object.values(speciesMap).some((p) => p > 0))
    .map(([stateId]) => STATES_MAP[stateId]?.name)
    .filter(Boolean);

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6 space-y-8">
        <div>
          <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-1">Step 7 of 9</p>
          <h2 className="text-xl font-bold">Do you have any <HuntingTerm term="preference points">points</HuntingTerm> already?</h2>
          <p className="text-sm text-muted-foreground mt-1">Existing points are invested capital. We&apos;ll never recommend abandoning an investment.</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => wizard.setField("hasExistingPoints", false)}
            className={`flex-1 p-4 rounded-xl border-2 text-center transition-all ${!wizard.hasExistingPoints ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-primary/30"}`}
          >
            <p className="font-semibold">Starting Fresh</p>
            <p className="text-xs text-muted-foreground mt-1">No points anywhere</p>
          </button>
          <button
            onClick={() => wizard.setField("hasExistingPoints", true)}
            className={`flex-1 p-4 rounded-xl border-2 text-center transition-all ${wizard.hasExistingPoints ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-primary/30"}`}
          >
            <p className="font-semibold">I Have Points</p>
            <p className="text-xs text-muted-foreground mt-1">Applied in one or more states</p>
          </button>
        </div>

        {wizard.hasExistingPoints && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Enter your current point balances.</p>
            {["CO", "WY", "MT", "NV", "AZ", "UT", "OR", "KS", "WA", "NE", "SD", "ND"].map((stateId) => {
              const state = STATES_MAP[stateId];
              if (!state || state.pointSystem === "random") return null;
              return (
                <div key={stateId} className="flex items-center gap-4 py-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: state.color }}
                  >
                    {state.abbreviation}
                  </div>
                  <span className="font-medium text-sm w-24">{state.name}</span>
                  <div className="flex gap-4 flex-wrap">
                    {wizard.species.map((speciesId) => {
                      if (!state.availableSpecies.includes(speciesId)) return null;
                      if ((state.pointCost[speciesId] ?? 0) === 0) return null;
                      const pts = wizard.existingPoints[stateId]?.[speciesId] ?? 0;
                      return (
                        <div key={speciesId} className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground capitalize w-16">{speciesId.replace("_", " ")}</span>
                          <button aria-label={`Decrease ${speciesId.replace("_", " ")} points for ${state.name}`} onClick={() => wizard.setExistingPoints(stateId, speciesId, Math.max(0, pts - 1))} className="w-7 h-7 rounded bg-secondary flex items-center justify-center text-sm hover:bg-accent">-</button>
                          <span className="w-6 text-center font-bold text-sm">{pts}</span>
                          <button aria-label={`Increase ${speciesId.replace("_", " ")} points for ${state.name}`} onClick={() => wizard.setExistingPoints(stateId, speciesId, pts + 1)} className="w-7 h-7 rounded bg-secondary flex items-center justify-center text-sm hover:bg-accent">+</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPoints > 0 && (
          <AdvisorInsight
            text={`You have ${totalPoints} total point${totalPoints > 1 ? "s" : ""} across ${statesWithPoints.join(", ")}. That\u2019s real capital \u2014 we\u2019ll build your strategy around protecting and leveraging those investments.`}
            icon={Wallet}
          />
        )}
      </CardContent>
    </Card>
  );
}
