"use client";

import { useWizardStore } from "@/lib/store";
import type { TrophyVsMeat, UncertaintyComfort } from "@/lib/store";
import { OptionCard } from "../shared/OptionCard";
import { AdvisorInsight } from "../shared/AdvisorInsight";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Scale, Drumstick, Shuffle, ShieldCheck } from "lucide-react";

const TROPHY_OPTIONS: { id: TrophyVsMeat; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "trophy_focused", label: "Trophy Focused", desc: "I\u2019ll wait years for the right tag on the right animal", icon: Trophy },
  { id: "lean_trophy", label: "Lean Trophy", desc: "Quality matters, but I want to hunt somewhat regularly", icon: Trophy },
  { id: "balanced", label: "Balanced", desc: "Mix of trophy potential and regular hunting opportunities", icon: Scale },
  { id: "lean_meat", label: "Lean Meat", desc: "I want to fill tags regularly with occasional trophy shots", icon: Drumstick },
  { id: "meat_focused", label: "Meat Focused", desc: "Get me in the field as often as possible", icon: Drumstick },
];

const TROPHY_INSIGHTS: Record<string, string> = {
  trophy_focused: "A trophy-focused strategy means fewer hunts but legendary experiences. We\u2019ll target states with bonus/preference systems where patience pays off \u2014 think NV, AZ, and WY premium units.",
  lean_trophy: "Leaning trophy means we\u2019ll build a portfolio with 1\u20132 long-term trophy investments and 2\u20133 states where you can hunt every 2\u20133 years with solid quality.",
  balanced: "The balanced approach is the most popular. You\u2019ll hunt something every year while building toward a premium draw every 3\u20135 years.",
  lean_meat: "Meat-leaning means we prioritize states with high draw odds, OTC options, and second-choice tactics. You\u2019ll be in the field regularly.",
  meat_focused: "Meat-focused means maximum time hunting. We\u2019ll stack OTC states, leftover tags, and high-odds draws. Expect to hunt 1\u20132 times per year.",
};

const UNCERTAINTY_OPTIONS: { id: UncertaintyComfort; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "love_it", label: "Love the Lottery", desc: "Random draws and surprise tags are part of the fun", icon: Shuffle },
  { id: "tolerate", label: "Tolerate It", desc: "I\u2019ll play the system but prefer building toward guaranteed draws", icon: Scale },
  { id: "prefer_certainty", label: "Prefer Certainty", desc: "I want to know when I\u2019m going hunting years in advance", icon: ShieldCheck },
];

export function StepPaintThePicture() {
  const wizard = useWizardStore();

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6 space-y-8">
        <div>
          <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-1">Step 3 of 9</p>
          <h2 className="text-xl font-bold">Paint the picture of your ideal hunt.</h2>
          <p className="text-sm text-muted-foreground mt-1">There are no wrong answers. This helps us weight trophy potential vs. frequency vs. adventure.</p>
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
          <label htmlFor="bucket-list-textarea" className="text-sm font-medium text-muted-foreground mb-2 block">Describe your dream hunt (optional)</label>
          <p className="text-xs text-muted-foreground mb-3">Close your eyes. Where are you? What are you hunting? What does it feel like?</p>
          <textarea
            id="bucket-list-textarea"
            value={wizard.bucketListDescription}
            onChange={(e) => wizard.setField("bucketListDescription", e.target.value.slice(0, 500))}
            placeholder="e.g., Archery elk in a remote Colorado wilderness area, bugling at dawn, just me and the mountains..."
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
          <p className="text-[10px] text-muted-foreground text-right mt-1">{wizard.bucketListDescription.length}/500</p>
        </div>
      </CardContent>
    </Card>
  );
}
