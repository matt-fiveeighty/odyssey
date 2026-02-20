"use client";

import { useWizardStore } from "@/lib/store";
import type { ExperienceLevel, PhysicalComfort } from "@/lib/store";
import { OptionCard } from "../shared/OptionCard";
import { ToggleChip } from "../shared/ToggleChip";
import { AdvisorInsight } from "../shared/AdvisorInsight";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Mountain, TreePine, Shield, Sun, TrendingUp, Plane, Calendar, Clock, User } from "lucide-react";
import { getPrimaryAirport } from "@/lib/constants/flight-hubs";

const HOME_INSIGHTS: Record<string, string> = {
  FL: "Based in Florida — every hunt is a fly-in expedition. Direct flight routes from MCO/TPA, meat shipping logistics, and acclimation time are all factored in.",
  TX: "Based in Texas — closer to the west than most. Driving to NM and CO is realistic, and DFW is a major hub for flights to any western state.",
  NY: "Based in New York — flights for every trip. JFK and EWR cover DEN, SLC, and BOI. Travel is built into the budget.",
  GA: "Based in Georgia — ATL is one of the best hubs in the country. Direct flights to DEN, SLC, BOI, and ABQ keep logistics cleaner than most eastern hunters.",
  CA: "Based in California — already out west. Driving to NV, OR, and AZ is realistic. Flying to MT, WY, and CO is a short hop.",
  OH: "Based in Ohio — middle ground. Some states are driveable, others need flights. The portfolio mixes both to keep costs efficient.",
};

function getHomeInsight(state: string): string | null {
  if (HOME_INSIGHTS[state]) return HOME_INSIGHTS[state];
  const airport = getPrimaryAirport(state);
  const western = ["CO", "WY", "MT", "ID", "UT", "NV", "OR", "NM", "AZ", "WA", "AK"];
  if (western.includes(state)) {
    return `Based in ${state} — already in western hunting country. Proximity is a real advantage for scouting, extending hunts, and saving on travel.`;
  }
  return `Based in ${state}, primary departure airport is ${airport}. All flights route from there, with travel costs factored into your portfolio.`;
}

function getAgeInsight(age: number, horizon: number): string | null {
  if (age < 14) {
    return `At ${age}, the next ${horizon} years are a massive advantage. Start buying preference points now — by the time they're old enough to hunt solo (14–16), they'll be positioned ahead of adults who started late. Youth-only tags in many states offer incredible draw odds.`;
  }
  if (age < 18) {
    return `At ${age}, they're ready to hunt but still have time to build a deep portfolio. A ${horizon}-year horizon means they can lock in premium draws (sheep, moose) by their mid-20s while hunting accessible species now.`;
  }
  if (age > 65) {
    return `At ${age}, the strategy shifts toward maximizing immediate opportunities. We'll prioritize states with points already accumulated, high-success OTC units, and accessible terrain. Every year counts.`;
  }
  if (age > 55) {
    return `At ${age}, physical access and draw timeline matter more than long-term point building. We'll weight high-odds units, guided options for demanding terrain, and front-load the best opportunities within ${horizon} years.`;
  }
  return null;
}

function getDefaultHorizon(age: number | null): number {
  if (age === null) return 10;
  if (age < 18) return 20;
  if (age > 60) return 10;
  if (age > 50) return 10;
  return 15;
}

const ELEVATION_INSIGHTS: Record<string, string> = {
  sea_level: "Coming from low elevation, units under 9,500 ft are prioritized with 2\u20133 extra acclimation days built in.",
  moderate_elevation: "Comfortable to 9,000 ft opens up the majority of western hunting. Some higher-altitude options included, weighted toward your comfort zone.",
  high_alpine: "No elevation restrictions means every unit is on the table — including above-treeline alpine basins where pressure drops to near zero.",
  any: "Living in the mountains already means zero acclimation concerns. Real competitive advantage over flatland hunters.",
};

