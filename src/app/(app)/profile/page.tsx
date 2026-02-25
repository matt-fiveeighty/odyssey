"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  User,
  Crosshair,
  Clock,
  DollarSign,
  Users,
  MapPin,
  Calendar,
  Shield,
  AlertTriangle,
  Check,
  ChevronRight,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useWizardStore, useAppStore } from "@/lib/store";
import type { WeaponType } from "@/lib/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WEAPON_OPTIONS: { value: WeaponType; label: string; icon: string; description: string }[] = [
  { value: "rifle", label: "Rifle", icon: "🎯", description: "Most versatile — maximizes season availability" },
  { value: "archery", label: "Archery", icon: "🏹", description: "Longer seasons, better odds in many states" },
  { value: "muzzleloader", label: "Muzzleloader", icon: "💨", description: "Niche seasons with reduced competition" },
];

const HORIZON_PRESETS = [5, 10, 15, 20, 25];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProfilePage() {
  const {
    planForName,
    planForAge,
    homeState,
    homeCity,
    planningHorizon,
    physicalHorizon,
    weaponType,
    partySize,
    capitalFloatTolerance,
    huntDaysPerYear,
    experienceLevel,
    setAnchorField,
    setField,
  } = useWizardStore();

  const { fiduciaryAlerts, dismissFiduciaryAlert } = useAppStore();

  // Profile-related alerts only
  const profileAlerts = useMemo(
    () => fiduciaryAlerts.filter((a) => a.eventType === "profile_change"),
    [fiduciaryAlerts],
  );

  // Track which field was last changed for confirmation animation
  const [lastChanged, setLastChanged] = useState<string | null>(null);

  const handleAnchorChange = (field: "physicalHorizon" | "weaponType" | "capitalFloatTolerance" | "partySize" | "planningHorizon", value: unknown) => {
    setAnchorField(field, value);
    setLastChanged(field);
    setTimeout(() => setLastChanged(null), 2000);
  };

  const displayName = planForName || "Hunter";
  const currentYear = new Date().getFullYear();

  return (
    <div className="p-4 md:p-6 space-y-6 fade-in-up max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <User className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Hunter Profile</h1>
          <p className="text-sm text-muted-foreground">
            Permanent anchor variables. Changes here trigger a strategy recalculation.
          </p>
        </div>
      </div>

      {/* Cascade Alert Banner */}
      {profileAlerts.length > 0 && (
        <div className="space-y-2">
          {profileAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3 rounded-xl border flex items-start gap-3 ${
                alert.severity === "critical"
                  ? "border-destructive/30 bg-destructive/5"
                  : alert.severity === "warning"
                    ? "border-chart-4/30 bg-chart-4/5"
                    : "border-primary/20 bg-primary/5"
              }`}
            >
              <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${
                alert.severity === "critical" ? "text-destructive" : "text-chart-4"
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{alert.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                {alert.recommendation && (
                  <p className="text-xs text-muted-foreground/70 mt-1 italic">{alert.recommendation}</p>
                )}
              </div>
              <button
                onClick={() => dismissFiduciaryAlert(alert.id)}
                className="text-xs text-muted-foreground/50 hover:text-muted-foreground shrink-0"
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ================================================================ */}
      {/* IDENTITY SECTION                                                  */}
      {/* ================================================================ */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary/50 to-primary/10" />
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            <User className="w-4 h-4" />
            Identity
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground/70 uppercase tracking-wider">Name</label>
              <p className="text-sm font-medium mt-0.5">{displayName}</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground/70 uppercase tracking-wider">Age</label>
              <p className="text-sm font-medium mt-0.5">{planForAge ?? "Not specified"}</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground/70 uppercase tracking-wider">Home</label>
              <div className="flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground/50" />
                <span className="text-sm font-medium">
                  {homeCity ? `${homeCity}, ${homeState}` : homeState || "Not set"}
                </span>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground/70 uppercase tracking-wider">Experience</label>
              <p className="text-sm font-medium mt-0.5">
                {experienceLevel === "veteran" ? "Veteran (3+ trips)" :
                 experienceLevel === "3_5_trips" ? "Experienced (3-5 trips)" :
                 experienceLevel === "1_2_trips" ? "Getting Started (1-2 trips)" :
                 experienceLevel === "never_hunted_west" ? "First-Timer" :
                 "Not specified"}
              </p>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground/50">
            Identity fields are set during consultation. Edit via{" "}
            <Link href="/plan-builder" className="text-primary hover:underline">Plan Builder</Link>.
          </p>
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* ANCHOR VARIABLES — Changes trigger Endless Loop                   */}
      {/* ================================================================ */}
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Zap className="w-4 h-4 text-chart-4" />
          Fiduciary Anchors
        </h2>
        <p className="text-xs text-muted-foreground/60">
          Changes to these fields instantly trigger a strategy recalculation across your entire roadmap.
        </p>
      </div>

      {/* Planning Horizon */}
      <Card className={`bg-card border-border overflow-hidden transition-all ${lastChanged === "planningHorizon" ? "ring-2 ring-primary/30" : ""}`}>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-chart-4" />
              <span className="text-sm font-semibold">Planning Horizon</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold text-chart-4">{planningHorizon}</span>
              <span className="text-xs text-muted-foreground">years</span>
              {lastChanged === "planningHorizon" && (
                <Check className="w-4 h-4 text-chart-2 animate-pulse" />
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground/70">
            How many years forward your roadmap projects. Reducing this prunes long-term positions.
          </p>
          <div className="flex gap-2">
            {HORIZON_PRESETS.map((yr) => (
              <button
                key={yr}
                onClick={() => handleAnchorChange("planningHorizon", yr)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  planningHorizon === yr
                    ? "bg-chart-4/15 text-chart-4 ring-1 ring-chart-4/30"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                }`}
              >
                {yr}yr
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Physical Horizon */}
      <Card className={`bg-card border-border overflow-hidden transition-all ${lastChanged === "physicalHorizon" ? "ring-2 ring-primary/30" : ""}`}>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold">Physical Horizon</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold text-amber-500">
                {physicalHorizon ?? "—"}
              </span>
              <span className="text-xs text-muted-foreground">years</span>
              {lastChanged === "physicalHorizon" && (
                <Check className="w-4 h-4 text-chart-2 animate-pulse" />
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground/70">
            How many years you can physically handle extreme backcountry hunts (high-alpine, multi-day pack-in).
            Shortening this triggers a Cascading Prune on your roadmap.
          </p>
          <Slider
            value={[physicalHorizon ?? 20]}
            onValueCommit={(vals: number[]) => handleAnchorChange("physicalHorizon", vals[0])}
            min={1}
            max={30}
            step={1}
            className="py-2"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground/50">
            <span>1 year</span>
            <span>{physicalHorizon ? `Cutoff: ${currentYear + physicalHorizon}` : "Not set"}</span>
            <span>30 years</span>
          </div>
        </CardContent>
      </Card>

      {/* Target Weapon */}
      <Card className={`bg-card border-border overflow-hidden transition-all ${lastChanged === "weaponType" ? "ring-2 ring-primary/30" : ""}`}>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Target Weapon</span>
            </div>
            {lastChanged === "weaponType" && (
              <Check className="w-4 h-4 text-chart-2 animate-pulse" />
            )}
          </div>
          <p className="text-xs text-muted-foreground/70">
            Weapon type affects season availability, draw odds, and unit selection.
            Changing this signals a full strategy rebuild.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {WEAPON_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleAnchorChange("weaponType", opt.value)}
                className={`p-3 rounded-xl text-center transition-all ${
                  weaponType === opt.value
                    ? "bg-primary/10 ring-1 ring-primary/30"
                    : "bg-secondary/30 hover:bg-secondary/50"
                }`}
              >
                <span className="text-xl block mb-1">{opt.icon}</span>
                <span className={`text-xs font-semibold block ${
                  weaponType === opt.value ? "text-primary" : "text-muted-foreground"
                }`}>
                  {opt.label}
                </span>
                <span className="text-[10px] text-muted-foreground/60 block mt-0.5 leading-tight">
                  {opt.description}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Capital Float Tolerance */}
      <Card className={`bg-card border-border overflow-hidden transition-all ${lastChanged === "capitalFloatTolerance" ? "ring-2 ring-primary/30" : ""}`}>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold">Capital Float Tolerance</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold text-amber-500">
                ${capitalFloatTolerance.toLocaleString()}
              </span>
              {lastChanged === "capitalFloatTolerance" && (
                <Check className="w-4 h-4 text-chart-2 animate-pulse" />
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground/70">
            Maximum cash you can float for upfront tag fees (NM, ID, WY charge before the draw).
            Reducing this triggers a liquidity bottleneck recheck.
          </p>
          <Slider
            value={[capitalFloatTolerance]}
            onValueCommit={(vals: number[]) => handleAnchorChange("capitalFloatTolerance", vals[0])}
            min={0}
            max={10000}
            step={250}
            className="py-2"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground/50">
            <span>$0</span>
            <span>${capitalFloatTolerance.toLocaleString()}</span>
            <span>$10,000</span>
          </div>
        </CardContent>
      </Card>

      {/* Party Size */}
      <Card className={`bg-card border-border overflow-hidden transition-all ${lastChanged === "partySize" ? "ring-2 ring-primary/30" : ""}`}>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-chart-5" />
              <span className="text-sm font-semibold">Default Party Size</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold text-chart-5">{partySize}</span>
              <span className="text-xs text-muted-foreground">
                {partySize === 1 ? "solo" : "hunters"}
              </span>
              {lastChanged === "partySize" && (
                <Check className="w-4 h-4 text-chart-2 animate-pulse" />
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground/70">
            Group applications average party members&apos; points. State rounding rules (floor vs exact)
            can significantly affect your draw position.
          </p>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => handleAnchorChange("partySize", n)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  partySize === n
                    ? "bg-chart-5/15 text-chart-5 ring-1 ring-chart-5/30"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                }`}
              >
                {n === 1 ? "Solo" : `${n}`}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Hunt Days Per Year */}
      <Card className="bg-card border-border overflow-hidden">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Available Hunt Days</span>
            </div>
            <span className="text-lg font-bold text-muted-foreground">
              {huntDaysPerYear || "—"} <span className="text-xs font-normal">days/yr</span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground/70">
            PTO / available days per year for hunting trips. Used for schedule conflict detection.
          </p>
          <Slider
            value={[huntDaysPerYear || 14]}
            onValueCommit={(vals: number[]) => setField("huntDaysPerYear", vals[0])}
            min={0}
            max={60}
            step={1}
            className="py-2"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground/50">
            <span>0 days</span>
            <span>{huntDaysPerYear || 14} days</span>
            <span>60 days</span>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* QUICK LINKS                                                       */}
      {/* ================================================================ */}
      <Separator />
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Strategy Links
        </h2>
        <div className="grid sm:grid-cols-2 gap-2">
          {[
            { label: "Roadmap", href: "/roadmap", icon: <Shield className="w-4 h-4" />, description: "View your multi-year strategy" },
            { label: "Rebalance", href: "/rebalance", icon: <Crosshair className="w-4 h-4" />, description: "Draw results and adjustments" },
            { label: "Budget", href: "/budget", icon: <DollarSign className="w-4 h-4" />, description: "Capital allocation breakdown" },
            { label: "Plan Builder", href: "/plan-builder", icon: <Zap className="w-4 h-4" />, description: "Rebuild full strategy" },
          ].map((link) => (
            <Link key={link.href} href={link.href}>
              <div className="p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors flex items-center gap-3 cursor-pointer">
                <div className="text-muted-foreground/60">{link.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{link.label}</p>
                  <p className="text-[10px] text-muted-foreground/50">{link.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
