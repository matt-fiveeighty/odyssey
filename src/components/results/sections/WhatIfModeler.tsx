"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FlaskConical,
  X,
  Plus,
  ArrowDown,
  ArrowUp,
  RotateCcw,
} from "lucide-react";
import { STATES_MAP } from "@/lib/constants/states";
import type { StrategicAssessment } from "@/lib/types";

interface WhatIfModelerProps {
  assessment: StrategicAssessment;
}

interface DeltaMetrics {
  tenYearCost: number;
  annualAvg: number;
  plannedHunts: number;
  stateCount: number;
}

function computeMetrics(
  assessment: StrategicAssessment,
  excludedStates: Set<string>,
  budgetDelta: number,
  horizonYears: number,
): DeltaMetrics {
  const recs = assessment.stateRecommendations.filter(
    (r) => !excludedStates.has(r.stateId),
  );
  const includedStateIds = new Set(recs.map((r) => r.stateId));

  const roadmap = assessment.roadmap.slice(0, horizonYears);

  let tenYearCost = 0;
  let plannedHunts = 0;
  for (const yr of roadmap) {
    const filteredActions = yr.actions.filter((a) =>
      includedStateIds.has(a.stateId),
    );
    tenYearCost += filteredActions.reduce((s, a) => s + a.cost, 0);
    plannedHunts += filteredActions.filter((a) => a.type === "hunt").length;
  }

  // Apply budget delta as a proportional scaling factor
  if (budgetDelta !== 0 && tenYearCost > 0) {
    const baseAnnual = tenYearCost / roadmap.length;
    const scaleFactor = (baseAnnual + budgetDelta) / baseAnnual;
    tenYearCost = Math.round(tenYearCost * Math.max(0, scaleFactor));
  }

  return {
    tenYearCost,
    annualAvg: Math.round(tenYearCost / Math.max(roadmap.length, 1)),
    plannedHunts,
    stateCount: recs.length,
  };
}

function DeltaDisplay({
  label,
  base,
  current,
}: {
  label: string;
  base: number;
  current: number;
}) {
  const delta = current - base;
  const pct = base > 0 ? Math.round((delta / base) * 100) : 0;
  const isDown = delta < 0;
  const isUp = delta > 0;
  const isCost = label.includes("Cost") || label === "Annual Avg";

  return (
    <div className="text-center p-3 rounded-lg bg-secondary/30">
      <p className="text-lg font-bold">
        {isCost ? `$${Math.round(current).toLocaleString()}` : current}
      </p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
      {delta !== 0 && (
        <div
          className={`flex items-center justify-center gap-0.5 mt-1 text-[10px] font-medium ${
            isDown && isCost
              ? "text-chart-2"
              : isUp && isCost
                ? "text-destructive"
                : isDown
                  ? "text-destructive"
                  : "text-chart-2"
          }`}
        >
          {isDown ? (
            <ArrowDown className="w-2.5 h-2.5" />
          ) : (
            <ArrowUp className="w-2.5 h-2.5" />
          )}
          <span>{Math.abs(pct)}%</span>
        </div>
      )}
    </div>
  );
}

