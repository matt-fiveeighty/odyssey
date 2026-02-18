"use client";

import { useState, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { SPECIES } from "@/lib/constants/species";
import { SAMPLE_UNITS } from "@/lib/constants/sample-units";
import { STATES_MAP } from "@/lib/constants/states";
import { SPECIES_MAP } from "@/lib/constants/species";
import { useAppStore } from "@/lib/store";
import { estimateCreepRate, yearsToDrawWithCreep } from "@/lib/engine/point-creep";
import { OddsFinderWizard } from "@/components/odds-finder/OddsFinderWizard";
import { OddsResultCard } from "@/components/odds-finder/OddsResultCard";
import type { OddsResult } from "@/components/odds-finder/OddsResultCard";

type Step = "species" | "weapon" | "timeline" | "results";
type WeaponType = "archery" | "rifle" | "muzzleloader" | "any";
type Timeline = "this_year" | "1_3" | "3_7" | "any";

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

      // Weapon type scoring boost
      if (selectedWeapon !== "any" && unit.tacticalNotes?.bestSeasonTier) {
        const seasonInfo = unit.tacticalNotes.bestSeasonTier.toLowerCase();
        if (selectedWeapon === "archery" && seasonInfo.includes("archery")) {
          score += 10;
        } else if (selectedWeapon === "rifle" && seasonInfo.includes("rifle")) {
          score += 10;
        } else if (
          selectedWeapon === "muzzleloader" &&
          (seasonInfo.includes("muzzleloader") || seasonInfo.includes("muzzle"))
        ) {
          score += 10;
        }
      }

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

      // Weapon-specific bullet
      if (selectedWeapon !== "any" && unit.tacticalNotes?.bestSeasonTier) {
        const seasonInfo = unit.tacticalNotes.bestSeasonTier.toLowerCase();
        if (
          (selectedWeapon === "archery" && seasonInfo.includes("archery")) ||
          (selectedWeapon === "rifle" && seasonInfo.includes("rifle")) ||
          (selectedWeapon === "muzzleloader" &&
            (seasonInfo.includes("muzzleloader") || seasonInfo.includes("muzzle")))
        ) {
          whyBullets.push(
            `Has ${selectedWeapon} season — ${unit.tacticalNotes.bestSeasonTier}`
          );
        }
      }

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
  }, [selectedSpecies, selectedTimeline, selectedWeapon, userPoints]);

  function handleBack() {
    if (step === "weapon") setStep("species");
    else if (step === "timeline") setStep("weapon");
    else if (step === "results") setStep("timeline");
  }

  const speciesOptions = useMemo(
    () => SPECIES.filter((s) => SAMPLE_UNITS.some((u) => u.speciesId === s.id)),
    []
  );

  const unitCountBySpecies = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const sp of speciesOptions) {
      counts[sp.id] = SAMPLE_UNITS.filter((u) => u.speciesId === sp.id).length;
    }
    return counts;
  }, [speciesOptions]);

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

      {/* Wizard steps (species, weapon, timeline) */}
      <OddsFinderWizard
        step={step}
        selectedSpecies={selectedSpecies}
        selectedWeapon={selectedWeapon}
        selectedTimeline={selectedTimeline}
        speciesOptions={speciesOptions}
        unitCountBySpecies={unitCountBySpecies}
        onSelectSpecies={(id) => {
          setSelectedSpecies(id);
          setStep("weapon");
        }}
        onSelectWeapon={(weapon) => {
          setSelectedWeapon(weapon);
          setStep("timeline");
        }}
        onSelectTimeline={(timeline) => {
          setSelectedTimeline(timeline);
          computeResults();
        }}
        onBack={handleBack}
      />

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
            results.map((result, idx) => (
              <OddsResultCard
                key={`${result.stateId}-${result.unitCode}`}
                result={result}
                rank={idx}
                isExpanded={expandedUnit === `${result.stateId}-${result.unitCode}`}
                onToggleExpand={() =>
                  setExpandedUnit(
                    expandedUnit === `${result.stateId}-${result.unitCode}`
                      ? null
                      : `${result.stateId}-${result.unitCode}`
                  )
                }
              />
            ))
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="text-muted-foreground"
          >
            &larr; Back to timeline
          </Button>
        </div>
      )}
    </div>
  );
}
