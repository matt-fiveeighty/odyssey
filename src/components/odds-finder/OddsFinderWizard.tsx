"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Crosshair, Timer } from "lucide-react";
import type { Species } from "@/lib/types";

type Step = "species" | "weapon" | "timeline" | "results";
type WeaponType = "archery" | "rifle" | "muzzleloader" | "any";
type Timeline = "this_year" | "1_3" | "3_7" | "any";

interface OddsFinderWizardProps {
  step: Step;
  selectedSpecies: string;
  selectedWeapon: WeaponType;
  selectedTimeline: Timeline;
  speciesOptions: Species[];
  unitCountBySpecies: Record<string, number>;
  onSelectSpecies: (id: string) => void;
  onSelectWeapon: (weapon: WeaponType) => void;
  onSelectTimeline: (timeline: Timeline) => void;
  onBack: () => void;
}

const STEPS: Step[] = ["species", "weapon", "timeline", "results"];

const WEAPON_OPTIONS: { id: WeaponType; label: string; icon: string }[] = [
  { id: "any", label: "Any / No Preference", icon: "🎯" },
  { id: "rifle", label: "Rifle", icon: "🔫" },
  { id: "archery", label: "Archery", icon: "🏹" },
  { id: "muzzleloader", label: "Muzzleloader", icon: "💨" },
];

const TIMELINE_OPTIONS: { id: Timeline; label: string; desc: string }[] = [
  { id: "this_year", label: "This Year", desc: "Drawable now" },
  { id: "1_3", label: "1-3 Years", desc: "Short wait" },
  { id: "3_7", label: "3-7 Years", desc: "Medium investment" },
  { id: "any", label: "Any Timeline", desc: "Show all options" },
];

export function OddsFinderWizard({
  step,
  selectedSpecies,
  selectedWeapon,
  selectedTimeline,
  speciesOptions,
  unitCountBySpecies,
  onSelectSpecies,
  onSelectWeapon,
  onSelectTimeline,
  onBack,
}: OddsFinderWizardProps) {
  const currentStepIndex = STEPS.indexOf(step);

  return (
    <>
      {/* Progress */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === s
                  ? "bg-primary text-primary-foreground"
                  : i < currentStepIndex
                    ? "bg-primary/20 text-primary"
                    : "bg-secondary text-muted-foreground"
              }`}
            >
              {i + 1}
            </div>
            {i < 3 && (
              <div
                className={`w-8 h-px ${
                  i < currentStepIndex ? "bg-primary/40" : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Species */}
      {step === "species" && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              What species are you after?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {speciesOptions.map((sp) => (
                <button
                  key={sp.id}
                  onClick={() => onSelectSpecies(sp.id)}
                  className={`p-4 rounded-xl border text-left transition-all hover:border-primary/50 hover:bg-primary/5 ${
                    selectedSpecies === sp.id
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border bg-card"
                  }`}
                >
                  <span className="text-2xl block mb-1">{sp.icon}</span>
                  <span className="text-sm font-medium">{sp.name}</span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">
                    {unitCountBySpecies[sp.id] ?? 0} units available
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Weapon */}
      {step === "weapon" && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Crosshair className="w-5 h-5 text-primary" />
              Preferred weapon type?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {WEAPON_OPTIONS.map((w) => (
                <button
                  key={w.id}
                  onClick={() => onSelectWeapon(w.id)}
                  className={`p-4 rounded-xl border text-left transition-all hover:border-primary/50 hover:bg-primary/5 ${
                    selectedWeapon === w.id
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border bg-card"
                  }`}
                >
                  <span className="text-2xl block mb-1">{w.icon}</span>
                  <span className="text-sm font-medium">{w.label}</span>
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-muted-foreground"
            >
              &larr; Back
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Timeline */}
      {step === "timeline" && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Timer className="w-5 h-5 text-primary" />
              When do you want to hunt?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {TIMELINE_OPTIONS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onSelectTimeline(t.id)}
                  className={`p-4 rounded-xl border text-left transition-all hover:border-primary/50 hover:bg-primary/5 ${
                    selectedTimeline === t.id
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border bg-card"
                  }`}
                >
                  <span className="text-sm font-medium">{t.label}</span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">
                    {t.desc}
                  </span>
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-muted-foreground"
            >
              &larr; Back
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}