export function WhatIfModeler({ assessment }: WhatIfModelerProps) {
  const [excludedStates, setExcludedStates] = useState<Set<string>>(
    new Set(),
  );
  const [budgetDelta, setBudgetDelta] = useState(0);
  const defaultHorizon = assessment.roadmap.length || 10;
  const [horizonYears, setHorizonYears] = useState(defaultHorizon);

  const baseMetrics = useMemo(
    () => computeMetrics(assessment, new Set(), 0, defaultHorizon),
    [assessment, defaultHorizon],
  );
  const currentMetrics = useMemo(
    () =>
      computeMetrics(assessment, excludedStates, budgetDelta, horizonYears),
    [assessment, excludedStates, budgetDelta, horizonYears],
  );

  const hasChanges =
    excludedStates.size > 0 ||
    budgetDelta !== 0 ||
    horizonYears !== defaultHorizon;

  const recs = assessment.stateRecommendations;
  const alsoConsidered = assessment.alsoConsidered ?? [];

  function toggleExclude(stateId: string) {
    setExcludedStates((prev) => {
      const next = new Set(prev);
      if (next.has(stateId)) {
        next.delete(stateId);
      } else {
        next.add(stateId);
      }
      return next;
    });
  }

  function resetAll() {
    setExcludedStates(new Set());
    setBudgetDelta(0);
    setHorizonYears(defaultHorizon);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-semibold text-sm">What-If Modeler</h3>
            <p className="text-xs text-muted-foreground">
              Adjust states, budget, or horizon to see how your plan changes
            </p>
          </div>
        </div>
        {hasChanges && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetAll}
            className="text-xs gap-1 h-7"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </Button>
        )}
      </div>

      {/* State toggles */}
      <div className="flex flex-wrap gap-2">
        {recs.map((rec) => {
          const state = STATES_MAP[rec.stateId];
          const isExcluded = excludedStates.has(rec.stateId);
          return (
            <button
              key={rec.stateId}
              onClick={() => toggleExclude(rec.stateId)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isExcluded
                  ? "bg-destructive/10 text-destructive border border-destructive/20 line-through"
                  : "bg-secondary border border-border hover:border-primary/30"
              }`}
            >
              {state && (
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center text-[7px] font-bold text-white ${isExcluded ? "opacity-40" : ""}`}
                  style={{ backgroundColor: state.color }}
                >
                  {state.abbreviation}
                </div>
              )}
              <span>{state?.name ?? rec.stateId}</span>
              {isExcluded ? (
                <Plus className="w-3 h-3" />
              ) : (
                <X className="w-3 h-3 text-muted-foreground" />
              )}
              <span className="text-[10px] text-muted-foreground font-mono ml-1">
                ${rec.annualCost}/yr
              </span>
            </button>
          );
        })}
      </div>

      {/* Also-considered states */}
      {alsoConsidered.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground mb-1.5">
            Also considered (not in current plan):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {alsoConsidered.map((ac) => {
              const state = STATES_MAP[ac.stateId];
              return (
                <div
                  key={ac.stateId}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-secondary/50 text-muted-foreground"
                >
                  {state && (
                    <div
                      className="w-3 h-3 rounded flex items-center justify-center text-[6px] font-bold text-white"
                      style={{ backgroundColor: state.color }}
                    >
                      {state.abbreviation}
                    </div>
                  )}
                  {state?.name ?? ac.stateId}
                  <span className="font-mono">${ac.annualCost}/yr</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Budget + Horizon adjustments */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            Budget Adjustment
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={-500}
              max={500}
              step={50}
              value={budgetDelta}
              onChange={(e) => setBudgetDelta(Number(e.target.value))}
              className="flex-1 h-1.5 accent-primary"
            />
            <span
              className={`text-xs font-mono w-14 text-right ${budgetDelta > 0 ? "text-chart-2" : budgetDelta < 0 ? "text-destructive" : "text-muted-foreground"}`}
            >
              {budgetDelta >= 0 ? "+" : ""}${budgetDelta}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            Horizon (years)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={3}
              max={Math.max(defaultHorizon, 20)}
              step={1}
              value={horizonYears}
              onChange={(e) => setHorizonYears(Number(e.target.value))}
              className="flex-1 h-1.5 accent-primary"
            />
            <span className="text-xs font-mono w-8 text-right text-muted-foreground">
              {horizonYears}yr
            </span>
          </div>
        </div>
      </div>

      {/* Delta metrics */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="grid grid-cols-4 gap-3">
            <DeltaDisplay
              label="States"
              base={baseMetrics.stateCount}
              current={currentMetrics.stateCount}
            />
            <DeltaDisplay
              label={`${horizonYears}-Yr Cost`}
              base={baseMetrics.tenYearCost}
              current={currentMetrics.tenYearCost}
            />
            <DeltaDisplay
              label="Annual Avg"
              base={baseMetrics.annualAvg}
              current={currentMetrics.annualAvg}
            />
            <DeltaDisplay
              label="Hunts"
              base={baseMetrics.plannedHunts}
              current={currentMetrics.plannedHunts}
            />
          </div>

          {hasChanges && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                {excludedStates.size > 0 && (
                  <>
                    Dropping {excludedStates.size} state
                    {excludedStates.size > 1 ? "s" : ""}{" "}
                  </>
                )}
                {budgetDelta !== 0 && (
                  <>
                    {budgetDelta > 0 ? "adding" : "cutting"} $
                    {Math.abs(budgetDelta)}/yr{" "}
                  </>
                )}
                {horizonYears !== defaultHorizon && (
                  <>
                    {horizonYears < defaultHorizon
                      ? "shortening"
                      : "extending"}{" "}
                    to {horizonYears} years{" "}
                  </>
                )}
                {currentMetrics.tenYearCost !== baseMetrics.tenYearCost && (
                  <>
                    ={" "}
                    <span
                      className={
                        currentMetrics.tenYearCost < baseMetrics.tenYearCost
                          ? "text-chart-2 font-semibold"
                          : "text-destructive font-semibold"
                      }
                    >
                      $
                      {Math.round(Math.abs(
                        baseMetrics.tenYearCost - currentMetrics.tenYearCost,
                      )).toLocaleString()}{" "}
                      {currentMetrics.tenYearCost < baseMetrics.tenYearCost
                        ? "saved"
                        : "added"}
                    </span>
                  </>
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
