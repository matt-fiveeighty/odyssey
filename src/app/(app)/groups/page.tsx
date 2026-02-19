"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  DollarSign,
  Tent,
  MessageSquare,
} from "lucide-react";
import { STATES_MAP, STATES } from "@/lib/constants/states";
import { STATE_VISUALS } from "@/lib/constants/state-images";
import { SpeciesAvatar } from "@/components/shared/SpeciesAvatar";
import { GroupRoster, type RosterMember } from "@/components/groups/GroupRoster";
import { FeasibilityCheck } from "@/components/groups/FeasibilityCheck";
import type { GroupMember as FeasibilityMember } from "@/lib/engine/group-feasibility";
import { formatSpeciesName } from "@/lib/utils";

// ── Types ──

interface HuntMember {
  id: string;
  name: string;
  email?: string;
  points: number;
  role: "organizer" | "member";
  status: "confirmed" | "invited" | "declined";
}

type HuntPhase = "planning" | "applied" | "drawn" | "hunting" | "complete" | "unsuccessful";

interface SharedExpense {
  id: string;
  label: string;
  amount: number;
  splitMethod: "even" | "custom";
  paidBy?: string;
}

interface HuntPlan {
  id: string;
  name: string;
  stateId: string;
  speciesId: string;
  unitCode?: string;
  year: number;
  phase: HuntPhase;
  members: HuntMember[];
  // Hunt logistics
  huntDates?: string;
  campStyle?: string;
  meetupLocation?: string;
  // Shared budget
  expenses: SharedExpense[];
  // Strategy notes
  strategyNotes?: string;
}

// ── Phase config ──

const PHASE_CONFIG: Record<HuntPhase, { label: string; color: string; bg: string }> = {
  planning: { label: "Planning", color: "text-info", bg: "bg-info/10" },
  applied: { label: "Applied", color: "text-warning", bg: "bg-warning/10" },
  drawn: { label: "Drawn!", color: "text-success", bg: "bg-success/10" },
  hunting: { label: "In the Field", color: "text-chart-2", bg: "bg-chart-2/10" },
  complete: { label: "Complete", color: "text-primary", bg: "bg-primary/10" },
  unsuccessful: { label: "Not Drawn", color: "text-muted-foreground", bg: "bg-secondary" },
};

const CAMP_STYLES = [
  { id: "truck_camp", label: "Truck Camp", icon: "🚛" },
  { id: "backpack", label: "Backpack", icon: "🎒" },
  { id: "wall_tent", label: "Wall Tent", icon: "⛺" },
  { id: "cabin", label: "Cabin/Lodge", icon: "🏠" },
  { id: "guided", label: "Outfitter Camp", icon: "🐴" },
];

// ── Helpers ──

function toRosterMember(m: HuntMember): RosterMember {
  return {
    id: m.id,
    name: m.name,
    email: m.email,
    points: m.points,
    status: m.status === "confirmed" ? "confirmed" : m.status === "invited" ? "pending" : "declined",
    isLeader: m.role === "organizer",
  };
}

function toFeasibilityMember(m: HuntMember): FeasibilityMember {
  return { userId: m.id, name: m.name, points: m.points, isResident: false };
}

// ── Page Component ──

