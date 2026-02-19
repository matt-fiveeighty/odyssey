"use client";

import { useState, useMemo, useCallback } from "react";
import { Compass } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { generateAllOpportunities } from "@/lib/engine/opportunity-scorer";
import { OpportunityFilterBar } from "@/components/opportunity-finder/OpportunityFilterBar";
import { OpportunityResultCard } from "@/components/opportunity-finder/OpportunityResultCard";

type WeaponType = "archery" | "rifle" | "muzzleloader" | "any";
type Timeline = "this_year" | "1_3" | "3_7" | "any";

const MAX_VISIBLE = 30;

export default function OpportunityFinderPage() {
  const { userPoints } = useAppStore();

  // Filter state — defaults to show everything
  const [selectedSpecies, setSelectedSpecies] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponType>("any");
  const [selectedTimeline, setSelectedTimeline] = useState<Timeline>("any");
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const results = useMemo(
    () =>
      generateAllOpportunities(userPoints, {
        species: selectedSpecies.length > 0 ? selectedSpecies : undefined,
        states: selectedStates.length > 0 ? selectedStates : undefined,
        weapon: selectedWeapon,
        timeline: selectedTimeline,
      }),
    [userPoints, selectedSpecies, selectedStates, selectedWeapon, selectedTimeline]
  );

  const visibleResults = showAll ? results : results.slice(0, MAX_VISIBLE);

  const toggleSpecies = useCallback((id: string) => {
    setSelectedSpecies((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }, []);

  const toggleState = useCallback((id: string) => {
    setSelectedStates((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }, []);

  const clearAll = useCallback(() => {
    setSelectedSpecies([]);
    setSelectedStates([]);
    setSelectedWeapon("any");
    setSelectedTimeline("any");
  }, []);

  return (
    <div className="p-6 space-y-6 fade-in-up max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Compass className="w-6 h-6 text-primary" />
          Opportunity Finder
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your most accessible hunting opportunities, ranked by your points and
          draw likelihood
        </p>
      </div>

      {/* Filters */}
      <OpportunityFilterBar
        selectedSpecies={selectedSpecies}
        selectedStates={selectedStates}
        selectedWeapon={selectedWeapon}
        selectedTimeline={selectedTimeline}
        onToggleSpecies={toggleSpecies}
        onToggleState={toggleState}
        onSetWeapon={setSelectedWeapon}
        onSetTimeline={setSelectedTimeline}
        onClearAll={clearAll}
      />

      {/* Results count */}
      <div>
        <h2 className="text-lg font-bold">
          {results.length} opportunit{results.length !== 1 ? "ies" : "y"} found
        </h2>
        {userPoints.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Personalized to your {userPoints.length} point balance
            {userPoints.length !== 1 ? "s" : ""}
          </p>
        )}
        {userPoints.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Add your points in Settings to see personalized rankings
          </p>
        )}
      </div>

      {/* Results */}
      <div className="space-y-3">
        {visibleResults.map((result, idx) => {
          const key = `${result.stateId}-${result.speciesId}`;
          return (
            <OpportunityResultCard
              key={key}
              result={result}
              rank={idx}
              isExpanded={expandedResult === key}
              onToggleExpand={() =>
                setExpandedResult(expandedResult === key ? null : key)
              }
            />
          );
        })}
      </div>

      {/* Show more */}
      {!showAll && results.length > MAX_VISIBLE && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full py-3 text-sm text-primary font-medium hover:underline"
        >
          Show all {results.length} opportunities
        </button>
      )}
    </div>
  );
}