export function StepAboutYou() {
  const wizard = useWizardStore();

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6 space-y-8">
        <div>
          <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-1">Step 1 of 9</p>
          <h2 className="text-xl font-bold">Start with the hunter.</h2>
          <p className="text-sm text-muted-foreground mt-1">Who is this plan for? Their age and timeline shape everything — from species strategy to draw positioning.</p>
        </div>

        {/* Person & Planning Horizon */}
        <div className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="plan-for-name" className="text-sm font-medium text-muted-foreground mb-2 block">Who is this plan for?</label>
              <input
                id="plan-for-name"
                type="text"
                value={wizard.planForName}
                onChange={(e) => wizard.setField("planForName", e.target.value.slice(0, 60))}
                placeholder="e.g., My son Jake, Dad, Me"
                maxLength={60}
                className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="plan-for-age" className="text-sm font-medium text-muted-foreground mb-2 block">Age</label>
              <input
                id="plan-for-age"
                type="number"
                min={8}
                max={85}
                value={wizard.planForAge ?? ""}
                onChange={(e) => {
                  const val = e.target.value === "" ? null : Math.max(8, Math.min(85, parseInt(e.target.value)));
                  wizard.setField("planForAge", val);
                  // Auto-adjust horizon when age changes
                  if (val !== null) {
                    wizard.setField("planningHorizon", getDefaultHorizon(val));
                  }
                }}
                placeholder="Optional"
                className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Planning horizon</label>
              <div className="flex gap-2">
                {[10, 15, 20, 25].map((yr) => (
                  <button
                    key={yr}
                    onClick={() => wizard.setField("planningHorizon", yr)}
                    className={`flex-1 px-2 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer border ${
                      wizard.planningHorizon === yr
                        ? "bg-primary/15 text-primary border-primary/25"
                        : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                    }`}
                  >
                    {yr}yr
                  </button>
                ))}
              </div>
            </div>
          </div>

          {wizard.planForAge !== null && getAgeInsight(wizard.planForAge, wizard.planningHorizon) && (
            <AdvisorInsight text={getAgeInsight(wizard.planForAge, wizard.planningHorizon)!} icon={Calendar} />
          )}
        </div>

        {/* Location */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="home-state-select" className="text-sm font-medium text-muted-foreground mb-2 block">{wizard.planForName ? `Where is ${wizard.planForName} based?` : "Where are you based?"}</label>
            <select
              id="home-state-select"
              value={wizard.homeState}
              onChange={(e) => wizard.setField("homeState", e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Select your state</option>
              {["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="home-city-input" className="text-sm font-medium text-muted-foreground mb-2 block">City (optional)</label>
            <input
              id="home-city-input"
              type="text"
              value={wizard.homeCity}
              onChange={(e) => wizard.setField("homeCity", e.target.value.slice(0, 100))}
              placeholder="e.g., Orlando, Denver, Dallas"
              maxLength={100}
              autoComplete="address-level2"
              className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {wizard.homeState && (
          <AdvisorInsight text={getHomeInsight(wizard.homeState) ?? ""} icon={Plane} />
        )}

        <div>
          <label className="text-sm font-medium text-muted-foreground mb-3 block">{wizard.planForName ? `How many western big game hunts has ${wizard.planForName} been on?` : "How many western big game hunts have you been on?"}</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {([
              { id: "never_hunted_west" as ExperienceLevel, label: "None yet", desc: "This will be my first", icon: Star },
              { id: "1_2_trips" as ExperienceLevel, label: "1\u20132 trips", desc: "Getting started", icon: Mountain },
              { id: "3_5_trips" as ExperienceLevel, label: "3\u20135 trips", desc: "Know the drill", icon: TreePine },
              { id: "veteran" as ExperienceLevel, label: "6+ trips", desc: "Veteran", icon: Shield },
            ]).map((opt) => (
              <OptionCard
                key={opt.id}
                selected={wizard.experienceLevel === opt.id}
                onClick={() => wizard.setField("experienceLevel", opt.id)}
                icon={opt.icon}
                title={opt.label}
                description={opt.desc}
                compact
              />
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1 block">{wizard.planForName ? `How does ${wizard.planForName} handle elevation?` : "How do you handle elevation?"}</label>
          <p className="text-xs text-muted-foreground mb-3">Be honest — this directly affects which units get recommended.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {([
              { id: "sea_level" as PhysicalComfort, label: "Sea Level", desc: "I live at low elevation", icon: Sun },
              { id: "moderate_elevation" as PhysicalComfort, label: "Moderate", desc: "Comfortable to ~9,000 ft", icon: Mountain },
              { id: "high_alpine" as PhysicalComfort, label: "High Alpine", desc: "Love being above treeline", icon: TrendingUp },
              { id: "any" as PhysicalComfort, label: "Any Elevation", desc: "I live in the mountains", icon: TreePine },
            ]).map((opt) => (
              <OptionCard
                key={opt.id}
                selected={wizard.physicalComfort === opt.id}
                onClick={() => wizard.setField("physicalComfort", opt.id)}
                icon={opt.icon}
                title={opt.label}
                description={opt.desc}
                compact
              />
            ))}
          </div>
        </div>

        {wizard.physicalComfort && ELEVATION_INSIGHTS[wizard.physicalComfort] && (
          <AdvisorInsight text={ELEVATION_INSIGHTS[wizard.physicalComfort]} icon={Mountain} />
        )}

        <div>
          <label className="text-sm font-medium text-muted-foreground mb-3 block">Which western states have you hunted before?</label>
          <div className="flex flex-wrap gap-2">
            {["CO", "WY", "MT", "ID", "NV", "AZ", "UT", "NM", "OR", "KS", "WA", "NE", "SD", "ND", "AK"].map((s) => (
              <ToggleChip key={s} selected={wizard.hasHuntedStates.includes(s)} onClick={() => wizard.toggleArrayField("hasHuntedStates", s)} label={s} />
            ))}
            <button onClick={() => wizard.setField("hasHuntedStates", [] as string[])} className="px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors">None</button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
