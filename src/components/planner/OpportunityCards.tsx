"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, MapPin, Star } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useWizardStore } from "@/lib/store";
import { findOpportunities } from "@/lib/engine/opportunity-finder";
import type { Opportunity } from "@/lib/engine/opportunity-finder";

interface OpportunityCardsProps {
  selectedYear: number;
  existingStateIds: string[];
}

const TYPE_ICONS: Record<Opportunity["type"], typeof Star> = {
  otc: MapPin,
  leftover: Star,
  gap_filler: Lightbulb,
  underrated: Star,
};

const TYPE_LABELS: Record<Opportunity["type"], string> = {
  otc: "OTC",
  leftover: "High Odds",
  gap_filler: "New State",
  underrated: "Underrated",
};

const CONFIDENCE_COLORS: Record<Opportunity["confidence"], string> = {
  high: "text-success bg-success/15",
  medium: "text-warning bg-warning/15",
  low: "text-muted-foreground bg-muted",
};

export function OpportunityCards({ selectedYear, existingStateIds }: OpportunityCardsProps) {
  const { userPoints } = useAppStore();
  const { species, huntStylePrimary, homeState } = useWizardStore();

  const opportunities = useMemo(() => {
    if (species.length === 0) return [];

    return findOpportunities({
      species,
      homeState: homeState || "",
      userPoints,
      existingStates: existingStateIds,
      huntStyle: huntStylePrimary || "diy_truck",
      year: selectedYear,
    });
  }, [species, homeState, userPoints, existingStateIds, huntStylePrimary, selectedYear]);

  if (opportunities.length === 0) return null;

  // Show top 4 opportunities max
  const topOpportunities = opportunities.slice(0, 4);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-warning" />
        Opportunity Finder
      </h3>
      <div className="grid md:grid-cols-2 gap-3">
        {topOpportunities.map((opp, idx) => {
          const Icon = TYPE_ICONS[opp.type];
          return (
            <Card key={idx} className="bg-card border-border hover:border-primary/20 transition-all">
              <CardHeader className="p-3 pb-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-primary" />
                    <CardTitle className="text-xs font-medium truncate">
                      {opp.title}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${CONFIDENCE_COLORS[opp.confidence]}`}>
                      {opp.confidence}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                      {TYPE_LABELS[opp.type]}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <p className="text-[10px] text-muted-foreground leading-relaxed mb-2">
                  {opp.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground/70 italic">
                    {opp.reason}
                  </span>
                  {opp.estimatedCost > 0 && (
                    <span className="text-[10px] font-bold text-chart-2 shrink-0 ml-2">
                      ~${opp.estimatedCost.toLocaleString()}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
