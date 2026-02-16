"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Calculator,
  Clock,
  Check,
  ExternalLink,
} from "lucide-react";
import { STATES } from "@/lib/constants/states";
import { SPECIES } from "@/lib/constants/species";
import { STATE_VISUALS } from "@/lib/constants/state-images";
import { HuntingTerm } from "@/components/shared/HuntingTerm";

export default function CalculatorPage() {
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedSpecies, setSelectedSpecies] = useState<string>("elk");
  const [currentPoints, setCurrentPoints] = useState(0);
  const [targetPoints, setTargetPoints] = useState(4);

  const state = STATES.find((s) => s.id === selectedState);
  const pointCost = state?.pointCost[selectedSpecies] ?? 0;
  const pointsNeeded = Math.max(0, targetPoints - currentPoints);
  const totalPointCost = pointsNeeded * pointCost;
  const licenseFee = state?.licenseFees.qualifyingLicense ?? 0;
  const appFee = state?.licenseFees.appFee ?? 0;
  const annualCost = pointCost + appFee + (licenseFee > 0 ? licenseFee : 0);
  // Estimated NR tag costs by species (approximations across western states)
  const TAG_COST_ESTIMATES: Record<string, number> = {
    elk: 600, mule_deer: 400, whitetail: 350, bear: 350, moose: 800,
    pronghorn: 300, bighorn_sheep: 2000, mountain_goat: 1500, bison: 1500, mountain_lion: 400,
  };
  const estimatedTagCost = TAG_COST_ESTIMATES[selectedSpecies] ?? 400;
  const totalCost =
    totalPointCost + pointsNeeded * appFee + licenseFee + estimatedTagCost;

  return (
    <div className="p-6 space-y-6 fade-in-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Calculator className="w-6 h-6 text-primary" />
          Investment Calculator
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Calculate your point investment and total hunt costs per state
        </p>
      </div>

      {/* Species Selector */}
      <div className="flex gap-2">
        {SPECIES.map((sp) => (
          <button
            key={sp.id}
            onClick={() => setSelectedSpecies(sp.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedSpecies === sp.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            {sp.name}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* State Grid */}
        <div className="md:col-span-2">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Select a State</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {STATES.map((s) => {
                  const cost = s.pointCost[selectedSpecies];
                  const isSelected = selectedState === s.id;
                  const visual = STATE_VISUALS[s.id];
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedState(s.id)}
                      className={`group relative p-4 rounded-xl border text-left overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${
                        isSelected
                          ? "border-primary ring-1 ring-primary"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      {/* Terrain gradient background */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${visual?.gradient ?? "from-slate-800 to-slate-900"} ${isSelected ? "opacity-60" : "opacity-30"} group-hover:opacity-50 transition-opacity duration-300`} />
                      <div className="relative z-10">
                        {isSelected && (
                          <div className="absolute top-0 right-0">
                            <Check className="w-4 h-4 text-primary" />
                          </div>
                        )}
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold text-white"
                            style={{ backgroundColor: s.color }}
                          >
                            {s.abbreviation}
                          </div>
                          {visual && <span className="text-sm">{visual.emoji}</span>}
                        </div>
                        <p className="text-lg font-bold">
                          ${cost ?? 0}
                          <span className="text-xs text-muted-foreground font-normal">
                            /pt
                          </span>
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                          {s.pointSystem === "random"
                            ? "No points"
                            : s.pointSystemDetails.description.split(".")[0]}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Point Inputs */}
          {selectedState && (
            <Card className="bg-card border-border mt-4">
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Current Points
                    </label>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        aria-label="Decrease current points"
                        onClick={() =>
                          setCurrentPoints(Math.max(0, currentPoints - 1))
                        }
                        className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-lg font-bold hover:bg-accent transition-colors"
                      >
                        -
                      </button>
                      <span className="w-12 text-center text-2xl font-bold">
                        {currentPoints}
                      </span>
                      <button
                        aria-label="Increase current points"
                        onClick={() => setCurrentPoints(currentPoints + 1)}
                        className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-lg font-bold hover:bg-accent transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Target Points
                    </label>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        aria-label="Decrease target points"
                        onClick={() =>
                          setTargetPoints(Math.max(0, targetPoints - 1))
                        }
                        className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-lg font-bold hover:bg-accent transition-colors"
                      >
                        -
                      </button>
                      <span className="w-12 text-center text-2xl font-bold">
                        {targetPoints}
                      </span>
                      <button
                        aria-label="Increase target points"
                        onClick={() => setTargetPoints(targetPoints + 1)}
                        className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-lg font-bold hover:bg-accent transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Cost Estimate Panel */}
        <div className="space-y-4">
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1923] border-primary/20 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary to-chart-2" />
            <CardContent className="p-6 space-y-5">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  <HuntingTerm term="preference points">Cost to Build Points</HuntingTerm>
                </p>
                <p className="text-3xl font-bold text-primary">
                  ${totalPointCost.toLocaleString()}
                </p>
              </div>
              <Separator className="bg-border/50" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  <HuntingTerm term="tag">Total with Tag</HuntingTerm>
                </p>
                <p className="text-3xl font-bold">
                  ${totalCost.toLocaleString()}
                </p>
              </div>
              <Separator className="bg-border/50" />
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-chart-2" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    <HuntingTerm term="draw">Est. Years to Draw</HuntingTerm>
                  </p>
                  <p className="text-lg font-bold text-chart-2">
                    {pointsNeeded} years
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Breakdown */}
          {selectedState && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Cost Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {pointsNeeded} pts x ${pointCost}
                  </span>
                  <span className="font-medium">${totalPointCost}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">App fees</span>
                  <span className="font-medium">
                    ${pointsNeeded * appFee}
                  </span>
                </div>
                {licenseFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">License</span>
                    <span className="font-medium">
                      ${licenseFee.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Est. tag cost
                  </span>
                  <span className="font-medium">${estimatedTagCost}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-bold">
                  <span>Total</span>
                  <span className="text-primary">
                    ${totalCost.toLocaleString()}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    <HuntingTerm term="annual subscription">Annual subscription</HuntingTerm>
                  </span>
                  <span className="font-medium text-chart-2">
                    ${annualCost}/yr
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {state && (
            <a
              href={state.buyPointsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="w-full gap-2 mt-2">
                Buy {state.abbreviation} Points
                <ExternalLink className="w-4 h-4" />
              </Button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
