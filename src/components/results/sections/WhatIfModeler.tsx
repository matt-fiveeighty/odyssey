"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  FlaskConical,
  X,
  Plus,
  DollarSign,
  Target,
  TrendingUp,
  ArrowDown,
  ArrowUp,
  Minus,
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

function computeMetrics(assessment: StrategicAssessment, excludedStates: Set<string>): DeltaMetrics {
  const recs = assessment.stateRecommendations.filter((r) => !excludedStates.has(r.stateId));
  const includedStateIds = new Set(recs.map((r) => r.stateId));

  // Recompute costs from roadmap excluding dropped states
  let tenYearCost = 0;
  let plannedHunts = 0;
  for (const yr of assessment.roadmap) {
    const filteredActions = yr.actions.filter((a) => includedStateIds.has(a.stateId));
    tenYearCost += filteredActions.reduce((s, a) => s + a.cost, 0);
    plannedHunts += filteredActions.filter((a) => a.type === "hunt").length;
  }

  const horizon = assessment.roadmap.length || 10;
  return {
    tenYearCost,
    annualAvg: Math.round(tenYearCost / horizon),
    plannedHunts,
    stateCount: recs.length,
  };
}

function DeltaDisplay({ label, base, current }: { label: string; base: number; current: number }) {
  const delta = current - base;
  const pct = base > 0 ? Math.round((delta / base) * 100) : 0;
  const isDown = delta < 0;
  const isUp = delta > 0;

  return (
    <div className="text-center p-3 rounded-lg bg-secondary/30">
      <p className="text-lg font-bold">
        {label.includes("Cost") || label === "Annual Avg" ? `$${current.toLocaleString()}` : current}
      </p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
      {delta !== 0 && (
        <div className={`flex items-center justify-center gap-0.5 mt-1 text-[10px] font-medium ${
          isDown && (label.includes("Cost") || label.includes("Avg")) ? "text-chart-2" :
          isUp && (label.includes("Cost") || label.includes("Avg")) ? "text-destructive" :
          isDown ? "text-destructive" : "text-chart-2"
        }`}>
          {isDown ? <ArrowDown className="w-2.5 h-2.5" /> : <ArrowUp className="w-2.5 h-2.5" />}
          <span>{Math.abs(pct)}%</span>
        </div>
      )}
    </div>
  );
}

export function WhatIfModeler({ assessment }: WhatIfModelerProps) {
  const [excludedStates, setExcludedStates] = useState<Set<string>>(new Set());

  const baseMetrics = useMemo(() => computeMetrics(assessment, new Set()), [assessment]);
  const currentMetrics = useMemo(
    () => computeMetrics(assessment, excludedStates),
    [assessment, excludedStates]
  );

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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <FlaskConical className="w-5 h-5 text-primary" />
        <div>
          <h3 className="font-semibold text-sm">What-If Modeler</h3>
          <p className="text-xs text-muted-foreground">Toggle states on/off to see how your portfolio changes</p>
        </div>
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

      {/* Also-considered states to add */}
      {alsoConsidered.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground mb-1.5">Also considered (not in current plan):</p>
          <div className="flex flex-wrap gap-1.5">
            {alsoConsidered.map((ac) => {
              const state = STATES_MAP[ac.stateId];
              return (
                <div
                  key={ac.stateId}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-secondary/50 text-muted-foreground"
                >
                  {state && (
                    <div className="w-3 h-3 rounded flex items-center justify-center text-[6px] font-bold text-white" style={{ backgroundColor: state.color }}>
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

      {/* Delta metrics */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="grid grid-cols-4 gap-3">
            <DeltaDisplay label="States" base={baseMetrics.stateCount} current={currentMetrics.stateCount} />
            <DeltaDisplay label={`${assessment.roadmap.length || 10}-Yr Cost`} base={baseMetrics.tenYearCost} current={currentMetrics.tenYearCost} />
            <DeltaDisplay label="Annual Avg" base={baseMetrics.annualAvg} current={currentMetrics.annualAvg} />
            <DeltaDisplay label="Hunts" base={baseMetrics.plannedHunts} current={currentMetrics.plannedHunts} />
          </div>

          {excludedStates.size > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Dropping {excludedStates.size} state{excludedStates.size > 1 ? "s" : ""} saves{" "}
                  <span className="text-chart-2 font-semibold">
                    ${(baseMetrics.tenYearCost - currentMetrics.tenYearCost).toLocaleString()}
                  </span>{" "}
                  over {assessment.roadmap.length || 10} years
                </p>
                <button
                  onClick={() => setExcludedStates(new Set())}
                  className="text-[10px] text-primary hover:underline"
                >
                  Reset all
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
