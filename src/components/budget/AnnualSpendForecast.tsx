"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { calculateAnnualSpendForecast } from "@/lib/engine/savings-calculator";
import { STATES_MAP } from "@/lib/constants/states";
import { STATE_VISUALS } from "@/lib/constants/state-images";
import { SPECIES_MAP } from "@/lib/constants/species";
import { SpeciesAvatar } from "@/components/shared/SpeciesAvatar";
import { AnimatedCounter } from "@/components/shared/AnimatedCounter";

export function AnnualSpendForecast() {
  const userGoals = useAppStore((s) => s.userGoals);
  const milestones = useAppStore((s) => s.milestones);

  const activeYears = useMemo(() => {
    const forecast = calculateAnnualSpendForecast(userGoals, milestones, 5);
    return forecast.filter((y) => y.totalCost > 0);
  }, [userGoals, milestones]);

  if (activeYears.length === 0) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          Annual Spend Forecast
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeYears.map((yearData, idx) => (
          <div key={yearData.year}>
            {/* Year total bar */}
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-gradient-to-r from-primary/5 to-transparent">
              <span className="text-sm font-bold font-mono">{yearData.year}</span>
              <AnimatedCounter
                value={yearData.totalCost}
                prefix="$"
                className="text-sm font-bold font-mono text-primary"
              />
            </div>

            {/* Item grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              {yearData.items.map((item, i) => {
                const state = STATES_MAP[item.stateId];
                const vis = STATE_VISUALS[item.stateId];
                const species = SPECIES_MAP[item.speciesId];

                return (
                  <div
                    key={`${item.stateId}-${item.speciesId}-${i}`}
                    className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <SpeciesAvatar speciesId={item.speciesId} size={24} />
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold text-white shrink-0 bg-gradient-to-br ${
                          vis?.gradient ?? "from-slate-700 to-slate-900"
                        }`}
                      >
                        {state?.abbreviation ?? item.stateId}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {species?.name ?? item.speciesId}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-medium shrink-0 ml-2">
                      ${Math.round(item.cost).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Divider between years */}
            {idx < activeYears.length - 1 && (
              <div className="border-t border-border mt-4" />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
