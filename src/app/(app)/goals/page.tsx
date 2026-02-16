"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Target,
  Plus,
  Trash2,
  X,
  Crosshair,
  Clock,
  Star,
  MapPin,
  ExternalLink,
  Check,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { STATES, STATES_MAP } from "@/lib/constants/states";
import { SPECIES, SPECIES_MAP } from "@/lib/constants/species";
import { SAMPLE_UNITS } from "@/lib/constants/sample-units";
import { useAppStore, useWizardStore } from "@/lib/store";
import { calculateDrawOdds } from "@/lib/engine/draw-odds";
import { estimateCreepRate, yearsToDrawWithCreep } from "@/lib/engine/point-creep";
import { generateMilestonesForGoal } from "@/lib/engine/roadmap-generator";
import type { GoalStatus, WeaponType, SeasonPreference, HuntStyle, DreamHuntTier } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";

const currentYear = new Date().getFullYear();
const ROADMAP_YEARS = Array.from({ length: 10 }, (_, i) => currentYear + i);

const STATUS_STYLES: Record<GoalStatus, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-primary/15", text: "text-primary", label: "Active" },
  dream: { bg: "bg-chart-4/15", text: "text-chart-4", label: "Dream" },
  completed: { bg: "bg-chart-2/15", text: "text-chart-2", label: "Completed" },
};

const WEAPON_OPTIONS: { value: WeaponType; label: string }[] = [
  { value: "archery", label: "Archery" },
  { value: "rifle", label: "Rifle" },
  { value: "muzzleloader", label: "Muzzleloader" },
];

const SEASON_OPTIONS: { value: SeasonPreference; label: string }[] = [
  { value: "early", label: "Early" },
  { value: "mid", label: "Mid" },
  { value: "late", label: "Late" },
  { value: "any", label: "Any" },
];

const HUNT_STYLE_OPTIONS: { value: HuntStyle; label: string }[] = [
  { value: "diy_backpack", label: "DIY Backpack" },
  { value: "diy_truck", label: "DIY Truck" },
  { value: "guided", label: "Guided" },
  { value: "drop_camp", label: "Drop Camp" },
];

const DREAM_TIER_OPTIONS: { value: DreamHuntTier; label: string; desc: string; icon: string }[] = [
  { value: "attainable", label: "Attainable", desc: "Draw within 1-3 years", icon: "🎯" },
  { value: "bucket_list", label: "Bucket List", desc: "Worth the 3-7 year wait", icon: "📋" },
  { value: "trophy", label: "Trophy Hunt", desc: "Premium unit, premium animal", icon: "🏆" },
  { value: "once_in_a_lifetime", label: "Once-in-a-Lifetime", desc: "10+ years, one shot ever", icon: "⭐" },
];

const DREAM_TIER_STYLES: Record<DreamHuntTier, { bg: string; text: string; label: string }> = {
  attainable: { bg: "bg-chart-2/15", text: "text-chart-2", label: "Attainable" },
  bucket_list: { bg: "bg-chart-1/15", text: "text-chart-1", label: "Bucket List" },
  trophy: { bg: "bg-chart-4/15", text: "text-chart-4", label: "Trophy" },
  once_in_a_lifetime: { bg: "bg-primary/15", text: "text-primary", label: "Once-in-a-Lifetime" },
};

const HUNT_STYLE_LABELS: Record<string, string> = {
  diy_backpack: "DIY Backpack",
  diy_truck: "DIY Truck",
  guided: "Guided",
  drop_camp: "Drop Camp",
};

const WEAPON_LABELS: Record<string, string> = {
  archery: "Archery",
  rifle: "Rifle",
  muzzleloader: "Muzzy",
};

const TROPHY_PREFIX: Record<string, string> = {
  elk: "Bull",
  mule_deer: "Buck",
  whitetail: "Buck",
  bear: "",
  moose: "Bull",
  pronghorn: "Buck",
  bighorn_sheep: "Ram",
  mountain_goat: "Billy",
  bison: "Bull",
  mountain_lion: "Tom",
};

