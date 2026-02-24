"use client";

import { useWizardStore } from "@/lib/store";
import type { HuntFrequency, TimeAvailable, TravelWillingness } from "@/lib/store";
import { OptionCard } from "../shared/OptionCard";
import { AdvisorInsight } from "../shared/AdvisorInsight";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, Plane, Car, Globe, Users, Mountain } from "lucide-react";
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
          <h2 className="text-xl font-bold">Travel constraints.</h2>
          <p className="text-sm text-muted-foreground mt-1">How often, how long, and how far you go shapes which states make the cut.</p>
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

        {wizard.planForAge !== null && wizard.planForAge < 16 && (
          <AdvisorInsight
            text={`At ${wizard.planForAge}, a parent or guardian companion is required in most states. Plan for 2 sets of travel logistics. Solo hunting becomes an option around 16–18 depending on the state.`}
            icon={Users}
          />
        )}
        {wizard.planForAge !== null && wizard.planForAge > 60 && (
          <AdvisorInsight
            text={`Accessibility matters more with age. We'll prioritize states and units with good road access, shorter pack-outs, and guided options for the most demanding terrain.`}
            icon={Mountain}
          />
        )}

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

        {/* Party Size */}
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            Do you apply solo or with a group?
          </label>
          <p className="text-xs text-muted-foreground/60 mb-3">
            Some states average group points (lowest common denominator). Applying with a buddy who has 0 points changes your entire strategy.
          </p>
          <div className="flex items-center gap-4 justify-center">
            <button
              onClick={() => wizard.setField("partySize", Math.max(1, wizard.partySize - 1))}
              className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-lg font-bold hover:bg-accent transition-colors"
            >-</button>
            <div className="text-center">
              <span className="text-3xl font-bold font-mono w-12 inline-block">{wizard.partySize}</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">{wizard.partySize === 1 ? "solo" : `${wizard.partySize} hunters`}</p>
            </div>
            <button
              onClick={() => wizard.setField("partySize", Math.min(6, wizard.partySize + 1))}
              className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-lg font-bold hover:bg-accent transition-colors"
            >+</button>
          </div>
          {wizard.partySize > 1 && (
            <AdvisorInsight
              text={`Applying as a party of ${wizard.partySize}: States like Wyoming and Colorado average your group's points. If anyone in your group has significantly fewer points, it drags down your draw odds. Consider having low-point members buy points solo until they catch up.`}
              icon={Users}
            />
          )}
        </div>

        {/* Physical Horizon */}
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            How many more years of extreme backcountry hunting?
          </label>
          <p className="text-xs text-muted-foreground/60 mb-3">
            Be honest — this caps how far out we&apos;ll plan demanding hunts like sheep, goat, or wilderness elk.
          </p>
          <div className="flex items-center gap-4 justify-center">
            <button
              onClick={() => wizard.setField("physicalHorizon", Math.max(1, (wizard.physicalHorizon ?? 10) - 1))}
              className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-lg font-bold hover:bg-accent transition-colors"
            >-</button>
            <div className="text-center">
              <span className="text-3xl font-bold font-mono w-12 inline-block">{wizard.physicalHorizon ?? "—"}</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">years</p>
            </div>
            <button
              onClick={() => wizard.setField("physicalHorizon", Math.min(30, (wizard.physicalHorizon ?? 10) + 1))}
              className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-lg font-bold hover:bg-accent transition-colors"
            >+</button>
          </div>
          <div className="flex justify-center gap-2 mt-3">
            {[5, 10, 15, 20].map((y) => (
              <button
                key={y}
                onClick={() => wizard.setField("physicalHorizon", y)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  wizard.physicalHorizon === y
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-accent"
                }`}
              >
                {y} yrs
              </button>
            ))}
          </div>
          {wizard.physicalHorizon !== null && wizard.physicalHorizon <= 5 && (
            <AdvisorInsight
              text="With a 5-year physical window, we'll front-load the demanding hunts and avoid putting you on a 15-year sheep draw. Accessible truck-camp hunts take priority for the later years."
              icon={Mountain}
            />
          )}
        </div>

        {/* PTO / Hunt days per year */}
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            How many days per year can you dedicate to hunting?
          </label>
          <p className="text-xs text-muted-foreground/60 mb-3">
            Include travel days. This helps us avoid recommending hunts that won&apos;t fit your schedule.
          </p>
          <div className="flex items-center gap-4 justify-center">
            <button
              onClick={() => wizard.setField("huntDaysPerYear", Math.max(0, wizard.huntDaysPerYear - 1))}
              className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-lg font-bold hover:bg-accent transition-colors"
            >-</button>
            <div className="text-center">
              <span className="text-3xl font-bold font-mono w-16 inline-block">{wizard.huntDaysPerYear || "—"}</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">days / year</p>
            </div>
            <button
              onClick={() => wizard.setField("huntDaysPerYear", Math.min(60, wizard.huntDaysPerYear + 1))}
              className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-lg font-bold hover:bg-accent transition-colors"
            >+</button>
          </div>
          <div className="flex justify-center gap-2 mt-3">
            {[7, 10, 14, 21].map((d) => (
              <button
                key={d}
                onClick={() => wizard.setField("huntDaysPerYear", d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  wizard.huntDaysPerYear === d
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-accent"
                }`}
              >
                {d} days
              </button>
            ))}
          </div>
          {wizard.huntDaysPerYear > 0 && wizard.huntDaysPerYear < 7 && (
            <div className="mt-3 p-2 rounded-lg bg-chart-4/5 border border-chart-4/10">
              <p className="text-[10px] text-chart-4 font-medium">
                With fewer than 7 days, most western elk hunts will feel rushed. States with shorter travel and truck-camp accessible units are prioritized.
              </p>
            </div>
          )}
        </div>

        {wizard.huntFrequency === "every_year" && wizard.travelWillingness === "will_fly_anywhere" && (
          <AdvisorInsight text="Hunting every year with no travel restrictions means maximum portfolio flexibility. Spread across 6+ states and target the best draw timing regardless of geography." icon={Globe} />
        )}
      </CardContent>
    </Card>
  );
}
