"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import type { SavedPlan } from "@/lib/store";
import { ChevronDown, Plus, Copy, Trash2, Pencil, Check, X, Users } from "lucide-react";
import Link from "next/link";

export function PlanManager() {
  const { savedPlans, activePlanId, switchPlan, renamePlan, deletePlan, duplicatePlan } = useAppStore();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [newPlanSource, setNewPlanSource] = useState<string | null>(null);
  const [newPlanName, setNewPlanName] = useState("");

  const activePlan = savedPlans.find((p) => p.id === activePlanId);

  function startRename(plan: SavedPlan) {
    setEditingId(plan.id);
    setEditName(plan.name);
  }

  function commitRename() {
    if (editingId && editName.trim()) {
      renamePlan(editingId, editName.trim());
    }
    setEditingId(null);
  }

  function handleDuplicate() {
    if (!newPlanSource || !newPlanName.trim()) return;
    const newId = duplicatePlan(newPlanSource, newPlanName.trim());
    switchPlan(newId);
    setShowNewPlan(false);
    setNewPlanName("");
    setNewPlanSource(null);
  }

  if (savedPlans.length <= 1 && !open) {
    // Single plan — show compact switcher with option to create new
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <Users className="w-4 h-4" />
          <span className="font-medium">{activePlan?.name ?? "My Strategy"}</span>
          {activePlan?.label && (
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
              {activePlan.label}
            </span>
          )}
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <Users className="w-4 h-4" />
        <span className="font-medium">{activePlan?.name ?? "My Strategy"}</span>
        {activePlan?.label && (
          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
            {activePlan.label}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setShowNewPlan(false); }} />
          <div className="absolute top-full left-0 mt-2 z-50 w-72 rounded-xl border border-border bg-card shadow-xl">
            <div className="p-2 space-y-0.5">
              <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-medium px-2 py-1">
                Your Plans
              </p>
              {savedPlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                    plan.id === activePlanId
                      ? "bg-primary/10"
                      : "hover:bg-secondary/50"
                  }`}
                >
                  {editingId === plan.id ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setEditingId(null); }}
                        className="flex-1 text-sm bg-secondary border border-border rounded px-2 py-1 focus:outline-none focus:border-primary"
                      />
                      <button onClick={commitRename} className="p-1 text-primary hover:bg-primary/10 rounded cursor-pointer">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1 text-muted-foreground hover:bg-secondary rounded cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => { switchPlan(plan.id); setOpen(false); }}
                        className="flex-1 text-left cursor-pointer"
                      >
                        <span className="text-sm font-medium">{plan.name}</span>
                        {plan.label && (
                          <span className="text-[9px] bg-secondary text-muted-foreground px-1 py-0.5 rounded ml-1.5">
                            {plan.label}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => startRename(plan)}
                        className="p-1 text-muted-foreground/50 hover:text-foreground rounded transition-colors cursor-pointer"
                        title="Rename"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      {savedPlans.length > 1 && (
                        <button
                          onClick={() => deletePlan(plan.id)}
                          className="p-1 text-muted-foreground/50 hover:text-red-400 rounded transition-colors cursor-pointer"
                          title="Delete plan"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-border p-2">
              {!showNewPlan ? (
                <div className="space-y-1">
                  <button
                    onClick={() => { setShowNewPlan(true); setNewPlanSource(activePlanId); }}
                    className="w-full flex items-center gap-2 p-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                    Duplicate as new plan
                  </button>
                  <Link
                    href="/plan-builder"
                    onClick={() => setOpen(false)}
                    className="w-full flex items-center gap-2 p-2 rounded-lg text-sm text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Build new plan from scratch
                  </Link>
                </div>
              ) : (
                <div className="space-y-2 p-1">
                  <p className="text-xs font-medium">New plan name</p>
                  <input
                    autoFocus
                    value={newPlanName}
                    onChange={(e) => setNewPlanName(e.target.value)}
                    placeholder="e.g., Youth Plan, Dad's Strategy"
                    className="w-full text-sm bg-secondary border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-primary"
                    onKeyDown={(e) => { if (e.key === "Enter") handleDuplicate(); }}
                  />
                  {savedPlans.length > 1 && (
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Copy from:</p>
                      <div className="flex flex-wrap gap-1">
                        {savedPlans.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => setNewPlanSource(p.id)}
                            className={`text-[10px] px-2 py-1 rounded-md transition-colors cursor-pointer ${
                              newPlanSource === p.id
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-muted-foreground hover:bg-accent"
                            }`}
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleDuplicate}
                      disabled={!newPlanName.trim() || !newPlanSource}
                      className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      Create Plan
                    </button>
                    <button
                      onClick={() => { setShowNewPlan(false); setNewPlanName(""); }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
