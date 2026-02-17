"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useFocusTrap } from "@/lib/hooks/use-focus-trap";
import {
  Wallet,
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  ExternalLink,
  X,
  Check,
  DollarSign,
  Calendar,
} from "lucide-react";
import { STATES, STATES_MAP } from "@/lib/constants/states";
import { SPECIES } from "@/lib/constants/species";
import { useAppStore } from "@/lib/store";
import { HuntingTerm } from "@/components/shared/HuntingTerm";
import { pointsFormSchema } from "@/lib/validations";
import type { UserPoints } from "@/lib/types";

export default function PointsPage() {
  const { userPoints, addUserPoint, updateUserPoint, removeUserPoint } =
    useAppStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const modalRef = useFocusTrap<HTMLDivElement>(showAddModal);

  // Add modal state
  const [newStateId, setNewStateId] = useState("");
  const [newSpeciesId, setNewSpeciesId] = useState("");
  const [newPoints, setNewPoints] = useState(0);
  const [newPointType, setNewPointType] = useState<"preference" | "bonus">(
    "preference"
  );
  const [newYearStarted, setNewYearStarted] = useState(new Date().getFullYear());

  // Edit state
  const [editPoints, setEditPoints] = useState(0);

  // Group points by state
  const pointsByState = userPoints.reduce(
    (acc, pt) => {
      if (!acc[pt.stateId]) acc[pt.stateId] = [];
      acc[pt.stateId].push(pt);
      return acc;
    },
    {} as Record<string, UserPoints[]>
  );

  // Summary stats
  const totalPoints = userPoints.reduce((sum, p) => sum + p.points, 0);
  const totalStates = new Set(userPoints.map((p) => p.stateId)).size;
  const totalInvested = userPoints.reduce((sum, p) => {
    const state = STATES_MAP[p.stateId];
    if (!state) return sum;
    const costPerPoint =
      (state.pointCost[p.speciesId] ?? 0) + (state.licenseFees.appFee ?? 0);
    return sum + p.points * costPerPoint;
  }, 0);

  const [formErrors, setFormErrors] = useState<string[]>([]);

  function handleAdd() {
    const result = pointsFormSchema.safeParse({
      stateId: newStateId || undefined,
      speciesId: newSpeciesId || undefined,
      points: newPoints,
      pointType: newPointType,
      yearStarted: newYearStarted,
    });

    if (!result.success) {
      setFormErrors(result.error.issues.map((i) => i.message));
      return;
    }
    setFormErrors([]);

    addUserPoint({
      id: crypto.randomUUID(),
      userId: "local",
      stateId: newStateId,
      speciesId: newSpeciesId,
      points: newPoints,
      pointType: newPointType,
      yearStarted: newYearStarted,
    });
    setShowAddModal(false);
    setNewStateId("");
    setNewSpeciesId("");
    setNewPoints(0);
    setNewPointType("preference");
    setNewYearStarted(new Date().getFullYear());
    setFormErrors([]);
  }

  function handleSaveEdit(id: string) {
    updateUserPoint(id, { points: editPoints });
    setEditingId(null);
  }

  return (
    <div className="p-6 space-y-6 fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="w-6 h-6 text-primary" />
            Points Portfolio
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your <HuntingTerm term="preference points">preference</HuntingTerm> and <HuntingTerm term="bonus points">bonus points</HuntingTerm> across all states
          </p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="gap-2"
          size="sm"
        >
          <Plus className="w-4 h-4" />
          Add Points
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Points</p>
                <p className="text-2xl font-bold">{totalPoints}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-chart-2/15 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-chart-2" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Invested</p>
                <p className="text-2xl font-bold">
                  ${totalInvested.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-chart-3/15 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-chart-3" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active States</p>
                <p className="text-2xl font-bold">{totalStates}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-chart-4/15 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-chart-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Species</p>
                <p className="text-2xl font-bold">
                  {new Set(userPoints.map((p) => p.speciesId)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Points by State */}
      {Object.keys(pointsByState).length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-primary/50" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              No points tracked yet
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Start by adding your current preference and bonus point balances
              from each state you&apos;re applying in.
            </p>
            <Button onClick={() => setShowAddModal(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Your First Points
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(pointsByState).map(([stateId, points]) => {
            const state = STATES_MAP[stateId];
            if (!state) return null;
            return (
              <Card key={stateId} className="bg-card border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: state.color }}
                      >
                        {state.abbreviation}
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {state.name}
                        </CardTitle>
                        <p className="text-[10px] text-muted-foreground">
                          {state.pointSystemDetails.description.split(".")[0]}
                        </p>
                      </div>
                    </div>
                    <a
                      href={state.buyPointsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Buy points for ${state.name} (opens in new tab)`}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" aria-hidden="true" />
                    </a>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {points.map((pt) => (
                    <div key={pt.id}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm capitalize">
                            {pt.speciesId.replace("_", " ")}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                            {pt.pointType}
                          </span>
                          {pt.yearStarted && (
                            <span className="text-[10px] text-muted-foreground/60">
                              since {pt.yearStarted}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {editingId === pt.id ? (
                            <>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() =>
                                    setEditPoints(Math.max(0, editPoints - 1))
                                  }
                                  aria-label="Remove one point"
                                  className="w-7 h-7 rounded bg-secondary flex items-center justify-center text-sm hover:bg-accent"
                                >
                                  -
                                </button>
                                <span className="w-8 text-center font-bold" aria-live="polite">
                                  {editPoints}
                                </span>
                                <button
                                  onClick={() =>
                                    setEditPoints(editPoints + 1)
                                  }
                                  aria-label="Add one point"
                                  className="w-7 h-7 rounded bg-secondary flex items-center justify-center text-sm hover:bg-accent"
                                >
                                  +
                                </button>
                              </div>
                              <button
                                onClick={() => handleSaveEdit(pt.id)}
                                aria-label="Save points"
                                className="w-7 h-7 rounded bg-primary/15 flex items-center justify-center hover:bg-primary/25"
                              >
                                <Check className="w-3.5 h-3.5 text-primary" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                aria-label="Cancel edit"
                                className="w-7 h-7 rounded bg-secondary flex items-center justify-center hover:bg-accent"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="text-xl font-bold mr-2">
                                {pt.points}
                              </span>
                              <button
                                onClick={() => {
                                  setEditingId(pt.id);
                                  setEditPoints(pt.points);
                                }}
                                aria-label={`Edit ${pt.speciesId.replace("_", " ")} points`}
                                className="w-7 h-7 rounded bg-secondary flex items-center justify-center hover:bg-accent transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => removeUserPoint(pt.id)}
                                aria-label={`Delete ${pt.speciesId.replace("_", " ")} points`}
                                className="w-7 h-7 rounded bg-secondary flex items-center justify-center hover:bg-destructive/15 hover:text-destructive transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <Separator className="mt-3" />
                    </div>
                  ))}
                  <div className="flex justify-between text-xs text-muted-foreground pt-1">
                    <span>Annual subscription</span>
                    <span className="font-medium text-chart-2">
                      $
                      {points
                        .reduce((sum, pt) => {
                          const cost = state.pointCost[pt.speciesId] ?? 0;
                          const fee = state.licenseFees.appFee ?? 0;
                          return sum + cost + fee;
                        }, (state.licenseFees.qualifyingLicense ?? 0))
                        .toLocaleString()}
                      /yr
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Annual Subscription Summary */}
      {userPoints.length > 0 && (
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1923] border-primary/20 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary to-chart-2" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  <HuntingTerm term="annual subscription">Total Annual Subscription</HuntingTerm>
                </p>
                <p className="text-sm text-muted-foreground">
                  Your yearly investment to maintain all active <HuntingTerm term="preference points">points</HuntingTerm>
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-primary">
                  $
                  {Object.entries(pointsByState)
                    .reduce((total, [stateId, points]) => {
                      const state = STATES_MAP[stateId];
                      if (!state) return total;
                      const speciesCost = points.reduce((sum, pt) => {
                        const cost = state.pointCost[pt.speciesId] ?? 0;
                        const fee = state.licenseFees.appFee ?? 0;
                        return sum + cost + fee;
                      }, 0);
                      return (
                        total +
                        speciesCost +
                        (state.licenseFees.qualifyingLicense ?? 0)
                      );
                    }, 0)
                    .toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">per year</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Points Modal */}
      {showAddModal && (
        <div ref={modalRef} className="fixed inset-0 z-50 flex items-center justify-center" onKeyDown={(e) => { if (e.key === "Escape") setShowAddModal(false); }}>
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm modal-overlay"
            onClick={() => setShowAddModal(false)}
            role="presentation"
          />
          <Card role="dialog" aria-modal="true" aria-labelledby="points-dialog-title" className="relative z-10 w-full max-w-md bg-card border-border shadow-2xl modal-content">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle id="points-dialog-title" className="text-base">Add Points</CardTitle>
              <button
                onClick={() => setShowAddModal(false)}
                aria-label="Close dialog"
                className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-accent"
              >
                <X className="w-4 h-4" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* State Selector */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  State
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {STATES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setNewStateId(s.id)}
                      className={`p-2 rounded-lg border text-xs font-bold transition-all ${
                        newStateId === s.id
                          ? "border-primary bg-primary/10 ring-1 ring-primary"
                          : "border-border bg-secondary/50 hover:border-primary/30"
                      }`}
                    >
                      <div
                        className="w-6 h-6 rounded mx-auto mb-1 flex items-center justify-center text-[10px] text-white"
                        style={{ backgroundColor: s.color }}
                      >
                        {s.abbreviation}
                      </div>
                      {s.abbreviation}
                    </button>
                  ))}
                </div>
              </div>

              {/* Species Selector */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Species
                </label>
                <div className="flex flex-wrap gap-2">
                  {SPECIES.map((sp) => (
                    <button
                      key={sp.id}
                      onClick={() => setNewSpeciesId(sp.id)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        newSpeciesId === sp.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-accent"
                      }`}
                    >
                      {sp.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Point Type */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Point Type
                </label>
                <div className="flex gap-2">
                  {(["preference", "bonus"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setNewPointType(type)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                        newPointType === type
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-accent"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Points */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Current Points
                </label>
                <div className="flex items-center gap-3 justify-center">
                  <button
                    onClick={() => setNewPoints(Math.max(0, newPoints - 1))}
                    aria-label="Remove one point"
                    className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-xl font-bold hover:bg-accent transition-colors"
                  >
                    -
                  </button>
                  <span className="w-16 text-center text-3xl font-bold" aria-live="polite">
                    {newPoints}
                  </span>
                  <button
                    onClick={() => setNewPoints(newPoints + 1)}
                    aria-label="Add one point"
                    className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-xl font-bold hover:bg-accent transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Year Started */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Year Started Applying
                </label>
                <div className="flex items-center gap-3 justify-center">
                  <button
                    onClick={() => setNewYearStarted(Math.max(2000, newYearStarted - 1))}
                    className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-lg font-bold hover:bg-accent transition-colors"
                  >
                    -
                  </button>
                  <span className="w-16 text-center text-xl font-bold font-mono">
                    {newYearStarted}
                  </span>
                  <button
                    onClick={() => setNewYearStarted(Math.min(new Date().getFullYear(), newYearStarted + 1))}
                    className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-lg font-bold hover:bg-accent transition-colors"
                  >
                    +
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-1">
                  {new Date().getFullYear() - newYearStarted} year{new Date().getFullYear() - newYearStarted !== 1 ? "s" : ""} in the system
                </p>
              </div>

              {formErrors.length > 0 && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  {formErrors.map((err, i) => (
                    <p key={i} className="text-xs text-destructive">{err}</p>
                  ))}
                </div>
              )}
              <Button
                onClick={handleAdd}
                className="w-full"
                disabled={!newStateId || !newSpeciesId}
              >
                Add to Portfolio
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
