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
  ChevronDown,
} from "lucide-react";
import { STATES } from "@/lib/constants/states";
import { SPECIES } from "@/lib/constants/species";
import { STATE_VISUALS } from "@/lib/constants/state-images";
import { SPECIES_IMAGES } from "@/lib/constants/species-images";
import { HuntingTerm } from "@/components/shared/HuntingTerm";
import { StateOutline } from "@/components/shared/StateOutline";
import { DataSourceBadge } from "@/components/shared/DataSourceBadge";
import { useAppStore, useWizardStore } from "@/lib/store";
import { resolveFees } from "@/lib/engine/fee-resolver";
import { NoPlanGate } from "@/components/shared/NoPlanGate";

/** Format as whole dollars — no cents per C1/F3 */
function fmt(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

export default function CalculatorPage() {
  const confirmedAssessment = useAppStore((s) => s.confirmedAssessment);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedSpecies, setSelectedSpecies] = useState<string>("elk");
  const [currentPoints, setCurrentPoints] = useState(0);
  const [targetPoints, setTargetPoints] = useState(4);
  const [showFeeSchedule, setShowFeeSchedule] = useState(false);
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

  // --- Cost calculations ---
  const pointCost = fees ? (fees.pointCost[selectedSpecies] ?? 0) : 0;
  const pointsNeeded = Math.max(0, targetPoints - currentPoints);
  const licenseFee = fees?.qualifyingLicense ?? 0;
  const appFee = fees?.appFee ?? 0;
  const tagCost = fees ? (fees.tagCosts[selectedSpecies] ?? 0) : 0;

  // Does this state require qualifying license each year to hold points?
  // States where license = your point entry: NV, AZ, UT, NM, ID, WA, AK, CO
  // CO is special: requires NR qualifying license annually even for point-only
  const licenseRequiredAnnually = licenseFee > 0;

  // Build year cost: point + app + license (if annual)
  const buildYearCost = pointCost + appFee + (licenseRequiredAnnually ? licenseFee : 0);

  // Hunt year cost: point + app + license + tag
  const huntYearCost = pointCost + appFee + licenseFee + tagCost;

  // Total cost across all years
  const totalCost = pointsNeeded > 0
    ? buildYearCost * (pointsNeeded - 1) + huntYearCost
    : huntYearCost; // 0 points needed = hunt this year

  return (
    <div className="p-4 md:p-6 space-y-3 fade-in-up">
      <div className="flex items-center gap-2">
        <Calculator className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold tracking-tight">Investment Calculator</h1>
      </div>

      {/* Species Selector — horizontal scroll strip */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin -mx-1 px-1">
        {SPECIES.map((sp) => {
          const img = SPECIES_IMAGES[sp.id];
          return (
            <button
              key={sp.id}
              onClick={() => setSelectedSpecies(sp.id)}
              className={`group shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                selectedSpecies === sp.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >
              {img && (
                <div className="relative w-4 h-4 rounded-full overflow-hidden shrink-0">
                  <Image src={img.src} alt={img.alt} width={16} height={16} className="object-cover w-full h-full" />
                </div>
              )}
              {sp.name}
            </button>
          );
        })}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* State Grid + Point Inputs */}
        <div className="md:col-span-2 order-2 md:order-1">
          <div className="rounded-xl border border-border bg-card p-3">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                {STATES.map((s) => {
                  const sFees = resolveFees(s, homeState);
                  const cost = sFees.pointCost[selectedSpecies] ?? 0;
                  const sTagCost = sFees.tagCosts[selectedSpecies] ?? 0;
                  const hasSpecies = s.availableSpecies.includes(selectedSpecies);
                  const isSelected = selectedState === s.id;
                  const visual = STATE_VISUALS[s.id];
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedState(s.id)}
                      className={`group relative p-3 rounded-xl border text-left overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${
                        isSelected
                          ? "border-primary ring-1 ring-primary"
                          : hasSpecies
                            ? "border-border hover:border-primary/30"
                            : "border-border/30 opacity-40"
                      }`}
                    >
                      {/* Terrain gradient background */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${visual?.gradient ?? "from-slate-800 to-slate-900"} ${isSelected ? "opacity-60" : "opacity-30"} group-hover:opacity-50 transition-opacity duration-300`} />
                      <div className="relative z-10">
                        {isSelected && (
                          <div className="absolute top-0 right-0">
                            <Check className="w-3.5 h-3.5 text-primary" />
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <StateOutline
                            stateId={s.id}
                            size={20}
                            strokeColor="white"
                            strokeWidth={3}
                            fillColor="rgba(255,255,255,0.15)"
                          />
                          <span className="text-[10px] font-bold text-primary">{s.abbreviation}</span>
                        </div>
                        {hasSpecies ? (
                          <>
                            <p className="text-base font-bold">
                              {fmt(sTagCost)}
                              <span className="text-[8px] text-muted-foreground font-normal ml-0.5">tag</span>
                            </p>
                            <p className="text-[9px] text-muted-foreground mt-0.5">
                              {cost > 0 ? `${fmt(cost)}/pt` : "No points"}
                            </p>
                          </>
                        ) : (
                          <p className="text-[9px] text-muted-foreground mt-0.5">
                            Not available
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
          </div>

          {/* Point Inputs — +/- buttons + direct text entry */}
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
                        className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-lg font-bold hover:bg-accent transition-colors cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={currentPoints}
                        onChange={(e) => setCurrentPoints(Math.max(0, Number(e.target.value) || 0))}
                        className="w-14 text-center text-2xl font-bold bg-transparent border-b border-border focus:border-primary focus:outline-none font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        aria-label="Increase current points"
                        onClick={() => setCurrentPoints(currentPoints + 1)}
                        className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-lg font-bold hover:bg-accent transition-colors cursor-pointer"
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
                        className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-lg font-bold hover:bg-accent transition-colors cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={targetPoints}
                        onChange={(e) => setTargetPoints(Math.max(0, Number(e.target.value) || 0))}
                        className="w-14 text-center text-2xl font-bold bg-transparent border-b border-border focus:border-primary focus:outline-none font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        aria-label="Increase target points"
                        onClick={() => setTargetPoints(targetPoints + 1)}
                        className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-lg font-bold hover:bg-accent transition-colors cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
                {/* Quick presets */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {[1, 3, 5, 8, 12, 15, 20].map((pts) => (
                    <button
                      key={pts}
                      onClick={() => setTargetPoints(pts)}
                      className={`text-[10px] px-2 py-1 rounded-full font-mono transition-colors cursor-pointer ${
                        targetPoints === pts
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {pts} pts
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Cost Estimate Panel — appears first on mobile */}
        <div className="space-y-4 order-1 md:order-2">
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1923] border-primary/20 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary to-chart-2" />
            <CardContent className="p-6 space-y-5">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Total Investment
                </p>
                <p className="text-3xl font-bold text-primary">
                  {selectedState ? fmt(totalCost) : "--"}
                </p>
                {selectedState && pointsNeeded > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {pointsNeeded} year{pointsNeeded !== 1 ? "s" : ""} building + hunt year
                  </p>
                )}
              </div>
              <Separator className="bg-border/50" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
                    <HuntingTerm term="tag">Tag Cost</HuntingTerm>
                  </p>
                  <p className="text-lg font-bold">
                    {selectedState ? fmt(tagCost) : "--"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
                    Annual Build
                  </p>
                  <p className="text-lg font-bold text-chart-2">
                    {selectedState ? `${fmt(buildYearCost)}/yr` : "--"}
                  </p>
                </div>
              </div>
              <Separator className="bg-border/50" />
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-chart-2" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    <HuntingTerm term="draw">Years to Draw</HuntingTerm>
                  </p>
                  <p className="text-lg font-bold text-chart-2">
                    {pointsNeeded} year{pointsNeeded !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Itemized Fee Schedule — collapsible */}
          {state && fees && fees.feeSchedule.length > 0 && (
            <Card className="bg-card border-border">
              <button
                className="w-full text-left p-4 flex items-center justify-between hover:bg-secondary/10 transition-colors"
                onClick={() => setShowFeeSchedule(!showFeeSchedule)}
              >
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-semibold">
                  {state.abbreviation} Fee Schedule
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${fees.isResident ? "bg-success/15 text-success" : "bg-info/15 text-info"}`}>
                    <Home className="w-2.5 h-2.5 inline mr-0.5" />
                    {fees.label}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showFeeSchedule ? "rotate-180" : ""}`} />
              </button>
              {showFeeSchedule && (
                <CardContent className="pt-0 pb-4 space-y-2">
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
                          <span className="text-sm font-bold">{fmt(fee.amount)}</span>
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
                  {/* Show tag cost in fee schedule */}
                  {tagCost > 0 && (
                    <div className="p-2 rounded-lg bg-primary/5 border border-primary/10">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-primary">
                          {SPECIES.find((sp) => sp.id === selectedSpecies)?.name ?? selectedSpecies} Tag
                        </span>
                        <div className="text-right">
                          <span className="text-sm font-bold text-primary">{fmt(tagCost)}</span>
                          <span className="text-[9px] text-muted-foreground ml-1">if drawn</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      <HuntingTerm term="annual subscription">Annual build cost</HuntingTerm>
                    </span>
                    <span className="font-bold text-chart-2">{fmt(buildYearCost)}/yr</span>
                  </div>
                  <DataSourceBadge stateId={state.id} dataType="Fee Schedule" className="mt-2" />
                </CardContent>
              )}
              {/* Always show summary line below toggle */}
              {!showFeeSchedule && (
                <CardContent className="pt-0 pb-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Annual build cost</span>
                    <span className="font-bold text-chart-2">{fmt(buildYearCost)}/yr</span>
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Cost Breakdown (accumulation) */}
          {selectedState && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Cost Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {licenseRequiredAnnually && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {fees?.isResident ? "Hunting License" : "Qualifying License"} ({pointsNeeded > 0 ? pointsNeeded : 1} yr{(pointsNeeded > 1 || pointsNeeded === 0) ? "s" : ""} x {fmt(licenseFee)})
                    </span>
                    <span className="font-medium">{fmt(licenseFee * (pointsNeeded > 0 ? pointsNeeded : 1))}</span>
                  </div>
                )}
                {pointCost > 0 && pointsNeeded > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Point fees ({pointsNeeded} yr{pointsNeeded !== 1 ? "s" : ""} x {fmt(pointCost)})
                    </span>
                    <span className="font-medium">{fmt(pointsNeeded * pointCost)}</span>
                  </div>
                )}
                {appFee > 0 && pointsNeeded > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      App fees ({pointsNeeded} yr{pointsNeeded !== 1 ? "s" : ""} x {fmt(appFee)})
                    </span>
                    <span className="font-medium">{fmt(pointsNeeded * appFee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {SPECIES.find((sp) => sp.id === selectedSpecies)?.name ?? selectedSpecies} tag
                  </span>
                  <span className="font-medium">{fmt(tagCost)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-bold">
                  <span>Total Investment</span>
                  <span className="text-primary">{fmt(totalCost)}</span>
                </div>
                {state && <DataSourceBadge stateId={state.id} dataType="Tag & Point Costs" className="mt-2" />}
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
                  const yearCost = isHuntYear ? huntYearCost : buildYearCost;
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
                          {fmt(yearCost)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 mt-1">
                        {licenseRequiredAnnually && (
                          <span className="text-[10px] text-muted-foreground">
                            License: {fmt(licenseFee)}
                          </span>
                        )}
                        {pointCost > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            Point: {fmt(pointCost)}
                          </span>
                        )}
                        {appFee > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            App: {fmt(appFee)}
                          </span>
                        )}
                        {isHuntYear && (
                          <span className="text-[10px] text-primary font-medium">
                            Tag: {fmt(tagCost)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {/* Running total */}
                <Separator className="my-1" />
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-primary">{fmt(totalCost)}</span>
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
