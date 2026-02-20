"use client";

import { useMemo } from "react";
import { useWizardStore } from "@/lib/store";
import type { TrophyVsMeat, UncertaintyComfort } from "@/lib/store";
import { OptionCard } from "../shared/OptionCard";
import { AdvisorInsight } from "../shared/AdvisorInsight";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Scale, Drumstick, Shuffle, ShieldCheck, Sparkles } from "lucide-react";

const TROPHY_OPTIONS: { id: TrophyVsMeat; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "trophy_focused", label: "Trophy Focused", desc: "I\u2019ll wait years for the right tag on the right animal", icon: Trophy },
  { id: "lean_trophy", label: "Lean Trophy", desc: "Quality matters, but I want to hunt somewhat regularly", icon: Trophy },
  { id: "balanced", label: "Balanced", desc: "Mix of trophy potential and regular hunting opportunities", icon: Scale },
  { id: "lean_meat", label: "Lean Meat", desc: "I want to fill tags regularly with occasional trophy shots", icon: Drumstick },
  { id: "meat_focused", label: "Meat Focused", desc: "Get me in the field as often as possible", icon: Drumstick },
];

const TROPHY_INSIGHTS: Record<string, string> = {
  trophy_focused: "Trophy-focused means fewer hunts, higher quality. The portfolio targets states with bonus/preference systems where patience pays off — NV, AZ, and WY premium units.",
  lean_trophy: "Leaning trophy means the portfolio carries 1\u20132 long-term trophy investments and 2\u20133 states where you can hunt every 2\u20133 years with solid quality.",
  balanced: "Balanced is the most common approach. You hunt something every year while building toward a premium draw every 3\u20135 years.",
  lean_meat: "Meat-leaning means the portfolio prioritizes states with high draw odds, OTC options, and second-choice tactics. You are in the field regularly.",
  meat_focused: "Meat-focused means maximum time hunting. OTC states, leftover tags, and high-odds draws stacked together. Expect to hunt 1\u20132 times per year.",
};

const UNCERTAINTY_OPTIONS: { id: UncertaintyComfort; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "love_it", label: "Love the Lottery", desc: "Random draws and surprise tags are part of the fun", icon: Shuffle },
  { id: "tolerate", label: "Tolerate It", desc: "I\u2019ll play the system but prefer building toward guaranteed draws", icon: Scale },
  { id: "prefer_certainty", label: "Prefer Certainty", desc: "I want to know when I\u2019m going hunting years in advance", icon: ShieldCheck },
];

function evaluateDream(text: string): string[] {
  if (text.trim().length < 5) return [];
  const dream = text.toLowerCase();
  const signals: string[] = [];

  // Trophy intent
  const trophyKw = ["big", "giant", "trophy", "monster", "mature", "record", "book", "boone", "pope", "6x6", "7x7", "400", "380", "360", "crusty", "stud", "hog", "toad", "slammer", "brute", "tank", "beast"];
  if (trophyKw.some((kw) => dream.includes(kw))) {
    signals.push("Trophy intent detected — premium units and states with strong preference point systems prioritized");
  }

  // Opportunity intent
  const oppKw = ["first", "easy", "beginner", "meat", "opportunity", "freezer", "cow", "doe", "raghorn", "any bull", "any buck"];
  if (oppKw.some((kw) => dream.includes(kw))) {
    signals.push("Opportunity focus detected — high-draw-odds states and OTC tags weighted higher");
  }

  // Terrain matching
  const terrainSignals: [string, string][] = [
    ["timber", "Dark timber preference → factoring in states with forested units (CO, MT, ID, OR)"],
    ["dark timber", "Dark timber preference → factoring in states with forested units (CO, MT, ID, OR)"],
    ["alpine", "Alpine terrain → scoring states with high-elevation wilderness (CO, WY, MT)"],
    ["mountain", "Mountain terrain → scoring states with high-elevation wilderness (CO, WY, MT)"],
    ["desert", "Desert terrain → factoring in arid-country states (AZ, NV, NM, UT)"],
    ["sage", "Sagebrush country → factoring in open-country states (WY, MT, NV)"],
    ["prairie", "Prairie/plains preference → scoring flatland states (KS, NE, SD)"],
  ];
  for (const [kw, msg] of terrainSignals) {
    if (dream.includes(kw)) {
      signals.push(msg);
      break;
    }
  }

  // Species detection
  const speciesSignals: [string, string][] = [
    ["elk", "Elk focus detected"],
    ["bugling", "Bugling elk → early archery seasons will be weighted"],
    ["mule deer", "Mule deer focus detected"],
    ["muley", "Mule deer focus detected"],
    ["whitetail", "Whitetail focus detected"],
    ["moose", "Moose focus — states with moose draws will be prioritized"],
    ["sheep", "Sheep focus — long-term premium draws will be weighted heavily"],
    ["ram", "Sheep focus — long-term premium draws will be weighted heavily"],
    ["goat", "Mountain goat focus detected"],
    ["bear", "Bear focus detected"],
    ["pronghorn", "Pronghorn/antelope focus detected"],
    ["antelope", "Pronghorn/antelope focus detected"],
  ];
  for (const [kw, msg] of speciesSignals) {
    if (dream.includes(kw)) {
      signals.push(msg);
      break;
    }
  }

  // Style detection
  if (dream.includes("backpack") || dream.includes("backcountry") || dream.includes("remote") || dream.includes("wilderness")) {
    signals.push("Backcountry style → public land percentage and low pressure will be weighted");
  }
  if (dream.includes("guided") || dream.includes("outfitter")) {
    signals.push("Guided hunt interest → premium units worth the outfitter investment will score higher");
  }

  return signals.slice(0, 3);
}