export default function GroupsPage() {
  const [plans, setPlans] = useState<HuntPlan[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  // Create form
  const [newName, setNewName] = useState("");
  const [newStateId, setNewStateId] = useState("");
  const [newSpeciesId, setNewSpeciesId] = useState("");
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newCampStyle, setNewCampStyle] = useState("");

  function createPlan() {
    if (!newStateId || !newSpeciesId) return;
    const state = STATES_MAP[newStateId];
    const planName = newName.trim() || `${state?.abbreviation ?? newStateId} ${formatSpeciesName(newSpeciesId)} ${newYear}`;
    const plan: HuntPlan = {
      id: crypto.randomUUID(),
      name: planName,
      stateId: newStateId,
      speciesId: newSpeciesId,
      year: newYear,
      phase: "planning",
      campStyle: newCampStyle || undefined,
      members: [
        { id: "me", name: "You", points: 0, role: "organizer", status: "confirmed" },
      ],
      expenses: [],
    };
    setPlans((prev) => [...prev, plan]);
    setShowCreateModal(false);
    setNewName("");
    setNewStateId("");
    setNewSpeciesId("");
    setNewCampStyle("");
  }

  function inviteMember(planId: string, email: string) {
    if (!email.trim()) return;
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? {
              ...p,
              members: [
                ...p.members,
                {
                  id: crypto.randomUUID(),
                  name: email.split("@")[0],
                  email,
                  points: 0,
                  role: "member" as const,
                  status: "invited" as const,
                },
              ],
            }
          : p
      )
    );
  }

  function removeMember(planId: string, memberId: string) {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId ? { ...p, members: p.members.filter((m) => m.id !== memberId) } : p
      )
    );
  }

  function updateNotes(planId: string, notes: string) {
    setPlans((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, strategyNotes: notes } : p))
    );
  }

  function addExpense(planId: string) {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? {
              ...p,
              expenses: [
                ...p.expenses,
                { id: crypto.randomUUID(), label: "", amount: 0, splitMethod: "even" },
              ],
            }
          : p
      )
    );
  }

  function updateExpense(planId: string, expenseId: string, field: string, value: string | number) {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? {
              ...p,
              expenses: p.expenses.map((e) =>
                e.id === expenseId ? { ...e, [field]: value } : e
              ),
            }
          : p
      )
    );
  }

  function removeExpense(planId: string, expenseId: string) {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? { ...p, expenses: p.expenses.filter((e) => e.id !== expenseId) }
          : p
      )
    );
  }

  function updatePhase(planId: string, phase: HuntPhase) {
    setPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, phase } : p)));
  }

  function updateField(planId: string, field: string, value: string) {
    setPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, [field]: value } : p)));
  }

  // Get available species for selected state
  const availableSpecies = newStateId
    ? (STATES_MAP[newStateId]?.availableSpecies ?? [])
    : [];

  return (
    <div className="p-6 space-y-6 fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Hunt Plans
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Plan hunts with your crew — same state, same species, coordinated strategy
          </p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4" />
          New Hunt Plan
        </Button>
      </div>

      {/* Empty state */}
      {plans.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-12 text-center">
            <Tent className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hunt plans yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Create a hunt plan to coordinate with your hunting partners. Track applications together, share logistics, split costs, and plan your strategy as a team.
            </p>
            <Button onClick={() => setShowCreateModal(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Your First Hunt Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => {
            const state = STATES_MAP[plan.stateId];
            const vis = STATE_VISUALS[plan.stateId];
            const phaseCfg = PHASE_CONFIG[plan.phase];
            const isExpanded = expandedPlan === plan.id;
            const confirmedCount = plan.members.filter((m) => m.status === "confirmed").length;
            const totalExpenses = plan.expenses.reduce((s, e) => s + e.amount, 0);
            const perPerson = confirmedCount > 0 ? Math.round(totalExpenses / confirmedCount) : 0;

            return (
              <Card key={plan.id} className="bg-card border-border overflow-hidden">
                {/* Collapsed header */}
                <button
                  className="w-full text-left p-4 hover:bg-secondary/10 transition-colors"
                  onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0 bg-gradient-to-br ${vis?.gradient ?? "from-slate-700 to-slate-900"}`}>
                      {state?.abbreviation}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold truncate">{plan.name}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${phaseCfg.bg} ${phaseCfg.color} font-medium`}>
                          {phaseCfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <SpeciesAvatar speciesId={plan.speciesId} size={14} />
                          {formatSpeciesName(plan.speciesId)}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Calendar className="w-3 h-3" />
                          {plan.year}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Users className="w-3 h-3" />
                          {confirmedCount} confirmed
                        </span>
                        {plan.unitCode && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-3 h-3" />
                            Unit {plan.unitCode}
                          </span>
                        )}
                        {totalExpenses > 0 && (
                          <span className="flex items-center gap-0.5">
                            <DollarSign className="w-3 h-3" />
                            ${perPerson}/person
                          </span>
                        )}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-border/50 p-4 space-y-5">
                    {/* Phase selector */}
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-2">Hunt Phase</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(Object.keys(PHASE_CONFIG) as HuntPhase[]).map((phase) => {
                          const cfg = PHASE_CONFIG[phase];
                          return (
                            <button
                              key={phase}
                              onClick={() => updatePhase(plan.id, phase)}
                              className={`text-[10px] px-2.5 py-1 rounded-full font-medium transition-all ${
                                plan.phase === phase
                                  ? `${cfg.bg} ${cfg.color} ring-1 ring-current/30`
                                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                              }`}
                            >
                              {cfg.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Hunt Details Grid */}
                    <div className="grid md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1 block">Target Unit</label>
                        <input
                          type="text"
                          value={plan.unitCode ?? ""}
                          onChange={(e) => updateField(plan.id, "unitCode", e.target.value)}
                          placeholder="e.g. Unit 76"
                          className="w-full px-3 py-1.5 rounded-lg bg-secondary border border-border text-sm focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1 block">Hunt Dates</label>
                        <input
                          type="text"
                          value={plan.huntDates ?? ""}
                          onChange={(e) => updateField(plan.id, "huntDates", e.target.value)}
                          placeholder="e.g. Oct 14-18"
                          className="w-full px-3 py-1.5 rounded-lg bg-secondary border border-border text-sm focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1 block">Meetup Location</label>
                        <input
                          type="text"
                          value={plan.meetupLocation ?? ""}
                          onChange={(e) => updateField(plan.id, "meetupLocation", e.target.value)}
                          placeholder="e.g. Pinedale, WY"
                          className="w-full px-3 py-1.5 rounded-lg bg-secondary border border-border text-sm focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Camp Style */}
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-2">Camp Style</p>
                      <div className="flex flex-wrap gap-2">
                        {CAMP_STYLES.map((style) => (
                          <button
                            key={style.id}
                            onClick={() => updateField(plan.id, "campStyle", style.id)}
                            className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
                              plan.campStyle === style.id
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-muted-foreground hover:bg-accent"
                            }`}
                          >
                            {style.icon} {style.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Party Roster */}
                    <GroupRoster
                      members={plan.members.map(toRosterMember)}
                      onInvite={(email) => inviteMember(plan.id, email)}
                      onRemove={(memberId) => removeMember(plan.id, memberId)}
                      canEdit={plan.phase === "planning" || plan.phase === "applied"}
                    />

                    {/* Feasibility Check */}
                    {plan.members.length >= 2 && (
                      <FeasibilityCheck
                        members={plan.members.map(toFeasibilityMember)}
                        stateId={plan.stateId}
                        speciesId={plan.speciesId}
                      />
                    )}

                    {/* Shared Expenses */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium flex items-center gap-1.5">
                          <DollarSign className="w-3 h-3" />
                          Shared Expenses
                        </p>
                        <Button size="sm" variant="ghost" className="text-[10px] h-6 gap-1" onClick={() => addExpense(plan.id)}>
                          <Plus className="w-3 h-3" /> Add
                        </Button>
                      </div>
                      {plan.expenses.length > 0 ? (
                        <div className="space-y-1.5">
                          {plan.expenses.map((expense) => (
                            <div key={expense.id} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={expense.label}
                                onChange={(e) => updateExpense(plan.id, expense.id, "label", e.target.value)}
                                placeholder="Gas, Food, Rental..."
                                className="flex-1 px-2 py-1 rounded bg-secondary border border-border text-xs focus:border-primary focus:outline-none"
                              />
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                                <input
                                  type="number"
                                  value={expense.amount || ""}
                                  onChange={(e) => updateExpense(plan.id, expense.id, "amount", Number(e.target.value))}
                                  placeholder="0"
                                  className="w-20 pl-5 pr-2 py-1 rounded bg-secondary border border-border text-xs text-right font-mono focus:border-primary focus:outline-none"
                                />
                              </div>
                              <button onClick={() => removeExpense(plan.id, expense.id)} className="text-muted-foreground hover:text-destructive">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          {totalExpenses > 0 && (
                            <div className="flex items-center justify-between pt-2 border-t border-border/30 text-xs">
                              <span className="text-muted-foreground">Total: <span className="font-bold text-foreground">${totalExpenses.toLocaleString()}</span></span>
                              {confirmedCount > 0 && (
                                <span className="text-primary font-semibold">${perPerson}/person (split {confirmedCount} ways)</span>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground/50 italic">No shared expenses yet</p>
                      )}
                    </div>

                    {/* Strategy Notes */}
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5 flex items-center gap-1.5">
                        <MessageSquare className="w-3 h-3" />
                        Strategy &amp; Notes
                      </p>
                      <textarea
                        value={plan.strategyNotes ?? ""}
                        onChange={(e) => updateNotes(plan.id, e.target.value)}
                        placeholder="Hunt strategy, gear list, meeting times, water source intel..."
                        rows={4}
                        className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-xs focus:border-primary focus:outline-none resize-none leading-relaxed"
                      />
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} role="presentation" />
          <Card className="relative z-10 w-full max-w-md bg-card border-border shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">New Hunt Plan</CardTitle>
              <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Hunt Name (optional)</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Wyoming Elk 2026 with the boys"
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">State</label>
                <select
                  value={newStateId}
                  onChange={(e) => { setNewStateId(e.target.value); setNewSpeciesId(""); }}
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:border-primary focus:outline-none"
                >
                  <option value="">Select state...</option>
                  {STATES.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Species</label>
                <select
                  value={newSpeciesId}
                  onChange={(e) => setNewSpeciesId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:border-primary focus:outline-none"
                  disabled={!newStateId}
                >
                  <option value="">Select species...</option>
                  {availableSpecies.map((sp) => (
                    <option key={sp} value={sp}>{formatSpeciesName(sp)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Year</label>
                <input
                  type="number"
                  value={newYear}
                  onChange={(e) => setNewYear(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Camp Style</label>
                <div className="flex flex-wrap gap-2">
                  {CAMP_STYLES.map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setNewCampStyle(newCampStyle === style.id ? "" : style.id)}
                      className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
                        newCampStyle === style.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {style.icon} {style.label}
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={createPlan} className="w-full" disabled={!newStateId || !newSpeciesId}>
                Create Hunt Plan
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
