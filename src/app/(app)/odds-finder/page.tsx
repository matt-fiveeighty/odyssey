"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Search,
  Target,
  ArrowRight,
  Trophy,
  Mountain,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Timer,
  Crosshair,
} from "lucide-react";
import { SPECIES } from "@/lib/constants/species";
import { SAMPLE_UNITS } from "@/lib/constants/sample-units";
import { STATES_MAP } from "@/lib/constants/states";
import { SPECIES_MAP } from "@/lib/constants/species";
import { useAppStore } from "@/lib/store";
import { estimateCreepRate, yearsToDrawWithCreep } from "@/lib/engine/point-creep";

type Step = "species" | "weapon" | "timeline" | "results";
type WeaponType = "archery" | "rifle" | "muzzleloader" | "any";
type Timeline = "this_year" | "1_3" | "3_7" | "any";

interface OddsResult {
  unitCode: string;
  unitName: string;
  stateId: string;
  speciesId: string;
  successRate: number;
  trophyRating: number;
  pointsRequired: number;
  yearsToUnlock: number;
  publicLandPct: number;
  pressureLevel: string;
  compositeScore: number;
  whyBullets: string[];
}

export default function OddsFinderPage() {
  const { userPoints } = useAppStore();

  // Wizard state
  const [step, setStep] = useState<Step>("species");
  const [selectedSpecies, setSelectedSpecies] = useState<string>("");
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponType>("any");
  const [selectedTimeline, setSelectedTimeline] = useState<Timeline>("any");
  const [results, setResults] = useState<OddsResult[]>([]);
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);

  const computeResults = useCallback(() => {
    if (!selectedSpecies) return;

    const speciesUnits = SAMPLE_UNITS.filter(
      (u) => u.speciesId === selectedSpecies
    );

    // Build point lookup
    const pointLookup = new Map<string, number>();
    for (const pt of userPoints) {
      if (pt.speciesId === selectedSpecies) {
        pointLookup.set(pt.stateId, pt.points);
      }
    }

    const scored: OddsResult[] = speciesUnits.map((unit) => {
      const state = STATES_MAP[unit.stateId];
      const userPts = pointLookup.get(unit.stateId) ?? 0;
      const creepRate = estimateCreepRate(unit.trophyRating);
      const isRandom = state?.pointSystem === "random";
      const yearsToUnlock = isRandom
        ? 0
        : yearsToDrawWithCreep(
            userPts,
            unit.pointsRequiredNonresident,
            creepRate
          );

      // Composite score (higher = better odds-adjusted value)
      let score = 0;
      score += unit.successRate * 30; // Success rate weight
      score += (unit.trophyRating / 10) * 20; // Trophy quality
      score += unit.publicLandPct * 15; // Public access
      score +=
        (unit.pressureLevel === "Low"
          ? 15
          : unit.pressureLevel === "Moderate"
            ? 8
            : 3); // Pressure
      // Accessibility bonus (fewer points = more accessible)
      score += Math.max(0, 20 - yearsToUnlock * 2);

      // Build "why" bullets
      const whyBullets: string[] = [];
      if (unit.successRate >= 0.3)
        whyBullets.push(
          `${Math.round(unit.successRate * 100)}% success rate — well above average`
        );
      else if (unit.successRate >= 0.15)
        whyBullets.push(
          `${Math.round(unit.successRate * 100)}% success rate — solid for this species`
        );
      if (unit.trophyRating >= 7)
        whyBullets.push(`Trophy rating ${unit.trophyRating}/10 — premium quality`);
      if (unit.publicLandPct >= 0.5)
        whyBullets.push(
          `${Math.round(unit.publicLandPct * 100)}% public land — excellent access`
        );
      if (unit.pressureLevel === "Low")
        whyBullets.push("Low hunting pressure — quality experience");
      if (yearsToUnlock === 0)
        whyBullets.push("Drawable now with your current points");
      else if (yearsToUnlock <= 3)
        whyBullets.push(
          `~${yearsToUnlock} years to draw — short wait`
        );

      return {
        unitCode: unit.unitCode,
        unitName: unit.unitName ?? unit.unitCode,
        stateId: unit.stateId,
        speciesId: unit.speciesId,
        successRate: unit.successRate,
        trophyRating: unit.trophyRating,
        pointsRequired: unit.pointsRequiredNonresident,
        yearsToUnlock,
        publicLandPct: unit.publicLandPct,
        pressureLevel: unit.pressureLevel,
        compositeScore: score,
        whyBullets,
      };
    });

    // Filter by timeline
    let filtered = scored;
    if (selectedTimeline === "this_year") {
      filtered = scored.filter((r) => r.yearsToUnlock === 0);
    } else if (selectedTimeline === "1_3") {
      filtered = scored.filter((r) => r.yearsToUnlock <= 3);
    } else if (selectedTimeline === "3_7") {
      filtered = scored.filter((r) => r.yearsToUnlock <= 7);
    }

    // Sort by composite score descending
    filtered.sort((a, b) => b.compositeScore - a.compositeScore);

    setResults(filtered);
    setStep("results");
  }, [selectedSpecies, selectedTimeline, userPoints]);

  function handleBack() {
    if (step === "weapon") setStep("species");
    else if (step === "timeline") setStep("weapon");
    else if (step === "results") setStep("timeline");
  }

  const speciesOptions = SPECIES.filter((s) =>
    SAMPLE_UNITS.some((u) => u.speciesId === s.id)
  );

  return (
    <div className="p-6 space-y-6 fade-in-up max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Search className="w-6 h-6 text-primary" />
          Highest Odds Finder
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Find your best draw opportunities based on your points, preferences,
          and timeline
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {(["species", "weapon", "timeline", "results"] as const).map(
          (s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : i < ["species", "weapon", "timeline", "results"].indexOf(step)
                      ? "bg-primary/20 text-primary"
                      : "bg-secondary text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              {i < 3 && (
                <div
                  className={`w-8 h-px ${
                    i < ["species", "weapon", "timeline", "results"].indexOf(step)
                      ? "bg-primary/40"
                      : "bg-border"
                  }`}
                />
              )}
            </div>
          )
        )}
      </div>

      {/* Step 1: Species */}
      {step === "species" && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              What species are you after?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {speciesOptions.map((sp) => (
                <button
                  key={sp.id}
                  onClick={() => {
                    setSelectedSpecies(sp.id);
                    setStep("weapon");
                  }}
                  className={`p-4 rounded-xl border text-left transition-all hover:border-primary/50 hover:bg-primary/5 ${
                    selectedSpecies === sp.id
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border bg-card"
                  }`}
                >
                  <span className="text-2xl block mb-1">{sp.icon}</span>
                  <span className="text-sm font-medium">{sp.name}</span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">
                    {SAMPLE_UNITS.filter((u) => u.speciesId === sp.id).length}{" "}
                    units available
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Weapon */}
      {step === "weapon" && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Crosshair className="w-5 h-5 text-primary" />
              Preferred weapon type?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { id: "any", label: "Any / No Preference", icon: "🎯" },
                  { id: "rifle", label: "Rifle", icon: "🔫" },
                  { id: "archery", label: "Archery", icon: "🏹" },
                  { id: "muzzleloader", label: "Muzzleloader", icon: "💨" },
                ] as const
              ).map((w) => (
                <button
                  key={w.id}
                  onClick={() => {
                    setSelectedWeapon(w.id);
                    setStep("timeline");
                  }}
                  className={`p-4 rounded-xl border text-left transition-all hover:border-primary/50 hover:bg-primary/5 ${
                    selectedWeapon === w.id
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border bg-card"
                  }`}
                >
                  <span className="text-2xl block mb-1">{w.icon}</span>
                  <span className="text-sm font-medium">{w.label}</span>
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="text-muted-foreground"
            >
              ← Back
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Timeline */}
      {step === "timeline" && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Timer className="w-5 h-5 text-primary" />
              When do you want to hunt?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  {
                    id: "this_year" as const,
                    label: "This Year",
                    desc: "Drawable now",
                  },
                  {
                    id: "1_3" as const,
                    label: "1-3 Years",
                    desc: "Short wait",
                  },
                  {
                    id: "3_7" as const,
                    label: "3-7 Years",
                    desc: "Medium investment",
                  },
                  {
                    id: "any" as const,
                    label: "Any Timeline",
                    desc: "Show all options",
                  },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedTimeline(t.id);
                    computeResults();
                  }}
                  className={`p-4 rounded-xl border text-left transition-all hover:border-primary/50 hover:bg-primary/5 ${
                    selectedTimeline === t.id
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border bg-card"
                  }`}
                >
                  <span className="text-sm font-medium">{t.label}</span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">
                    {t.desc}
                  </span>
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="text-muted-foreground"
            >
              ← Back
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Results */}
      {step === "results" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">
                {results.length} unit{results.length !== 1 ? "s" : ""} found
              </h2>
              <p className="text-xs text-muted-foreground">
                {SPECIES_MAP[selectedSpecies]?.name ?? selectedSpecies}
                {selectedWeapon !== "any" ? ` • ${selectedWeapon}` : ""}
                {selectedTimeline !== "any"
                  ? ` • ${selectedTimeline.replace("_", "-")} year${selectedTimeline === "this_year" ? "" : "s"}`
                  : ""}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setStep("species")}>
              New Search
            </Button>
          </div>

          {results.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="p-12 text-center">
                <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No matching units found
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Try expanding your timeline or selecting a different species.
                </p>
                <Button onClick={() => setStep("species")}>Try Again</Button>
              </CardContent>
            </Card>
          ) : (
            results.map((result, idx) => {
              const state = STATES_MAP[result.stateId];
              const isExpanded = expandedUnit === `${result.stateId}-${result.unitCode}`;

              return (
                <Card
                  key={`${result.stateId}-${result.unitCode}`}
                  className={`bg-card border-border transition-all ${idx === 0 ? "ring-1 ring-primary/30" : ""}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Rank badge */}
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                          idx === 0
                            ? "bg-primary text-primary-foreground"
                            : idx <= 2
                              ? "bg-primary/15 text-primary"
                              : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        #{idx + 1}
                      </div>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm">
                            Unit {result.unitCode}
                          </h3>
                          <span className="text-xs text-muted-foreground">
                            {result.unitName}
                          </span>
                          {state && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded text-white font-bold ml-auto shrink-0"
                              style={{ backgroundColor: state.color }}
                            >
                              {state.abbreviation}
                            </span>
                          )}
                        </div>

                        {/* Stats row */}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-green-400" />
                            <span className="text-xs">
                              {Math.round(result.successRate * 100)}% success
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Trophy className="w-3 h-3 text-amber-400" />
                            <span className="text-xs">
                              {result.trophyRating}/10 trophy
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Mountain className="w-3 h-3 text-blue-400" />
                            <span className="text-xs">
                              {Math.round(result.publicLandPct * 100)}% public
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Timer className="w-3 h-3 text-purple-400" />
                            <span className="text-xs">
                              {result.yearsToUnlock === 0
                                ? "Draw now"
                                : `~${result.yearsToUnlock}yr wait`}
                            </span>
                          </div>
                        </div>

                        {/* Why bullets */}
                        {result.whyBullets.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {(isExpanded
                              ? result.whyBullets
                              : result.whyBullets.slice(0, 2)
                            ).map((bullet, i) => (
                              <div
                                key={i}
                                className="flex items-start gap-1.5 text-[11px] text-muted-foreground"
                              >
                                <ArrowRight className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                                <span>{bullet}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {result.whyBullets.length > 2 && (
                          <button
                            onClick={() =>
                              setExpandedUnit(
                                isExpanded
                                  ? null
                                  : `${result.stateId}-${result.unitCode}`
                              )
                            }
                            className="flex items-center gap-1 text-[10px] text-primary mt-1.5 hover:underline"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-3 h-3" /> Show less
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3 h-3" /> +
                                {result.whyBullets.length - 2} more reasons
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="text-muted-foreground"
          >
            ← Back to timeline
          </Button>
        </div>
      )}
    </div>
  );
}
