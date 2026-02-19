"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Trophy,
  Target,
  TreePine,
  Users,
  ArrowRight,
  Star,
  Crosshair,
} from "lucide-react";
import { SAMPLE_UNITS } from "@/lib/constants/sample-units";
import { STATES_MAP } from "@/lib/constants/states";
import { findAlternateUnits } from "@/lib/engine/unit-alternates";
import AlternateUnitsAccordion from "@/components/units/AlternateUnitsAccordion";
import type { Unit } from "@/lib/types";

function scoreUnit(unit: Unit): number {
  let score = 0;
  score += unit.successRate * 30;
  score += (unit.trophyRating / 10) * 30;
  score += unit.publicLandPct * 20;
  if (unit.pressureLevel === "Low") score += 20;
  else if (unit.pressureLevel === "Moderate") score += 10;
  return score;
}

function buildWhyBullets(unit: Unit): string[] {
  const bullets: string[] = [];

  if (unit.successRate >= 0.3) {
    bullets.push(
      `${Math.round(unit.successRate * 100)}% success rate — strong odds of filling your tag`
    );
  } else if (unit.successRate >= 0.2) {
    bullets.push(
      `${Math.round(unit.successRate * 100)}% success rate — solid opportunity`
    );
  }

  if (unit.trophyRating >= 8) {
    bullets.push(
      `Trophy rating ${unit.trophyRating}/10 — exceptional quality`
    );
  } else if (unit.trophyRating >= 6) {
    bullets.push(
      `Trophy rating ${unit.trophyRating}/10 — quality animals`
    );
  }

  if (unit.publicLandPct >= 0.5) {
    bullets.push(
      `${Math.round(unit.publicLandPct * 100)}% public land — plenty of DIY access`
    );
  }

  if (unit.pressureLevel === "Low") {
    bullets.push("Low hunting pressure — fewer crowds, better experience");
  }

  if (unit.pointsRequiredNonresident === 0) {
    bullets.push("OTC or zero points — no waiting to draw");
  } else if (unit.pointsRequiredNonresident <= 3) {
    bullets.push(
      `Only ${unit.pointsRequiredNonresident} points needed — draw within a few years`
    );
  }

  if (unit.tacticalNotes?.proTip) {
    const tip = unit.tacticalNotes.proTip.split(".")[0];
    if (tip.length < 80) {
      bullets.push(tip);
    }
  }

  return bullets.slice(0, 3);
}

interface SuggestedUnitProps {
  stateId: string;
  speciesId: string;
}

export default function SuggestedUnit({ stateId, speciesId }: SuggestedUnitProps) {
  const recommended = useMemo(() => {
    const candidates = SAMPLE_UNITS.filter(
      (u) => u.stateId === stateId && u.speciesId === speciesId
    );
    if (candidates.length === 0) return null;

    const scored = candidates.map((unit) => ({
      unit,
      score: scoreUnit(unit),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored[0].unit;
  }, [stateId, speciesId]);

  const alternates = useMemo(() => {
    if (!recommended) return [];
    return findAlternateUnits(recommended, SAMPLE_UNITS, 3);
  }, [recommended]);

  if (!recommended) return null;

  const state = STATES_MAP[stateId];
  const bullets = buildWhyBullets(recommended);

  return (
    <Card className="bg-gradient-to-r from-primary/[0.03] to-chart-2/[0.03] border-primary/10 overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-primary shrink-0" />
          <span className="text-xs font-semibold text-primary uppercase tracking-wide">
            Recommended Unit
          </span>
        </div>

        {/* Unit info */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {state && (
                <div
                  className="w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                  style={{ backgroundColor: state.color }}
                >
                  {state.abbreviation}
                </div>
              )}
              <h4 className="text-sm font-semibold">
                Unit {recommended.unitCode}
                {recommended.unitName ? ` — ${recommended.unitName}` : ""}
              </h4>
            </div>

            {/* Key stats row */}
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-primary" />
                {Math.round(recommended.successRate * 100)}%
              </span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Trophy className="w-3 h-3 text-chart-2" />
                {recommended.trophyRating}/10
              </span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Target className="w-3 h-3 text-chart-4" />
                {recommended.pointsRequiredNonresident} pts
              </span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <TreePine className="w-3 h-3 text-chart-5" />
                {Math.round(recommended.publicLandPct * 100)}% pub
              </span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Users className="w-3 h-3" />
                {recommended.pressureLevel}
              </span>
            </div>

            {/* Why bullets */}
            <div className="space-y-1">
              {bullets.map((bullet, i) => (
                <p
                  key={i}
                  className="text-[11px] text-muted-foreground flex items-start gap-1.5"
                >
                  <Star className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                  <span>{bullet}</span>
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <Link href={`/units/${recommended.id}`}>
          <Button variant="outline" size="sm" className="gap-2 w-full">
            View Full Profile <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>

        {/* Alternates accordion */}
        {alternates.length > 0 && (
          <AlternateUnitsAccordion
            primaryUnit={recommended}
            alternates={alternates}
          />
        )}
      </CardContent>
    </Card>
  );
}
