"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Trophy,
  TrendingUp,
  Mountain,
  Users,
  Target,
  ArrowLeft,
  Crosshair,
  Tent,
  Binoculars,
  Radio,
  Droplets,
  Calendar,
  Timer,
  Star,
  Shield,
  TreePine,
} from "lucide-react";
import { SAMPLE_UNITS } from "@/lib/constants/sample-units";
import { STATES_MAP } from "@/lib/constants/states";
import { SPECIES_MAP } from "@/lib/constants/species";
import { findAlternateUnits } from "@/lib/engine/unit-alternates";
import UnitProfileHeader from "@/components/units/UnitProfileHeader";
import DrawTrendChart from "@/components/units/DrawTrendChart";
import UnitChangeNotes from "@/components/units/UnitChangeNotes";
import AlternateUnitsAccordion from "@/components/units/AlternateUnitsAccordion";

export default function UnitProfilePage() {
  const params = useParams();
  const unitId = params.unitId as string;

  const unit = useMemo(
    () => SAMPLE_UNITS.find((u) => u.id === unitId),
    [unitId]
  );

  const alternates = useMemo(() => {
    if (!unit) return [];
    return findAlternateUnits(unit, SAMPLE_UNITS, 5);
  }, [unit]);

  if (!unit) {
    return (
      <div className="p-6 space-y-6 fade-in-up">
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-destructive/50" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Unit Not Found</h2>
          <p className="text-sm text-muted-foreground mb-6">
            We couldn&apos;t find a unit with ID &ldquo;{unitId}&rdquo;.
          </p>
          <Link href="/units">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Units
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const state = STATES_MAP[unit.stateId];
  const species = SPECIES_MAP[unit.speciesId];
  const tn = unit.tacticalNotes;

  // Build score breakdown (simple composite for display)
  const scoreFactors = [
    {
      label: "Success Rate",
      value: Math.round(unit.successRate * 100),
      max: 100,
      icon: <TrendingUp className="w-3.5 h-3.5 text-primary" />,
      suffix: "%",
    },
    {
      label: "Trophy Rating",
      value: unit.trophyRating,
      max: 10,
      icon: <Trophy className="w-3.5 h-3.5 text-chart-2" />,
      suffix: "/10",
    },
    {
      label: "Public Land",
      value: Math.round(unit.publicLandPct * 100),
      max: 100,
      icon: <TreePine className="w-3.5 h-3.5 text-chart-5" />,
      suffix: "%",
    },
    {
      label: "Pressure",
      value:
        unit.pressureLevel === "Low"
          ? 90
          : unit.pressureLevel === "Moderate"
            ? 50
            : 20,
      max: 100,
      icon: <Users className="w-3.5 h-3.5 text-premium" />,
      suffix: "",
      display:
        unit.pressureLevel === "Low"
          ? "Low"
          : unit.pressureLevel === "Moderate"
            ? "Moderate"
            : "High",
    },
    {
      label: "Tag Quota (NR)",
      value: unit.tagQuotaNonresident,
      max: Math.max(unit.tagQuotaNonresident, 500),
      icon: <Target className="w-3.5 h-3.5 text-chart-4" />,
      suffix: " tags",
    },
    {
      label: "Points Needed (NR)",
      value: unit.pointsRequiredNonresident,
      max: 20,
      icon: <Shield className="w-3.5 h-3.5 text-info" />,
      suffix: " pts",
    },
  ];

  // Build draw history from unit.drawData for the chart
  const drawHistory = (unit.drawData ?? []).map((d) => ({
    year: d.year,
    applicants: d.applicants,
    tagsAvailable: d.tags,
    tagsIssued: null as number | null,
    oddsPercent: d.oddsPercent,
    minPointsDrawn: null as number | null,
  }));

  return (
    <div className="p-6 space-y-6 fade-in-up">
      {/* Back button */}
      <Link href="/units">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2">
          <ArrowLeft className="w-4 h-4" /> Back to Units
        </Button>
      </Link>

      {/* ================================================================ */}
      {/* Unit Header */}
      {/* ================================================================ */}
      <UnitProfileHeader unit={unit} state={state} species={species} />

      {/* ================================================================ */}
      {/* Key Stats Grid */}
      {/* ================================================================ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Success Rate
              </span>
            </div>
            <p className="text-2xl font-bold">
              {Math.round(unit.successRate * 100)}%
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Trophy className="w-3.5 h-3.5 text-chart-2" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Trophy Rating
              </span>
            </div>
            <p className="text-2xl font-bold">
              {unit.trophyRating}
              <span className="text-sm text-muted-foreground">/10</span>
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Target className="w-3.5 h-3.5 text-chart-4" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Points (NR)
              </span>
            </div>
            <p className="text-2xl font-bold">
              {unit.pointsRequiredNonresident}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="w-3.5 h-3.5 text-premium" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Pressure
              </span>
            </div>
            <p
              className={`text-2xl font-bold ${
                unit.pressureLevel === "Low"
                  ? "text-success"
                  : unit.pressureLevel === "Moderate"
                    ? "text-warning"
                    : "text-destructive"
              }`}
            >
              {unit.pressureLevel}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ================================================================ */}
        {/* Left Column: Details */}
        {/* ================================================================ */}
        <div className="lg:col-span-2 space-y-6">
          {/* Unit Overview */}
          {unit.notes && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-primary" />
                  Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{unit.notes}</p>
                <div className="flex flex-wrap gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <Mountain className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {unit.elevationRange[0].toLocaleString()}&ndash;
                      {unit.elevationRange[1].toLocaleString()} ft
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TreePine className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {Math.round(unit.publicLandPct * 100)}% public land
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {unit.terrainType.join(", ")}
                    </span>
                  </div>
                  {unit.nearestAirport && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {unit.nearestAirport}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Draw Trend Chart */}
          <DrawTrendChart drawHistory={drawHistory} />

          {/* Change Notes (renders nothing when empty) */}
          <UnitChangeNotes notes={[]} />

          {/* Tactical Notes */}
          {tn && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Binoculars className="w-4 h-4 text-primary" />
                  Tactical Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Access Method */}
                {tn.accessMethod && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Tent className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Access
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {tn.accessMethod}
                    </p>
                  </div>
                )}

                {/* Glassing Strategy */}
                {tn.glassingStrategy && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Binoculars className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Glassing Strategy
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {tn.glassingStrategy}
                    </p>
                  </div>
                )}

                {/* Camping */}
                {tn.campingOptions && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Tent className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Camping Options
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {tn.campingOptions}
                    </p>
                  </div>
                )}

                {/* Season / Timing */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {tn.bestSeasonTier && (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Best Season
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {tn.bestSeasonTier}
                      </p>
                    </div>
                  )}
                  {tn.bestArrivalDate && (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Best Arrival
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {tn.bestArrivalDate}
                      </p>
                    </div>
                  )}
                  {tn.typicalHuntLength && (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Timer className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Hunt Length
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {tn.typicalHuntLength}
                      </p>
                    </div>
                  )}
                </div>

                {/* Trophy Expectation */}
                {tn.trophyExpectation && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Trophy Expectation
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {tn.trophyExpectation}
                    </p>
                  </div>
                )}

                {/* Water Sources */}
                {tn.waterSources && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Droplets className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Water Sources
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {tn.waterSources}
                    </p>
                  </div>
                )}

                {/* Cell Service */}
                {tn.cellService && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Radio className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Cell Service
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {tn.cellService}
                    </p>
                  </div>
                )}

                {/* Pro Tip */}
                {tn.proTip && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="flex items-center gap-2 mb-1">
                      <Star className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                        Pro Tip
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {tn.proTip}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Alternate Units */}
          {alternates.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  Alternate Units
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Similar units with meaningful tradeoffs
                </p>
              </CardHeader>
              <CardContent>
                <AlternateUnitsAccordion
                  primaryUnit={unit}
                  alternates={alternates}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* ================================================================ */}
        {/* Right Sidebar: Score Breakdown */}
        {/* ================================================================ */}
        <div className="space-y-6">
          {/* Score Breakdown */}
          <Card className="bg-card border-border sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Score Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {scoreFactors.map((factor) => (
                <div key={factor.label}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      {factor.icon}
                      <span className="text-xs text-muted-foreground">
                        {factor.label}
                      </span>
                    </div>
                    <span className="text-xs font-semibold">
                      {"display" in factor && factor.display
                        ? factor.display
                        : `${factor.value}${factor.suffix}`}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-chart-2 transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          (factor.value / factor.max) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Travel Info */}
          {(unit.nearestAirport || unit.driveTimeFromAirport) && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Travel Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {unit.nearestAirport && (
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      Nearest Airport
                    </span>
                    <p className="text-sm text-foreground mt-0.5">
                      {unit.nearestAirport}
                    </p>
                  </div>
                )}
                {unit.driveTimeFromAirport && (
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      Drive Time
                    </span>
                    <p className="text-sm text-foreground mt-0.5">
                      {unit.driveTimeFromAirport}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Reference */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Quick Reference
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Resident Points</span>
                <span className="font-medium">
                  {unit.pointsRequiredResident}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">
                  Nonresident Points
                </span>
                <span className="font-medium">
                  {unit.pointsRequiredNonresident}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">NR Tag Quota</span>
                <span className="font-medium">
                  {unit.tagQuotaNonresident}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Elevation</span>
                <span className="font-medium">
                  {unit.elevationRange[0].toLocaleString()}&ndash;
                  {unit.elevationRange[1].toLocaleString()} ft
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Terrain</span>
                <span className="font-medium">
                  {unit.terrainType.join(", ")}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Public Land</span>
                <span className="font-medium">
                  {Math.round(unit.publicLandPct * 100)}%
                </span>
              </div>
              {state?.fgUrl && (
                <div className="pt-2">
                  <a
                    href={state.fgUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    {state.name} Fish &amp; Game website
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
