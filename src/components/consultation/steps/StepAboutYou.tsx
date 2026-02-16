"use client";

import { useWizardStore } from "@/lib/store";
import type { ExperienceLevel, PhysicalComfort } from "@/lib/store";
import { OptionCard } from "../shared/OptionCard";
import { ToggleChip } from "../shared/ToggleChip";
import { AdvisorInsight } from "../shared/AdvisorInsight";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Mountain, TreePine, Shield, Sun, TrendingUp, Plane } from "lucide-react";
import { getPrimaryAirport } from "@/lib/constants/flight-hubs";

const HOME_INSIGHTS: Record<string, string> = {
  FL: "Based in Florida \u2014 every hunt is a fly-in expedition. We\u2019ll factor in direct flight routes from MCO/TPA, meat shipping logistics, and acclimation time for elevation.",
  TX: "Based in Texas \u2014 you\u2019re closer to the west than most. Driving to NM and CO is realistic, and DFW is a major hub for flights to any western state.",
  NY: "Based in New York \u2014 you\u2019re looking at flights for every trip. JFK and EWR have great options to DEN, SLC, and BOI. We\u2019ll build travel into the budget.",
  GA: "Based in Georgia \u2014 ATL is one of the best hubs in the country. Direct flights to DEN, SLC, BOI, and ABQ make your logistics cleaner than most eastern hunters.",
  CA: "Based in California \u2014 you\u2019re already out west. Driving to NV, OR, and AZ is realistic. Flying to MT, WY, and CO is a short hop.",
  OH: "Based in Ohio \u2014 you\u2019re in the middle ground. Some states are driveable, others need flights. We\u2019ll mix both to keep costs efficient.",
};

function getHomeInsight(state: string): string | null {
  if (HOME_INSIGHTS[state]) return HOME_INSIGHTS[state];
  const airport = getPrimaryAirport(state);
  const western = ["CO", "WY", "MT", "ID", "UT", "NV", "OR", "NM", "AZ", "WA", "AK"];
  if (western.includes(state)) {
    return `Based in ${state} \u2014 you\u2019re already in western hunting country. Your proximity is a major advantage for scouting, extending hunts, and saving on travel.`;
  }
  return `Based in ${state}, your primary departure airport is ${airport}. We\u2019ll route all flights from there and factor travel costs into your portfolio.`;
}

const ELEVATION_INSIGHTS: Record<string, string> = {
  sea_level: "Coming from low elevation, we\u2019ll prioritize units under 9,500 ft and build in 2\u20133 extra acclimation days. The right preparation makes all the difference.",
  moderate_elevation: "Comfortable to 9,000 ft opens up the majority of western hunting. We\u2019ll include some higher-altitude options but weight toward your comfort zone.",
  high_alpine: "No elevation restrictions means every unit is on the table \u2014 including the above-treeline alpine basins where pressure drops to near zero.",
  any: "Living in the mountains already means zero acclimation concerns. That\u2019s a real competitive advantage over flatland hunters.",
};

export function StepAboutYou() {
  const wizard = useWizardStore();

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6 space-y-8">
        <div>
          <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-1">Step 1 of 9</p>
          <h2 className="text-xl font-bold">Before we plan a single hunt, we need to know the hunter.</h2>
          <p className="text-sm text-muted-foreground mt-1">Where you live changes everything &mdash; flight logistics, elevation acclimation, what&apos;s realistic.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="home-state-select" className="text-sm font-medium text-muted-foreground mb-2 block">Where are you based?</label>
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
          <label className="text-sm font-medium text-muted-foreground mb-3 block">How many western big game hunts have you been on?</label>
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
          <label className="text-sm font-medium text-muted-foreground mb-1 block">How do you handle elevation?</label>
          <p className="text-xs text-muted-foreground mb-3">Be honest &mdash; this directly affects which units we recommend.</p>
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
