"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Calculator,
  Clock,
  Check,
  ExternalLink,
  Home,
} from "lucide-react";
import { STATES } from "@/lib/constants/states";
import { SPECIES } from "@/lib/constants/species";
import { STATE_VISUALS } from "@/lib/constants/state-images";
import { SPECIES_IMAGES } from "@/lib/constants/species-images";
import { HuntingTerm } from "@/components/shared/HuntingTerm";
import { StateOutline } from "@/components/shared/StateOutline";
import { useAppStore, useWizardStore } from "@/lib/store";
import { resolveFees } from "@/lib/engine/fee-resolver";
import { NoPlanGate } from "@/components/shared/NoPlanGate";

export default function CalculatorPage() {
  const confirmedAssessment = useAppStore((s) => s.confirmedAssessment);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedSpecies, setSelectedSpecies] = useState<string>("elk");
  const [currentPoints, setCurrentPoints] = useState(0);
  const [targetPoints, setTargetPoints] = useState(4);
  const homeState = useWizardStore((s) => s.homeState);

  const state = STATES.find((s) => s.id === selectedState);

  // Resolve R vs NR fees based on hunter's home state
  const fees = useMemo(() => {
    if (!state) return null;
    return resolveFees(state, homeState);
  }, [state, homeState]);

  if (!confirmedAssessment) {
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
        <NoPlanGate
          icon={Calculator}
          title="No plan built yet"
          description="Complete a strategic assessment in the Plan Builder to power the Investment Calculator with personalized cost data."
        />
      </div>
    );
  }

  const pointCost = fees ? (fees.pointCost[selectedSpecies] ?? 0) : 0;
  const pointsNeeded = Math.max(0, targetPoints - currentPoints);
  const totalPointCost = pointsNeeded * pointCost;
  const licenseFee = fees?.qualifyingLicense ?? 0;
  const appFee = fees?.appFee ?? 0;
  const annualCost = pointCost + appFee + (licenseFee > 0 ? licenseFee : 0);
  const TAG_COST_ESTIMATES: Record<string, number> = {
    elk: 600, mule_deer: 400, whitetail: 350, coues_deer: 250, blacktail: 300, sitka_blacktail: 600,
    black_bear: 350, grizzly: 500, moose: 800, pronghorn: 300, bighorn_sheep: 2000,
    dall_sheep: 1500, mountain_goat: 1500, bison: 1500, caribou: 800, mountain_lion: 400,
    muskox: 2200, wolf: 250,
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
      <div className="flex flex-wrap gap-2">
        {SPECIES.map((sp) => {
          const img = SPECIES_IMAGES[sp.id];
          return (
            <button
              key={sp.id}
              onClick={() => setSelectedSpecies(sp.id)}
              className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                selectedSpecies === sp.id
                  ? "bg-primary text-primary-foreground glow-primary"
                  : "bg-secondary text-secondary-foreground hover:bg-accent hover:scale-105 hover:shadow-[0_0_12px_oklch(0.65_0.18_145/0.15)]"
              }`}
            >
              {img && (
                <div className="relative w-5 h-5 rounded-full overflow-hidden shrink-0 transition-transform duration-200 group-hover:scale-125">
                  <Image src={img.src} alt={img.alt} width={20} height={20} className="object-cover w-full h-full" />
                </div>
              )}
              {sp.name}
            </button>
          );
        })}
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
                  const sFees = resolveFees(s, homeState);
                  const cost = sFees.pointCost[selectedSpecies] ?? 0;
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
                          <StateOutline
                            stateId={s.id}
                            size={24}
                            strokeColor="white"
                            strokeWidth={3}
                            fillColor="rgba(255,255,255,0.15)"
                          />
                          <span className="text-xs font-bold text-primary">{s.abbreviation}</span>
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

          {/* Itemized Fee Schedule */}
          {state && fees && fees.feeSchedule.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  {state.abbreviation} Fee Schedule
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${fees.isResident ? "bg-success/15 text-success" : "bg-info/15 text-info"}`}>
                    <Home className="w-2.5 h-2.5 inline mr-0.5" />
                    {fees.label}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {fees.feeSchedule.map((fee, i) => (
                  <div key={i} className="p-2 rounded-lg bg-secondary/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${fee.required ? "text-foreground" : "text-muted-foreground"}`}>
                          {fee.name}
                        </span>
                        {fee.required && (
                          <span className="text-[8px] px-1 py-0.5 rounded bg-destructive/10 text-destructive font-medium uppercase">Required</span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold">${fee.amount}</span>
                        <span className="text-[9px] text-muted-foreground ml-1">
                          {fee.frequency === "annual" ? "/yr" : fee.frequency === "per_species" ? "/species" : "once"}
                        </span>
                      </div>
                    </div>
                    {fee.notes && (
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">{fee.notes}</p>
                    )}
                  </div>
                ))}
                <Separator className="my-2" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    <HuntingTerm term="annual subscription">Annual cost (1 species)</HuntingTerm>
                  </span>
                  <span className="font-bold text-chart-2">${annualCost}/yr</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cost Breakdown (accumulation) */}
          {selectedState && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Cost to Draw
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {licenseFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{fees?.isResident ? "Hunting License" : "Qualifying License"}</span>
                    <span className="font-medium">${licenseFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Point fees ({pointsNeeded} yrs × ${pointCost})
                  </span>
                  <span className="font-medium">${totalPointCost}</span>
                </div>
                {appFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      App fees ({pointsNeeded} yrs × ${appFee})
                    </span>
                    <span className="font-medium">${pointsNeeded * appFee}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Est. tag cost</span>
                  <span className="font-medium">${estimatedTagCost}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-bold">
                  <span>Total Investment</span>
                  <span className="text-primary">${totalCost.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Year-by-Year Investment */}
          {selectedState && pointsNeeded > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Year-by-Year Investment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Array.from({ length: pointsNeeded }, (_, i) => {
                  const year = new Date().getFullYear() + i;
                  const isHuntYear = i === pointsNeeded - 1;
                  const yearCost = pointCost + appFee + (isHuntYear ? licenseFee + estimatedTagCost : 0);
                  return (
                    <div
                      key={year}
                      className={`p-2.5 rounded-lg ${
                        isHuntYear
                          ? "bg-primary/5 border border-primary/20"
                          : "bg-secondary/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold font-mono text-muted-foreground">
                            {year}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                              isHuntYear
                                ? "bg-chart-2 text-white"
                                : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {isHuntYear ? "Hunt Year" : `Year ${i + 1}`}
                          </span>
                        </div>
                        <span className={`text-sm font-bold ${isHuntYear ? "text-primary" : ""}`}>
                          ${yearCost.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 mt-1">
                        <span className="text-[10px] text-muted-foreground">
                          Point: ${pointCost}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          App: ${appFee}
                        </span>
                        {isHuntYear && licenseFee > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            License: ${licenseFee}
                          </span>
                        )}
                        {isHuntYear && (
                          <span className="text-[10px] text-primary font-medium">
                            Tag: ${estimatedTagCost}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
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
