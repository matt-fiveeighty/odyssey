"use client";

import type { StrategicAssessment } from "@/lib/types";
import { CollapsibleSection } from "../shared/CollapsibleSection";
import { STATES_MAP } from "@/lib/constants/states";
import { SpeciesAvatar } from "@/components/shared/SpeciesAvatar";
import { SPECIES } from "@/lib/constants/species";
import { Plane, Calendar, Wallet, Heart, ExternalLink } from "lucide-react";

interface LogisticsTabProps {
  assessment: StrategicAssessment;
}

export function LogisticsTab({ assessment }: LogisticsTabProps) {
  const { travelLogistics, seasonCalendar, pointOnlyGuide, dreamHuntRecommendations } = assessment;

  return (
    <div className="space-y-4">
      {/* Travel Logistics */}
      {travelLogistics && (
        <CollapsibleSection title="Travel Logistics" icon={Plane} defaultOpen badge={`From ${travelLogistics.homeAirport}`}>
          <div className="space-y-3">
            {travelLogistics.stateRoutes.map((route) => {
              const state = STATES_MAP[route.stateId];
              return (
                <div key={route.stateId} className="p-3 rounded-lg bg-secondary/20 border border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">{state?.name ?? route.stateId} ({route.airport})</span>
                    <span className="text-xs font-mono text-primary">${route.flightCost} {route.direct ? "direct" : "connecting"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                    <span>Flight time: {route.flightTime}</span>
                    <span>Drive to hunt area: {route.driveToHuntArea}</span>
                    <span>{route.rentalCarNeeded ? "Rental car needed" : "No rental needed"}</span>
                    <span>Meat shipping: {route.meatShipping}</span>
                  </div>
                  {route.rentalNotes && <p className="text-[10px] text-muted-foreground/70 mt-1">{route.rentalNotes}</p>}
                </div>
              );
            })}
            <div className="flex justify-between pt-2 border-t border-border/30">
              <span className="text-xs font-semibold">Total Travel Budget</span>
              <span className="text-xs font-bold text-primary">${travelLogistics.totalTravelBudget.toLocaleString()}</span>
            </div>
            {travelLogistics.tip && (
              <p className="text-[10px] text-muted-foreground/70 italic">{travelLogistics.tip}</p>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Season Calendar */}
      {seasonCalendar && seasonCalendar.length > 0 && (
        <CollapsibleSection title="Season Calendar" icon={Calendar} badge={`${seasonCalendar.length} entries`}>
          <div className="space-y-3">
            {seasonCalendar.map((entry, i) => {
              const state = STATES_MAP[entry.stateId];
              return (
                <div key={i} className="p-3 rounded-lg bg-secondary/20 border border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    {(() => {
                      const match = SPECIES.find((s) => s.name.toLowerCase() === entry.species.toLowerCase());
                      return match ? <SpeciesAvatar speciesId={match.id} size={22} /> : null;
                    })()}
                    <p className="text-sm font-semibold">{state?.name} &mdash; {entry.species}</p>
                  </div>
                  <div className="space-y-1.5">
                    {entry.tiers.map((tier, ti) => (
                      <div key={ti} className="flex items-start gap-2 text-[10px]">
                        <span className="font-medium w-20 shrink-0">{tier.name}</span>
                        <span className="text-muted-foreground w-24 shrink-0">{tier.dates}</span>
                        <span className="text-muted-foreground/70">{tier.recommendation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* Point-Only Guide */}
      {pointOnlyGuide && pointOnlyGuide.length > 0 && (
        <CollapsibleSection title="Point-Only Application Guide" icon={Wallet} defaultOpen>
          <div className="space-y-2">
            {pointOnlyGuide.map((entry) => (
              <div key={entry.stateId} className="p-3 rounded-lg bg-secondary/20 border border-border/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold">{entry.stateName}</span>
                  <span className="text-[10px] text-muted-foreground">Deadline: {entry.deadline}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-1">{entry.instructions}</p>
                {entry.secondChoiceTactic && (
                  <p className="text-[10px] text-primary/80 italic mb-1">{entry.secondChoiceTactic}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Annual cost: ${entry.annualCost}</span>
                  {entry.url && (
                    <a href={entry.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary flex items-center gap-0.5 hover:underline">
                      Apply <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Dream Hunts */}
      {dreamHuntRecommendations.length > 0 && (
        <CollapsibleSection title="Dream Hunt Investments" icon={Heart} badge={`${dreamHuntRecommendations.length} dreams`}>
          <div className="space-y-2">
            {dreamHuntRecommendations.map((dream) => (
              <div key={dream.id} className="p-3 rounded-lg bg-secondary/20 border border-border/50">
                <p className="text-sm font-semibold">{dream.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{dream.description}</p>
                <div className="flex gap-4 mt-2 text-[10px] text-muted-foreground">
                  <span>Timeline: ~{dream.estimatedTimelineYears} years</span>
                  {dream.annualPointCost && <span>Annual cost: ${dream.annualPointCost}</span>}
                </div>
                {dream.notes && <p className="text-[10px] text-muted-foreground/70 mt-1 italic">{dream.notes}</p>}
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}