export default function GoalsPage() {
  const {
    userGoals, addUserGoal, updateUserGoal, removeUserGoal,
    milestones, completeMilestone, uncompleteMilestone, addMilestones,
    confirmedAssessment,
  } = useAppStore();
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "dream" | "completed">("all");

  // Backfill: generate milestones for existing goals that have none
  const backfilled = useRef(false);
  useEffect(() => {
    if (backfilled.current) return;
    backfilled.current = true;
    const goalIds = new Set(userGoals.map((g) => g.id));
    const goalMsIds = new Set(milestones.filter((m) => m.planId && goalIds.has(m.planId)).map((m) => m.planId));
    const goalsWithoutMs = userGoals.filter((g) => !goalMsIds.has(g.id));
    if (goalsWithoutMs.length > 0) {
      const newMs = goalsWithoutMs.flatMap((g) => generateMilestonesForGoal(g));
      if (newMs.length > 0) addMilestones(newMs);
    }
  }, [userGoals, milestones, addMilestones]);

  // Goal → Plan integration
  const hasGoalsNoStrategy = userGoals.length > 0 && !confirmedAssessment;
  function handleBuildFromGoals() {
    useWizardStore.getState().prefillFromGoals(userGoals);
    router.push("/plan-builder");
  }

  // Add modal state
  const [newStateId, setNewStateId] = useState("");
  const [newSpeciesId, setNewSpeciesId] = useState("elk");
  const [newWeaponType, setNewWeaponType] = useState<WeaponType | "">("");
  const [newSeasonPref, setNewSeasonPref] = useState<SeasonPreference>("any");
  const [newHuntStyle, setNewHuntStyle] = useState<HuntStyle | "">("");
  const [newTrophyDesc, setNewTrophyDesc] = useState("");
  const [newTargetYear, setNewTargetYear] = useState(currentYear + 3);
  const [newStatus, setNewStatus] = useState<GoalStatus>("active");
  const [newTitle, setNewTitle] = useState("");
  const [titleManuallyEdited, setTitleManuallyEdited] = useState(false);
  const [newUnitId, setNewUnitId] = useState("");
  const [newDreamTier, setNewDreamTier] = useState<DreamHuntTier | "">("");

  // Auto-generate title from selections
  const autoTitle = useMemo(() => {
    if (!newStateId || !newSpeciesId) return "";
    const state = STATES_MAP[newStateId];
    const species = SPECIES_MAP[newSpeciesId];
    if (!state || !species) return "";

    const prefix = TROPHY_PREFIX[newSpeciesId] ?? "";
    const parts: string[] = [
      state.abbreviation,
      prefix ? `${prefix} ${species.name}` : species.name,
    ];

    if (newWeaponType) parts.push(WEAPON_LABELS[newWeaponType] ?? newWeaponType);
    const seasonLabels: Record<string, string> = { early: "Early Season", mid: "Mid Season", late: "Late Season" };
    if (newSeasonPref && seasonLabels[newSeasonPref]) parts.push(seasonLabels[newSeasonPref]);

    const speciesPart = parts.slice(0, 2).join(" ");
    const detailPart = parts.slice(2).join(", ");
    return detailPart ? `${speciesPart} — ${detailPart}` : speciesPart;
  }, [newStateId, newSpeciesId, newWeaponType, newSeasonPref]);

  const displayTitle = titleManuallyEdited ? newTitle : autoTitle;

  // Smart unit suggestions — scored against ALL inputs including dream description
  const suggestedUnits = useMemo(() => {
    if (!newStateId || !newSpeciesId) return [];
    const candidates = SAMPLE_UNITS.filter(
      (u) => u.stateId === newStateId && u.speciesId === newSpeciesId
    );
    if (candidates.length === 0) return [];

    const dream = newTrophyDesc.toLowerCase();
    const dreamTokens = dream.split(/\s+/).filter(Boolean);

    const trophyKeywords = ["big", "giant", "trophy", "monster", "mature", "old", "crusty", "heavy", "wide", "deep", "tall", "record", "book", "boone", "pope", "6x6", "6x7", "7x7", "360", "380", "400"];
    const opportunityKeywords = ["first", "easy", "otc", "opportunity", "beginner", "meat", "experience", "any", "cow", "doe"];
    const wantsTrophy = dreamTokens.some((t) => trophyKeywords.includes(t));
    const wantsOpportunity = dreamTokens.some((t) => opportunityKeywords.includes(t));

    const scored = candidates.map((unit) => {
      let score = 0;
      const reasons: string[] = [];

      // Trophy vs opportunity intent
      if (wantsTrophy) {
        score += unit.trophyRating * 3;
        if (unit.trophyRating >= 7) reasons.push("High trophy potential matches your dream");
      } else if (wantsOpportunity) {
        score += unit.successRate * 30;
        score += (10 - unit.pointsRequiredNonresident) * 2;
        if (unit.successRate >= 0.25) reasons.push("Strong success rate for your first hunt");
      } else {
        score += unit.trophyRating * 2;
        score += unit.successRate * 15;
      }

      // Terrain from dream text
      const terrainMap: Record<string, string[]> = {
        timber: ["Timber"], dark: ["Timber"],
        alpine: ["Alpine"], mountain: ["Alpine"], high: ["Alpine"],
        desert: ["Desert"], sage: ["Sagebrush"], sagebrush: ["Sagebrush"],
        prairie: ["Prairie"], flat: ["Prairie"],
      };
      for (const token of dreamTokens) {
        const matched = terrainMap[token];
        if (matched && unit.terrainType.some((t) => matched.includes(t))) {
          score += 5;
          reasons.push(`${unit.terrainType.join("/")} terrain matches your "${token}" preference`);
          break;
        }
      }

      // Season alignment
      if (newSeasonPref !== "any" && unit.tacticalNotes?.bestSeasonTier) {
        const tier = unit.tacticalNotes.bestSeasonTier.toLowerCase();
        const match =
          (newSeasonPref === "early" && (tier.includes("archery") || tier.includes("1st"))) ||
          (newSeasonPref === "mid" && (tier.includes("2nd") || tier.includes("muzzle"))) ||
          (newSeasonPref === "late" && (tier.includes("3rd") || tier.includes("4th") || tier.includes("late")));
        if (match) {
          score += 4;
          reasons.push(`Best in ${unit.tacticalNotes.bestSeasonTier} — fits your ${newSeasonPref} season`);
        }
      }

      // Hunt style alignment
      if (newHuntStyle) {
        if (newHuntStyle === "diy_backpack" && unit.pressureLevel === "Low") {
          score += 3;
          reasons.push("Low pressure — ideal for DIY backpack");
        }
        if (newHuntStyle === "diy_truck" && unit.tacticalNotes?.accessMethod?.toLowerCase().includes("truck")) {
          score += 3;
          reasons.push("Truck-accessible for your style");
        }
        if ((newHuntStyle === "guided" || newHuntStyle === "drop_camp") && unit.trophyRating >= 7) {
          score += 2;
          reasons.push("Premium unit worth the outfitter investment");
        }
      }

      // Public land bonus for DIY
      if ((newHuntStyle === "diy_backpack" || newHuntStyle === "diy_truck") && unit.publicLandPct >= 0.5) {
        score += 2;
        reasons.push(`${Math.round(unit.publicLandPct * 100)}% public land`);
      }

      if (unit.pressureLevel === "Low") score += 2;

      // Trophy expectation from tactical notes matching dream
      if (unit.tacticalNotes?.trophyExpectation && dream) {
        const expectation = unit.tacticalNotes.trophyExpectation.toLowerCase();
        if (dreamTokens.some((t) => expectation.includes(t))) {
          score += 3;
          reasons.push(unit.tacticalNotes.trophyExpectation.split(".")[0]);
        }
      }

      // Fallback reason
      if (reasons.length === 0) {
        if (unit.trophyRating >= 7) reasons.push(`Trophy ${unit.trophyRating}/10 — quality opportunity`);
        else if (unit.successRate >= 0.25) reasons.push(`${Math.round(unit.successRate * 100)}% success rate — solid odds`);
        else reasons.push(`${unit.pointsRequiredNonresident} pts to draw — ${unit.pointsRequiredNonresident <= 2 ? "accessible" : "worth the wait"}`);
      }

      return { unit, score, reasons };
    });

    return scored.sort((a, b) => b.score - a.score).slice(0, 3);
  }, [newStateId, newSpeciesId, newTrophyDesc, newSeasonPref, newHuntStyle]);

  // Filter milestones
  const filteredMilestones = milestones.filter(m => {
    if (filter === "all") return true;
    if (filter === "active") return !m.completed;
    if (filter === "completed") return m.completed;
    return true;
  });

  const completedCount = milestones.filter(m => m.completed).length;
  const totalCost = milestones.reduce((s, m) => s + m.totalCost, 0);
  const completedCost = milestones.filter(m => m.completed).reduce((s, m) => s + m.totalCost, 0);

  // Dream hunts from confirmed assessment
  const dreamHunts = confirmedAssessment?.dreamHuntRecommendations ?? [];

  // Build roadmap from goals
  const roadmapData = ROADMAP_YEARS.map((year) => {
    const goalsThisYear = userGoals.filter((g) => g.targetYear === year || g.projectedDrawYear === year);
    const milestonesThisYear = milestones.filter(m => m.year === year);
    const isHuntYear = confirmedAssessment?.roadmap.find(r => r.year === year)?.isHuntYear ?? false;
    const yearCost = confirmedAssessment?.roadmap.find(r => r.year === year)?.estimatedCost ?? 0;
    return { year, goals: goalsThisYear, milestones: milestonesThisYear, isHuntYear, yearCost };
  });

  function resetModal() {
    setShowAddModal(false);
    setNewTitle("");
    setNewStateId("");
    setNewSpeciesId("elk");
    setNewWeaponType("");
    setNewSeasonPref("any");
    setNewHuntStyle("");
    setNewTrophyDesc("");
    setNewTargetYear(currentYear + 3);
    setNewStatus("active");
    setTitleManuallyEdited(false);
    setNewUnitId("");
    setNewDreamTier("");
  }

  function handleAdd() {
    const finalTitle = titleManuallyEdited ? newTitle : autoTitle;
    if (!finalTitle || !newStateId) return;

    const selectedUnit = newUnitId ? SAMPLE_UNITS.find(u => u.id === newUnitId) : null;
    const units = SAMPLE_UNITS.filter((u) => u.stateId === newStateId && u.speciesId === newSpeciesId);
    const bestUnit = selectedUnit ?? units[0];
    let projectedDrawYear = newTargetYear;
    if (bestUnit) {
      calculateDrawOdds({ stateId: newStateId, userPoints: 0, unit: bestUnit });
      const creepRate = estimateCreepRate(bestUnit.trophyRating);
      const years = yearsToDrawWithCreep(0, bestUnit.pointsRequiredNonresident, creepRate);
      projectedDrawYear = currentYear + years;
    }
    addUserGoal({
      id: crypto.randomUUID(),
      userId: "local",
      title: finalTitle,
      speciesId: newSpeciesId,
      stateId: newStateId,
      unitId: newUnitId || undefined,
      targetYear: newTargetYear,
      projectedDrawYear,
      status: newStatus,
      milestones: [],
      ...(newWeaponType ? { weaponType: newWeaponType as WeaponType } : {}),
      ...(newSeasonPref ? { seasonPreference: newSeasonPref as SeasonPreference } : {}),
      ...(newHuntStyle ? { huntStyle: newHuntStyle as HuntStyle } : {}),
      ...(newTrophyDesc.trim() ? { trophyDescription: newTrophyDesc.trim() } : {}),
      ...(newDreamTier ? { dreamTier: newDreamTier as DreamHuntTier } : {}),
    });
    resetModal();
  }

  // If we have milestones from a confirmed plan, show milestone-first layout
  const hasMilestones = milestones.length > 0;

  return (
    <div className="p-6 space-y-6 fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" />
            {hasMilestones ? `${currentYear} Action Plan` : "Goals & Roadmap"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {hasMilestones
              ? `${completedCount} of ${milestones.length} completed · $${completedCost.toLocaleString()} of $${totalCost.toLocaleString()} spent`
              : "Set hunt goals and visualize your strategic roadmap"}
          </p>
        </div>
        <div className="flex gap-2">
          {!hasMilestones && (
            <Link href="/plan-builder">
              <Button variant="outline" size="sm" className="gap-2">
                <Crosshair className="w-4 h-4" />
                Build a Plan
              </Button>
            </Link>
          )}
          <Button onClick={() => setShowAddModal(true)} className="gap-2" size="sm">
            <Plus className="w-4 h-4" /> Add Goal
          </Button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* GOAL → PLAN INTEGRATION CTA */}
      {/* ================================================================ */}
      {hasGoalsNoStrategy && (
        <Card className="bg-gradient-to-r from-primary/5 via-chart-2/5 to-chart-4/5 border-primary/20 overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <Crosshair className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm">
                  Turn {userGoals.length} goal{userGoals.length > 1 ? "s" : ""} into a full strategy
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  We&apos;ll pre-fill the consultation with your {[...new Set(userGoals.map(g => g.speciesId))].length} species,
                  {userGoals.some(g => g.huntStyle) ? " hunt style," : ""}
                  {userGoals.some(g => g.trophyDescription) ? " dream descriptions," : ""}
                  {" "}and build a 10-year roadmap with timelines, costs, and milestones.
                </p>
              </div>
              <Button onClick={handleBuildFromGoals} className="gap-2 shrink-0">
                Build Strategy <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================================================================ */}
      {/* MILESTONE-FIRST LAYOUT (from confirmed plan) */}
      {/* ================================================================ */}
      {hasMilestones && (
        <>
          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{completedCount} completed</span>
              <span>{milestones.length - completedCount} remaining</span>
            </div>
            <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-chart-2 transition-all" style={{ width: `${milestones.length > 0 ? (completedCount / milestones.length) * 100 : 0}%` }} />
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            {(["all", "active", "completed"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}>
                {f === "all" ? `All (${milestones.length})` : f === "active" ? `Active (${milestones.length - completedCount})` : `Done (${completedCount})`}
              </button>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Milestone Cards */}
            <div className="lg:col-span-2 space-y-3">
              {filteredMilestones.length === 0 ? (
                <Card className="bg-card border-border">
                  <CardContent className="p-8 text-center">
                    <Check className="w-12 h-12 text-chart-2 mx-auto mb-3" />
                    <h3 className="font-semibold">All done!</h3>
                    <p className="text-sm text-muted-foreground">Every milestone for this filter is completed.</p>
                  </CardContent>
                </Card>
              ) : (
                filteredMilestones.map((milestone) => {
                  const state = STATES_MAP[milestone.stateId];
                  return (
                    <Card key={milestone.id} className={`bg-card border-border transition-all ${milestone.completed ? "opacity-60" : "hover:border-primary/20"}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <button
                            onClick={() => milestone.completed ? uncompleteMilestone(milestone.id) : completeMilestone(milestone.id)}
                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                              milestone.completed ? "bg-chart-2 border-chart-2" : "border-border hover:border-primary"
                            }`}
                          >
                            {milestone.completed && <Check className="w-3.5 h-3.5 text-white" />}
                          </button>

                          <div className="flex-1 min-w-0">
                            {/* Title row */}
                            <div className="flex items-center gap-2 mb-1">
                              {state && (
                                <div className="w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ backgroundColor: state.color }}>
                                  {state.abbreviation}
                                </div>
                              )}
                              {milestone.planId && userGoals.some((g) => g.id === milestone.planId) && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-chart-4/15 text-chart-4 shrink-0">
                                  Goal
                                </span>
                              )}
                              <h3 className={`font-semibold text-sm ${milestone.completed ? "line-through text-muted-foreground" : ""}`}>
                                {milestone.title}
                              </h3>
                            </div>

                            {/* Description */}
                            <p className="text-xs text-muted-foreground mb-2">{milestone.description}</p>

                            {/* Due date & draw result */}
                            <div className="flex items-center gap-4 mb-2">
                              {milestone.dueDate && (
                                <span className={`text-xs flex items-center gap-1 ${
                                  new Date(milestone.dueDate) < new Date() && !milestone.completed
                                    ? "text-destructive font-medium"
                                    : "text-muted-foreground"
                                }`}>
                                  <Clock className="w-3 h-3" />
                                  Due: {new Date(milestone.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                </span>
                              )}
                              {milestone.drawResultDate && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Results: {new Date(milestone.drawResultDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </span>
                              )}
                              {milestone.completedAt && (
                                <span className="text-xs text-chart-2 flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  Done {new Date(milestone.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </span>
                              )}
                            </div>

                            {/* Application info */}
                            {milestone.applicationApproach && (
                              <div className="mb-2">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-medium">
                                  {milestone.applicationApproach === "per_unit" ? "Apply Per Unit" : milestone.applicationApproach === "per_state" ? "Apply Per State" : "Apply Per Region"}
                                </span>
                              </div>
                            )}

                            {/* Itemized costs */}
                            {milestone.costs.length > 0 && (
                              <div className="p-2.5 rounded-lg bg-secondary/50 mb-2">
                                <div className="space-y-1">
                                  {milestone.costs.map((cost, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground">{cost.label}</span>
                                      <span className="font-medium">${cost.amount}</span>
                                    </div>
                                  ))}
                                  <Separator className="my-1" />
                                  <div className="flex items-center justify-between text-xs font-semibold">
                                    <span>Total</span>
                                    <span className="text-primary">${milestone.totalCost}</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Action button */}
                            {milestone.url && !milestone.completed && (
                              <a href={milestone.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
                                <ExternalLink className="w-3 h-3" />
                                Go to {state?.name ?? ""} Fish & Game
                              </a>
                            )}

                            {/* Pro tip */}
                            {milestone.applicationTip && !milestone.completed && (
                              <div className="mt-2 p-2 rounded-lg bg-chart-1/5 border border-chart-1/10">
                                <p className="text-[10px] text-chart-1 font-medium">Pro tip: {milestone.applicationTip}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>

            {/* Right Sidebar: Year Timeline + Dream Hunts */}
            <div className="space-y-6">
              <Card className="bg-card border-border sticky top-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    10-Year Calendar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-border" />
                    <div className="space-y-1">
                      {roadmapData.map(({ year, isHuntYear, yearCost }) => {
                        const isCurrentYear = year === currentYear;
                        const phase = year - currentYear < 3 ? "building" : year - currentYear < 5 ? "burn" : year - currentYear === 5 ? "gap" : "trophy";
                        const phaseColors: Record<string, string> = { building: "bg-chart-1", burn: "bg-chart-2", gap: "bg-chart-3", trophy: "bg-primary" };

                        return (
                          <div key={year} className={`relative pl-9 py-2 rounded-lg transition-colors ${isCurrentYear ? "bg-primary/5" : ""}`}>
                            <div className={`absolute left-2 top-3 w-[14px] h-[14px] rounded-full border-2 border-background ${isCurrentYear ? "bg-primary ring-2 ring-primary/30" : isHuntYear ? "bg-chart-2" : "bg-muted"}`} />
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-mono ${isCurrentYear ? "font-bold text-primary" : "text-muted-foreground"}`}>{year}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium text-white ${phaseColors[phase]}`}>
                                  {phase === "building" ? "Build" : phase === "burn" ? "Burn" : phase === "gap" ? "Gap" : "Trophy"}
                                </span>
                                {isHuntYear && <Crosshair className="w-3 h-3 text-chart-2" />}
                              </div>
                              <span className="text-[10px] text-muted-foreground font-mono">${yearCost.toLocaleString()}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Separator className="my-4" />
                  <div className="grid grid-cols-2 gap-2">
                    {([["building", "Build (1-3)"], ["burn", "Burn (4-5)"], ["gap", "Gap (6)"], ["trophy", "Trophy (7-10)"]] as const).map(([phase, label]) => {
                      const colors: Record<string, string> = { building: "bg-chart-1", burn: "bg-chart-2", gap: "bg-chart-3", trophy: "bg-primary" };
                      return (
                        <div key={phase} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <div className={`w-2.5 h-2.5 rounded-sm ${colors[phase]}`} />{label}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Dream Hunts Section */}
              {dreamHunts.length > 0 && (
                <Card className="bg-card border-border border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Star className="w-4 h-4 text-chart-4" />
                      Dream Hunts
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">Discretionary — if you have extra $, invest here:</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {dreamHunts.map((dh) => (
                      <div key={dh.id} className="p-3 rounded-lg bg-secondary/30">
                        <h4 className="font-medium text-sm">{dh.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{dh.description}</p>
                        {dh.annualPointCost && <p className="text-xs text-chart-4 mt-1 font-medium">~${dh.annualPointCost}/yr</p>}
                        {dh.notes && <p className="text-[10px] text-muted-foreground mt-1">{dh.notes}</p>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </>
      )}

      {/* ================================================================ */}
      {/* FALLBACK: No milestones — show classic goals view */}
      {/* ================================================================ */}
      {!hasMilestones && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex gap-2">
              {(["all", "active", "dream", "completed"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}>
                  {f === "all" ? "All Goals" : f}
                </button>
              ))}
            </div>

            {userGoals.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Crosshair className="w-8 h-8 text-primary/50" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No goals set yet</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                    Build a strategic plan first, or add individual goals manually.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Link href="/plan-builder">
                      <Button className="gap-2"><Crosshair className="w-4 h-4" /> Build a Plan</Button>
                    </Link>
                    <Button variant="outline" onClick={() => setShowAddModal(true)} className="gap-2">
                      <Plus className="w-4 h-4" /> Add Goal
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {userGoals.filter(g => filter === "all" || g.status === filter).map((goal) => {
                  const state = STATES_MAP[goal.stateId];
                  const statusStyle = STATUS_STYLES[goal.status];
                  const attachedUnit = goal.unitId ? SAMPLE_UNITS.find(u => u.id === goal.unitId) : null;
                  return (
                    <Card key={goal.id} className="bg-card border-border hover:border-primary/20 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            {state && (
                              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5" style={{ backgroundColor: state.color }}>
                                {state.abbreviation}
                              </div>
                            )}
                            <div>
                              <h3 className="font-semibold text-sm">{goal.title}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground capitalize">{goal.speciesId.replace("_", " ")}</span>
                                <span className="text-muted-foreground">&middot;</span>
                                <span className="text-xs text-muted-foreground">{state?.name}</span>
                              </div>

                              {/* Detail badges */}
                              {(goal.weaponType || goal.seasonPreference || goal.huntStyle) && (
                                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                  {goal.weaponType && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">
                                      {WEAPON_LABELS[goal.weaponType] ?? goal.weaponType}
                                    </span>
                                  )}
                                  {goal.seasonPreference && goal.seasonPreference !== "any" && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium capitalize">
                                      {goal.seasonPreference} Season
                                    </span>
                                  )}
                                  {goal.huntStyle && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">
                                      {HUNT_STYLE_LABELS[goal.huntStyle] ?? goal.huntStyle}
                                    </span>
                                  )}
                                  {attachedUnit && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                      Unit {attachedUnit.unitCode}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Trophy description */}
                              {goal.trophyDescription && (
                                <p className="text-xs text-muted-foreground italic mt-1.5 line-clamp-1">
                                  &ldquo;{goal.trophyDescription}&rdquo;
                                </p>
                              )}

                              <div className="flex items-center gap-3 mt-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusStyle.bg} ${statusStyle.text}`}>{statusStyle.label}</span>
                                {goal.dreamTier && (
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${DREAM_TIER_STYLES[goal.dreamTier].bg} ${DREAM_TIER_STYLES[goal.dreamTier].text}`}>
                                    {DREAM_TIER_STYLES[goal.dreamTier].label}
                                  </span>
                                )}
                                <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Target: {goal.targetYear}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {goal.status !== "completed" && (
                              <button onClick={() => updateUserGoal(goal.id, { status: goal.status === "active" ? "completed" : "active" })} className="w-7 h-7 rounded bg-secondary flex items-center justify-center hover:bg-chart-2/15 hover:text-chart-2 transition-colors" title="Mark complete">
                                <Star className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button onClick={() => removeUserGoal(goal.id)} className="w-7 h-7 rounded bg-secondary flex items-center justify-center hover:bg-destructive/15 hover:text-destructive transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Timeline */}
          <Card className="bg-card border-border sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" /> 10-Year Roadmap
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-border" />
                <div className="space-y-1">
                  {roadmapData.map(({ year }) => {
                    const isCurrentYear = year === currentYear;
                    const phase = year - currentYear < 3 ? "building" : year - currentYear < 5 ? "burn" : year - currentYear === 5 ? "gap" : "trophy";
                    const phaseColors: Record<string, string> = { building: "bg-chart-1", burn: "bg-chart-2", gap: "bg-chart-3", trophy: "bg-primary" };
                    return (
                      <div key={year} className={`relative pl-9 py-2 rounded-lg ${isCurrentYear ? "bg-primary/5" : ""}`}>
                        <div className={`absolute left-2 top-3 w-[14px] h-[14px] rounded-full border-2 border-background ${isCurrentYear ? "bg-primary" : "bg-muted"}`} />
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-mono ${isCurrentYear ? "font-bold text-primary" : "text-muted-foreground"}`}>{year}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium text-white ${phaseColors[phase]}`}>
                            {phase === "building" ? "Build" : phase === "burn" ? "Burn" : phase === "gap" ? "Gap" : "Trophy"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ================================================================ */}
      {/* ADD GOAL MODAL */}
      {/* ================================================================ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm modal-overlay" onClick={resetModal} />
          <Card role="dialog" aria-modal="true" aria-labelledby="goals-dialog-title" className="relative z-10 w-full max-w-lg bg-card border-border shadow-2xl max-h-[90vh] flex flex-col modal-content">
            <CardHeader className="flex flex-row items-center justify-between pb-3 shrink-0">
              <CardTitle id="goals-dialog-title" className="text-base">Add Hunt Goal</CardTitle>
              <button onClick={resetModal} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-accent"><X className="w-4 h-4" /></button>
            </CardHeader>
            <CardContent className="space-y-5 overflow-y-auto">
              {/* State */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">State</label>
                <div className="grid grid-cols-5 gap-2">
                  {STATES.map((s) => (
                    <button key={s.id} onClick={() => { setNewStateId(s.id); setNewUnitId(""); const avail = s.availableSpecies; if (!avail.includes(newSpeciesId)) setNewSpeciesId(avail[0] ?? "elk"); }} className={`p-2 rounded-lg border text-xs font-bold transition-all ${newStateId === s.id ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border bg-secondary/50 hover:border-primary/30"}`}>
                      <div className="w-6 h-6 rounded mx-auto mb-1 flex items-center justify-center text-[10px] text-white" style={{ backgroundColor: s.color }}>{s.abbreviation}</div>
                      {s.abbreviation}
                    </button>
                  ))}
                </div>
              </div>

              {/* Species — filtered by state availability */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Species</label>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const state = newStateId ? STATES_MAP[newStateId] : null;
                    const available = state ? SPECIES.filter((sp) => state.availableSpecies.includes(sp.id)) : SPECIES;
                    return available.map((sp) => (
                      <button key={sp.id} onClick={() => { setNewSpeciesId(sp.id); setNewUnitId(""); }} className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${newSpeciesId === sp.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}>
                        {sp.name}
                      </button>
                    ));
                  })()}
                </div>
                {newStateId && (
                  <p className="text-[10px] text-muted-foreground mt-1">{STATES_MAP[newStateId]?.name} offers {STATES_MAP[newStateId]?.availableSpecies.length} species</p>
                )}
              </div>

              {/* Weapon Type */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Weapon</label>
                <div className="flex flex-wrap gap-2">
                  {WEAPON_OPTIONS.map((opt) => (
                    <button key={opt.value} onClick={() => setNewWeaponType(newWeaponType === opt.value ? "" : opt.value)} className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${newWeaponType === opt.value ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Season Preference */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Season</label>
                <div className="flex flex-wrap gap-2">
                  {SEASON_OPTIONS.map((opt) => (
                    <button key={opt.value} onClick={() => setNewSeasonPref(newSeasonPref === opt.value ? "any" : opt.value)} className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${newSeasonPref === opt.value ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hunt Style */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Hunt Style</label>
                <div className="flex flex-wrap gap-2">
                  {HUNT_STYLE_OPTIONS.map((opt) => (
                    <button key={opt.value} onClick={() => setNewHuntStyle(newHuntStyle === opt.value ? "" : opt.value)} className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${newHuntStyle === opt.value ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dream Hunt Tier */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Hunt Tier</label>
                <div className="grid grid-cols-2 gap-2">
                  {DREAM_TIER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setNewDreamTier(newDreamTier === opt.value ? "" : opt.value)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        newDreamTier === opt.value
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border bg-secondary/30 hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm">{opt.icon}</span>
                        <span className="text-xs font-semibold">{opt.label}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Trophy Description */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">The Dream</label>
                <textarea
                  value={newTrophyDesc}
                  onChange={(e) => setNewTrophyDesc(e.target.value.slice(0, 200))}
                  maxLength={200}
                  rows={2}
                  placeholder="Big ol crusty 6x6 bull, dark timber, bugling in your face..."
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
                <p className="text-[10px] text-muted-foreground mt-1 text-right">{newTrophyDesc.length}/200</p>
              </div>

              {/* AI-Matched Units — scored against all inputs */}
              {suggestedUnits.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Recommended Units</label>
                  <p className="text-[10px] text-muted-foreground mb-3">Matched to your species, style, season{newTrophyDesc.trim() ? ", and dream" : ""}</p>
                  <div className="space-y-2">
                    {suggestedUnits.map(({ unit, reasons }) => (
                      <button
                        key={unit.id}
                        onClick={() => setNewUnitId(newUnitId === unit.id ? "" : unit.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${newUnitId === unit.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-secondary/30 hover:border-primary/30"}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">Unit {unit.unitCode}</span>
                            {unit.unitName && <span className="text-xs text-muted-foreground">{unit.unitName}</span>}
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[10px] text-muted-foreground">
                              {Math.round(unit.successRate * 100)}%
                            </span>
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 10 }, (_, i) => (
                                <div key={i} className={`w-1 h-3 rounded-sm ${i < unit.trophyRating ? "bg-primary" : "bg-secondary"}`} />
                              ))}
                            </div>
                          </div>
                        </div>
                        {/* Why this unit — AI reasoning */}
                        <div className="space-y-0.5 mt-1.5">
                          {reasons.slice(0, 2).map((reason, i) => (
                            <p key={i} className="text-[10px] text-primary/80 flex items-start gap-1.5">
                              <span className="text-primary mt-px shrink-0">&#x2192;</span>
                              <span>{reason}</span>
                            </p>
                          ))}
                        </div>
                        {/* Stats row */}
                        <div className="flex items-center gap-3 mt-2 pt-1.5 border-t border-border/50">
                          <span className="text-[9px] text-muted-foreground">{unit.pointsRequiredNonresident} pts NR</span>
                          <span className="text-[9px] text-muted-foreground">{unit.pressureLevel} pressure</span>
                          <span className="text-[9px] text-muted-foreground">{Math.round(unit.publicLandPct * 100)}% public</span>
                          {unit.terrainType.length > 0 && (
                            <span className="text-[9px] text-muted-foreground">{unit.terrainType.join("/")}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Target Year */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Target Year</label>
                <div className="flex items-center gap-3 justify-center">
                  <button onClick={() => setNewTargetYear(Math.max(currentYear, newTargetYear - 1))} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-lg font-bold hover:bg-accent transition-colors">-</button>
                  <span className="w-20 text-center text-2xl font-bold font-mono">{newTargetYear}</span>
                  <button onClick={() => setNewTargetYear(Math.min(currentYear + 15, newTargetYear + 1))} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-lg font-bold hover:bg-accent transition-colors">+</button>
                </div>
              </div>

              {/* Auto-title preview */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Goal Title</label>
                <input
                  type="text"
                  value={displayTitle}
                  onChange={(e) => { setNewTitle(e.target.value.slice(0, 100)); setTitleManuallyEdited(true); }}
                  maxLength={100}
                  placeholder="Auto-generated from your selections"
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {!titleManuallyEdited && autoTitle && (
                  <p className="text-[10px] text-muted-foreground mt-1">Auto-generated. Edit to customize.</p>
                )}
              </div>

              <Button onClick={handleAdd} className="w-full" disabled={!displayTitle || !newStateId}>Add Goal</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
