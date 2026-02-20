"use client";

import { useWizardStore } from "@/lib/store";
import type { HuntingMotivation } from "@/lib/store";
import { OptionCard } from "../shared/OptionCard";
import { AdvisorInsight } from "../shared/AdvisorInsight";
import { Card, CardContent } from "@/components/ui/card";
import { SPECIES } from "@/lib/constants/species";
import { SPECIES_IMAGES, SPECIES_GRADIENTS, SPECIES_DESCRIPTIONS } from "@/lib/constants/species-images";
import { Target, Heart, Users, Mountain, Drumstick } from "lucide-react";

const COMBO_INSIGHTS: Record<string, string> = {
  "elk+mule_deer": "Elk and mule deer is the classic western combo. Many states let you hold both tags simultaneously — overlap units let you hunt both in one trip.",
  "elk+black_bear": "Elk and black bear is smart portfolio building. Bear tags are often OTC or high-draw-odds, giving you something to hunt in point-building years.",
  "elk+moose": "Elk as your workhorse species, moose as your 15-year long-term investment. That is how the strongest portfolios are structured.",
  "elk+pronghorn": "Elk and pronghorn pair well. Pronghorn draws are easier and the seasons often overlap — two hunts in one western trip.",
  "bighorn_sheep": "Bighorn sheep is the longest game in western hunting. Most hunters build points for 15-20 years. The portfolio is structured around that timeline while keeping you hunting other species every year.",
  "elk+bighorn_sheep": "The classic portfolio: elk keeps you hunting while sheep points build quietly in the background. Smart money strategy.",
  "elk+grizzly": "Elk and grizzly is a strong combination. Grizzly hunts in MT, WY, and ID are once-in-a-lifetime pursuits that add real depth to your portfolio.",
  "coues_deer": "Coues deer is the hardest glassing challenge in North America. Arizona and New Mexico offer the best opportunities for the gray ghost of the Southwest.",
  "blacktail": "Columbia blacktail in the Pacific Northwest rainforests is a completely different experience from open-country western hunting. Great diversity play.",
};

function getComboInsight(species: string[]): string | null {
  if (species.includes("bighorn_sheep") && species.includes("elk")) return COMBO_INSIGHTS["elk+bighorn_sheep"];
  if (species.includes("bighorn_sheep") && species.length >= 1) return COMBO_INSIGHTS["bighorn_sheep"];
  if (species.includes("elk") && species.includes("mule_deer")) return COMBO_INSIGHTS["elk+mule_deer"];
  if (species.includes("elk") && species.includes("pronghorn")) return COMBO_INSIGHTS["elk+pronghorn"];
  if (species.includes("elk") && species.includes("black_bear")) return COMBO_INSIGHTS["elk+black_bear"];
  if (species.includes("elk") && species.includes("grizzly")) return COMBO_INSIGHTS["elk+grizzly"];
  if (species.includes("elk") && species.includes("moose")) return COMBO_INSIGHTS["elk+moose"];
  if (species.includes("coues_deer")) return COMBO_INSIGHTS["coues_deer"];
  if (species.includes("blacktail")) return COMBO_INSIGHTS["blacktail"];
  if (species.length >= 3) return `${species.length} species across your portfolio. States with multiple species overlap are prioritized so you maximize each trip.`;
  return null;
}

const MOTIVATION_OPTIONS: { id: HuntingMotivation; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "challenge", label: "The Challenge", desc: "I want to test myself against a worthy animal in tough terrain", icon: Target },
  { id: "connection", label: "Wild Places", desc: "I want to be in places most people never see", icon: Mountain },
  { id: "tradition", label: "Family Tradition", desc: "Passing it down or building something new with loved ones", icon: Users },
  { id: "escape", label: "The Escape", desc: "Unplugging from everything and being fully present", icon: Heart },
  { id: "meat_provider", label: "Meat Provider", desc: "Filling the freezer with clean, wild protein", icon: Drumstick },
];

export function StepWhatsCalling() {
  const wizard = useWizardStore();
  const comboInsight = getComboInsight(wizard.species);

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6 space-y-8">
        <div>
          <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-1">Step 2 of 9</p>
          <h2 className="text-xl font-bold">Target species and motivation.</h2>
          <p className="text-sm text-muted-foreground mt-1">Select every species you want to pursue. The portfolio covers them all.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SPECIES.map((sp) => {
            const img = SPECIES_IMAGES[sp.id];
            return (
              <OptionCard
                key={sp.id}
                selected={wizard.species.includes(sp.id)}
                onClick={() => wizard.toggleArrayField("species", sp.id)}
                title={sp.name}
                description={SPECIES_DESCRIPTIONS[sp.id]}
                gradient={SPECIES_GRADIENTS[sp.id]}
                imageSrc={img?.src}
                imageAlt={img?.alt}
              />
            );
          })}
        </div>

        {comboInsight && <AdvisorInsight text={comboInsight} />}

        <div>
          <label className="text-sm font-medium text-muted-foreground mb-3 block">What drives you to hunt?</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {MOTIVATION_OPTIONS.map((opt) => (
              <OptionCard
                key={opt.id}
                selected={wizard.huntingMotivation === opt.id}
                onClick={() => wizard.setField("huntingMotivation", opt.id)}
                icon={opt.icon}
                title={opt.label}
                description={opt.desc}
                compact
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
