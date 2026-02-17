"use client";

import { useWizardStore } from "@/lib/store";
import type { HuntingMotivation } from "@/lib/store";
import { OptionCard } from "../shared/OptionCard";
import { AdvisorInsight } from "../shared/AdvisorInsight";
import { Card, CardContent } from "@/components/ui/card";
import { SPECIES } from "@/lib/constants/species";
import { Target, Heart, Users, Mountain, Drumstick } from "lucide-react";

const SPECIES_GRADIENTS: Record<string, string> = {
  elk: "from-amber-900 to-emerald-950",
  mule_deer: "from-yellow-900 to-stone-800",
  whitetail: "from-green-900 to-amber-950",
  bear: "from-stone-800 to-slate-950",
  moose: "from-blue-950 to-cyan-900",
  pronghorn: "from-amber-800 to-yellow-950",
  bighorn_sheep: "from-stone-700 to-slate-900",
  mountain_goat: "from-slate-600 to-blue-950",
  bison: "from-amber-950 to-stone-900",
  mountain_lion: "from-orange-900 to-stone-950",
};

const SPECIES_IMAGES: Record<string, { src: string; alt: string }> = {
  elk: { src: "/images/species/elk.png", alt: "Bull elk bugling at sunset" },
  mule_deer: { src: "/images/species/mule-deer.png", alt: "Mule deer buck in sagebrush" },
  whitetail: { src: "/images/species/whitetail.png", alt: "Whitetail buck in morning fog" },
  bear: { src: "/images/species/bear.jpg", alt: "Black bear walking along a creek" },
  moose: { src: "/images/species/moose.png", alt: "Bull moose head-on in timber" },
};

const SPECIES_DESCRIPTIONS: Record<string, string> = {
  elk: "The king of western big game. Bugling bulls, mountain meadows, and the hunt of a lifetime.",
  mule_deer: "Crafty high-country bucks that test your glassing and stalking skills.",
  whitetail: "Familiar quarry in unfamiliar territory. Western whitetail hunts are a different game.",
  bear: "Spring or fall, spot-and-stalk or bait. An accessible species with great success rates.",
  moose: "The ultimate once-in-a-lifetime draw. Massive animals, near-100% success when drawn.",
  pronghorn: "Speed goats on the open prairie. High draw odds and fast-paced spot-and-stalk action.",
  bighorn_sheep: "The pinnacle of North American hunting. A lifetime of points for one unforgettable ram.",
  mountain_goat: "Above treeline, above the clouds. Technical terrain and a once-in-a-lifetime pursuit.",
  bison: "The original American giant. Limited tags, massive animals, and a deeply historic hunt.",
  mountain_lion: "Hound hunting in winter snow. A predator pursuit unlike anything else in the West.",
};

const COMBO_INSIGHTS: Record<string, string> = {
  "elk+mule_deer": "Elk and mule deer is the classic western combo. Many states let you hold both tags simultaneously \u2014 we\u2019ll look for overlap units where you can hunt both in one trip.",
  "elk+bear": "Elk and bear is smart portfolio building. Bear tags are often OTC or high-draw-odds, giving you something to hunt in point-building years.",
  "elk+moose": "Elk as your workhorse species, moose as your 15-year dream investment. That\u2019s exactly how the best portfolios are structured.",
  "elk+pronghorn": "Elk and pronghorn is a great combo. Pronghorn draws are easier and the seasons often overlap \u2014 two hunts in one western trip.",
  "bighorn_sheep": "Bighorn sheep is the ultimate long game. Most hunters build points for 15-20 years. We\u2019ll structure your portfolio around this dream while keeping you hunting other species every year.",
  "elk+bighorn_sheep": "The classic portfolio: elk keeps you hunting while sheep points build quietly in the background. Smart money strategy.",
};

function getComboInsight(species: string[]): string | null {
  if (species.includes("bighorn_sheep") && species.includes("elk")) return COMBO_INSIGHTS["elk+bighorn_sheep"];
  if (species.includes("bighorn_sheep") && species.length >= 1) return COMBO_INSIGHTS["bighorn_sheep"];
  if (species.includes("elk") && species.includes("mule_deer")) return COMBO_INSIGHTS["elk+mule_deer"];
  if (species.includes("elk") && species.includes("pronghorn")) return COMBO_INSIGHTS["elk+pronghorn"];
  if (species.includes("elk") && species.includes("bear")) return COMBO_INSIGHTS["elk+bear"];
  if (species.includes("elk") && species.includes("moose")) return COMBO_INSIGHTS["elk+moose"];
  if (species.length >= 3) return `${species.length} species is an ambitious portfolio. We\u2019ll identify states where multiple species overlap so you maximize each trip.`;
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
          <h2 className="text-xl font-bold">What&apos;s calling you west?</h2>
          <p className="text-sm text-muted-foreground mt-1">Select every species you&apos;re interested in. We&apos;ll build a portfolio that covers them all.</p>
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
