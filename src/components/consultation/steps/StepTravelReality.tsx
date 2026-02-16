"use client";

import { useWizardStore } from "@/lib/store";
import type { HuntFrequency, TimeAvailable, TravelWillingness } from "@/lib/store";
import { OptionCard } from "../shared/OptionCard";
import { AdvisorInsight } from "../shared/AdvisorInsight";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, Plane, Car, Globe } from "lucide-react";
import { getPrimaryAirport, findBestRoutes } from "@/lib/constants/flight-hubs";

const FREQUENCY_OPTIONS: { id: HuntFrequency; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "every_year", label: "Every Year", desc: "I want to hunt western big game annually", icon: Calendar },
  { id: "every_other", label: "Every Other Year", desc: "Alternating years keeps it special", icon: Calendar },
  { id: "every_3", label: "Every 3 Years", desc: "Quality over quantity \u2014 make each trip count", icon: Calendar },
  { id: "when_opportunity", label: "When I Draw", desc: "Only travel when a tag comes through", icon: Calendar },
];

const TIME_OPTIONS: { id: TimeAvailable; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "weekend_warrior", label: "5\u20136 Days", desc: "Long weekend warrior", icon: Clock },
  { id: "full_week", label: "7\u201310 Days", desc: "Full week commitment", icon: Clock },
  { id: "10_plus_days", label: "10+ Days", desc: "Extended expedition", icon: Clock },
  { id: "flexible", label: "Flexible", desc: "I\u2019ll take whatever it takes", icon: Clock },
];

const TRAVEL_OPTIONS: { id: TravelWillingness; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "drive_only", label: "Drive Only", desc: "Keep it within driving range", icon: Car },
  { id: "short_flight", label: "Short Flights", desc: "2\u20133 hour flights are fine", icon: Plane },
  { id: "will_fly_anywhere", label: "Fly Anywhere", desc: "Distance isn\u2019t a factor", icon: Globe },
];

export function StepTravelReality() {
  const wizard = useWizardStore();

  const airport = wizard.homeState ? getPrimaryAirport(wizard.homeState) : null;
  const sampleEstimates = wizard.homeState ? [
    { state: "CO", routes: findBestRoutes(wizard.homeState, "CO") },
    { state: "MT", routes: findBestRoutes(wizard.homeState, "MT") },
    { state: "ID", routes: findBestRoutes(wizard.homeState, "ID") },
  ].filter((e) => e.routes.length > 0).map((e) => ({ state: e.state, cost: e.routes[0].avgCost })) : [];

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6 space-y-8">
        <div>
          <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-1">Step 6 of 9</p>
          <h2 className="text-xl font-bold">Let&apos;s talk travel reality.</h2>
          <p className="text-sm text-muted-foreground mt-1">How often, how long, and how far you\u2019ll go shapes which states make the cut.</p>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground mb-3 block">How often do you want to hunt out west?</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {FREQUENCY_OPTIONS.map((opt) => (
              <OptionCard key={opt.id} selected={wizard.huntFrequency === opt.id} onClick={() => wizard.setField("huntFrequency", opt.id)} icon={opt.icon} title={opt.label} description={opt.desc} compact />
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground mb-3 block">How much time can you take per trip?</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {TIME_OPTIONS.map((opt) => (
              <OptionCard key={opt.id} selected={wizard.timeAvailable === opt.id} onClick={() => wizard.setField("timeAvailable", opt.id)} icon={opt.icon} title={opt.label} description={opt.desc} compact />
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground mb-3 block">How far will you travel?</label>
          <div className="grid grid-cols-3 gap-3">
            {TRAVEL_OPTIONS.map((opt) => (
              <OptionCard key={opt.id} selected={wizard.travelWillingness === opt.id} onClick={() => wizard.setField("travelWillingness", opt.id)} icon={opt.icon} title={opt.label} description={opt.desc} compact />
            ))}
          </div>
        </div>

        {wizard.travelWillingness && wizard.travelWillingness !== "drive_only" && sampleEstimates.length > 0 && (
          <div className="p-3 rounded-xl bg-secondary/30 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Plane className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold">Estimated Flight Costs from {airport}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              {sampleEstimates.map((est) => (
                <div key={est.state}>
                  <span className="text-muted-foreground/60">{est.state}:</span>
                  <span className="font-bold text-foreground ml-1">${est.cost}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {wizard.huntFrequency === "every_year" && wizard.travelWillingness === "will_fly_anywhere" && (
          <AdvisorInsight text="Hunting every year with no travel restrictions means maximum portfolio flexibility. We can spread across 6+ states and target the best draw timing regardless of geography." icon={Globe} />
        )}
      </CardContent>
    </Card>
  );
}
