"use client";

import { useState, useMemo, useCallback } from "react";
import { Compass, Check, ArrowRight } from "lucide-react";
import { useAppStore, useWizardStore } from "@/lib/store";
import { generateAllOpportunities, DEFAULT_WEIGHTS } from "@/lib/engine/opportunity-scorer";
import type { OpportunityWeights } from "@/lib/engine/opportunity-scorer";
import { OpportunityFilterBar } from "@/components/opportunity-finder/OpportunityFilterBar";
import { OpportunityWeightSliders } from "@/components/opportunity-finder/OpportunityWeightSliders";
import { OpportunityResultCard } from "@/components/opportunity-finder/OpportunityResultCard";
import { STATES_MAP } from "@/lib/constants/states";
import { SPECIES_MAP } from "@/lib/constants/species";
import type { OpportunityResult, UserGoal } from "@/lib/types";
import Link from "next/link";

type Timeline = "this_year" | "1_3" | "3_7" | "any";

const MAX_VISIBLE = 30;

export default function OpportunityFinderPage() {
  const { userPoints, userGoals, addUserGoal } = useAppStore();

  // Filter state — defaults to show everything
  const [selectedSpecies, setSelectedSpecies] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedTimeline, setSelectedTimeline] = useState<Timeline>("any");
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [weights, setWeights] = useState<OpportunityWeights>({ ...DEFAULT_WEIGHTS });

  // Track which opportunities have been added as goals this session
  const [addedThisSession, setAddedThisSession] = useState<Set<string>>(new Set());
  // Confirmation banner state
  const [confirmation, setConfirmation] = useState<{
    species: string;
    state: string;
    targetYear: number;
  } | null>(null);

  const results = useMemo(
    () =>
      generateAllOpportunities(userPoints, {
        species: selectedSpecies.length > 0 ? selectedSpecies : undefined,
        states: selectedStates.length > 0 ? selectedStates : undefined,
        timeline: selectedTimeline,
        weights,
      }),
    [userPoints, selectedSpecies, selectedStates, selectedTimeline, weights]
  );

  const visibleResults = showAll ? results : results.slice(0, MAX_VISIBLE);

  // Build set of existing goal keys (stateId-speciesId)
  const existingGoalKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const g of userGoals) {
      keys.add(`${g.stateId}-${g.speciesId}`);
    }
    for (const k of addedThisSession) {
      keys.add(k);
    }
    return keys;
  }, [userGoals, addedThisSession]);

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
    setSelectedTimeline("any");
  }, []);

  const handleAddToGoals = useCallback((result: OpportunityResult) => {
    const state = STATES_MAP[result.stateId];
    const species = SPECIES_MAP[result.speciesId];
    if (!state || !species) return;

    const currentYear = new Date().getFullYear();
    const targetYear = currentYear + Math.max(0, result.yearsToUnlock);
    const homeState = useWizardStore.getState().homeState;

    const goalData: UserGoal = {
      id: crypto.randomUUID(),
      userId: "local",
      title: `${state.abbreviation} ${species.name}`,
      speciesId: result.speciesId,
      stateId: result.stateId,
      targetYear,
      projectedDrawYear: targetYear,
      status: targetYear <= currentYear ? "active" : "active",
      milestones: [],
      ...(homeState ? {} : {}),
    };

    addUserGoal(goalData);

    const key = `${result.stateId}-${result.speciesId}`;
    setAddedThisSession((prev) => new Set(prev).add(key));

    // Show confirmation
    setConfirmation({
      species: species.name,
      state: state.name,
      targetYear,
    });

    // Auto-dismiss after 5s
    setTimeout(() => setConfirmation(null), 5000);
  }, [addUserGoal]);

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

      {/* Confirmation banner */}
      {confirmation && (
        <div className="p-3 rounded-lg bg-success/10 border border-success/20 flex items-center justify-between fade-in-up">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center">
              <Check className="w-3.5 h-3.5 text-success" />
            </div>
            <p className="text-sm text-success font-medium">
              {confirmation.species} in {confirmation.state} added to Goals — target year {confirmation.targetYear}
            </p>
          </div>
          <Link
            href="/goals"
            className="flex items-center gap-1 text-xs text-success font-medium hover:underline shrink-0"
          >
            View Goals <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Filters */}
      <OpportunityFilterBar
        selectedSpecies={selectedSpecies}
        selectedStates={selectedStates}
        selectedTimeline={selectedTimeline}
        onToggleSpecies={toggleSpecies}
        onToggleState={toggleState}
        onSetTimeline={setSelectedTimeline}
        onClearAll={clearAll}
      />

      {/* Weight sliders */}
      <OpportunityWeightSliders weights={weights} onChange={setWeights} />

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
              onAddToGoals={handleAddToGoals}
              isAlreadyGoal={existingGoalKeys.has(key)}
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
