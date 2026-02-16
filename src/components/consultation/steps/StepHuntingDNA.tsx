"use client";

import { useWizardStore } from "@/lib/store";
import { OptionCard } from "../shared/OptionCard";
import { ToggleChip } from "../shared/ToggleChip";
import { AdvisorInsight } from "../shared/AdvisorInsight";
import { Card, CardContent } from "@/components/ui/card";
import { Tent, Users, Footprints, Mountain, TreePine, Snowflake, Eye, MapPin } from "lucide-react";
import type { HuntStyle } from "@/lib/types";

const STYLE_OPTIONS: { id: HuntStyle; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "diy_backpack", label: "DIY Backpack", desc: "Self-reliant, deep backcountry, minimal camp", icon: Tent },
  { id: "diy_truck", label: "DIY Truck Camp", desc: "Base camp from the truck, day hunts into the field", icon: Footprints },
  { id: "guided", label: "Fully Guided", desc: "Professional outfitter handles logistics and scouting", icon: Users },
  { id: "drop_camp", label: "Drop Camp", desc: "Outfitter sets up camp, you hunt on your own", icon: MapPin },
];

const STYLE_INSIGHTS: Record<string, string> = {
  diy_backpack: "DIY backpack hunting opens up the most remote, lowest-pressure units. We\u2019ll prioritize wilderness areas and roadless zones where other hunters won\u2019t go.",
  diy_truck: "Truck camping is the most flexible approach. You can cover more ground, run back to camp for lunch, and change plans mid-hunt without moving your whole setup.",
  guided: "Guided hunts maximize your odds on premium tags. When you\u2019ve waited 5+ years for a draw, having a local expert is the smart play.",
  drop_camp: "Drop camp gives you the best of both worlds \u2014 someone gets you into elk country with a camp setup, then you hunt on your own terms.",
};

const TERRAIN_OPTIONS = [
  { id: "alpine", label: "Alpine", icon: Snowflake },
  { id: "dark_timber", label: "Dark Timber", icon: TreePine },
  { id: "open_sage", label: "Open Sage", icon: Eye },
  { id: "river_bottom", label: "River Bottom", icon: Mountain },
  { id: "desert", label: "Desert", icon: Mountain },
];

const FACTOR_OPTIONS = [
  { id: "draw_odds", label: "Draw Odds" },
  { id: "trophy_quality", label: "Trophy Quality" },
  { id: "solitude", label: "Solitude" },
  { id: "accessibility", label: "Accessibility" },
  { id: "cost", label: "Low Cost" },
  { id: "success_rate", label: "Success Rate" },
  { id: "scenery", label: "Scenery" },
  { id: "season_timing", label: "Season Timing" },
];

export function StepHuntingDNA() {
  const wizard = useWizardStore();

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6 space-y-8">
        <div>
          <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-1">Step 5 of 9</p>
          <h2 className="text-xl font-bold">Your hunting DNA.</h2>
          <p className="text-sm text-muted-foreground mt-1">How you hunt is just as important as what you hunt. This shapes unit selection, logistics, and budget.</p>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground mb-3 block">Primary hunt style?</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {STYLE_OPTIONS.map((opt) => (
              <OptionCard
                key={opt.id}
                selected={wizard.huntStylePrimary === opt.id}
                onClick={() => wizard.setField("huntStylePrimary", opt.id)}
                icon={opt.icon}
                title={opt.label}
                description={opt.desc}
                compact
              />
            ))}
          </div>
        </div>

        {wizard.huntStylePrimary && STYLE_INSIGHTS[wizard.huntStylePrimary] && (
          <AdvisorInsight text={STYLE_INSIGHTS[wizard.huntStylePrimary]} />
        )}

        {wizard.huntStylePrimary && wizard.huntStylePrimary !== "guided" && (
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Open to guided hunts for specific species?</label>
            <div className="flex gap-3 mb-3">
              <button
                onClick={() => wizard.setField("openToGuided", false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${!wizard.openToGuided ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}
              >
                No, all DIY
              </button>
              <button
                onClick={() => wizard.setField("openToGuided", true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${wizard.openToGuided ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}
              >
                Yes, for some species
              </button>
            </div>
            {wizard.openToGuided && (
              <div className="flex flex-wrap gap-2">
                {wizard.species.map((sp) => (
                  <ToggleChip key={sp} selected={wizard.guidedForSpecies.includes(sp)} onClick={() => wizard.toggleArrayField("guidedForSpecies", sp)} label={sp.replace("_", " ")} />
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-muted-foreground mb-3 block">Preferred terrain? (select all that apply)</label>
          <div className="flex flex-wrap gap-2">
            {TERRAIN_OPTIONS.map((t) => (
              <ToggleChip key={t.id} selected={wizard.preferredTerrain.includes(t.id)} onClick={() => wizard.toggleArrayField("preferredTerrain", t.id)} label={t.label} />
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground mb-3 block">What&apos;s most important to you? (pick up to 3)</label>
          <div className="flex flex-wrap gap-2">
            {FACTOR_OPTIONS.map((f) => (
              <ToggleChip
                key={f.id}
                selected={wizard.importantFactors.includes(f.id)}
                onClick={() => {
                  if (wizard.importantFactors.includes(f.id) || wizard.importantFactors.length < 3) {
                    wizard.toggleArrayField("importantFactors", f.id);
                  }
                }}
                label={f.label}
              />
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">{wizard.importantFactors.length}/3 selected</p>
        </div>
      </CardContent>
    </Card>
  );
}