export function StepPaintThePicture() {
  const wizard = useWizardStore();

  const dreamEvaluation = useMemo(
    () => evaluateDream(wizard.bucketListDescription),
    [wizard.bucketListDescription]
  );

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6 space-y-8">
        <div>
          <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-1">Step 3 of 9</p>
          <h2 className="text-xl font-bold">Define your priorities.</h2>
          <p className="text-sm text-muted-foreground mt-1">This shapes how the portfolio balances trophy potential, hunt frequency, and draw strategy.</p>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground mb-3 block">Where do you fall on the trophy-to-meat spectrum?</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TROPHY_OPTIONS.map((opt) => (
              <OptionCard
                key={opt.id}
                selected={wizard.trophyVsMeat === opt.id}
                onClick={() => wizard.setField("trophyVsMeat", opt.id)}
                icon={opt.icon}
                title={opt.label}
                description={opt.desc}
                compact
              />
            ))}
          </div>
        </div>

        {wizard.trophyVsMeat && TROPHY_INSIGHTS[wizard.trophyVsMeat] && (
          <AdvisorInsight text={TROPHY_INSIGHTS[wizard.trophyVsMeat]} />
        )}

        <div>
          <label className="text-sm font-medium text-muted-foreground mb-3 block">How do you feel about uncertainty in the draw process?</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {UNCERTAINTY_OPTIONS.map((opt) => (
              <OptionCard
                key={opt.id}
                selected={wizard.comfortWithUncertainty === opt.id}
                onClick={() => wizard.setField("comfortWithUncertainty", opt.id)}
                icon={opt.icon}
                title={opt.label}
                description={opt.desc}
                compact
              />
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="bucket-list-textarea" className="text-sm font-medium text-muted-foreground mb-2 block">Describe your ideal hunt (optional)</label>
          <p className="text-xs text-muted-foreground mb-3">Species, terrain, state, style — anything that shapes what you are after.</p>
          <textarea
            id="bucket-list-textarea"
            value={wizard.bucketListDescription}
            onChange={(e) => wizard.setField("bucketListDescription", e.target.value.slice(0, 500))}
            placeholder="e.g., Archery elk in a remote Colorado wilderness area, above treeline, low pressure units"
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
          <p className="text-[10px] text-muted-foreground text-right mt-1">{wizard.bucketListDescription.length}/500</p>

          {/* Live evaluation feedback */}
          {dreamEvaluation.length > 0 && (
            <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/10 space-y-1.5 fade-in-up">
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-semibold text-primary">How this shapes your portfolio:</span>
              </div>
              {dreamEvaluation.map((signal, i) => (
                <p key={i} className="text-[11px] text-primary/80 flex items-start gap-1.5">
                  <span className="text-primary mt-px shrink-0">&#x2192;</span>
                  <span>{signal}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
