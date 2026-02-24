"use client";

import { useState } from "react";
import {
  Users,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  Calendar,
  Send,
  Layers,
  Columns2,
} from "lucide-react";
import { useAppStore, PLAN_PALETTE } from "@/lib/store";
import type { FriendPlan } from "@/lib/store";
import { formatSpeciesName } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

export type CalendarMode = "overlay" | "compare";

interface CalendarSidebarProps {
  mode: CalendarMode;
  onModeChange: (mode: CalendarMode) => void;
  onImportClick: () => void;
  onProposalClick: () => void;
  /** Which plan IDs are selected for compare mode (max 2) */
  comparePlanIds: [string | null, string | null];
  onComparePlanSelect: (slot: 0 | 1, planId: string) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getPlanColor(index: number) {
  return PLAN_PALETTE[index % PLAN_PALETTE.length];
}

// ── Component ────────────────────────────────────────────────────────────────

export function CalendarSidebar({
  mode,
  onModeChange,
  onImportClick,
  onProposalClick,
  comparePlanIds,
  onComparePlanSelect,
}: CalendarSidebarProps) {
  const savedPlans = useAppStore((s) => s.savedPlans);
  const activePlanId = useAppStore((s) => s.activePlanId);
  const friendPlans = useAppStore((s) => s.friendPlans);
  const planVisibility = useAppStore((s) => s.planVisibility);
  const dateProposals = useAppStore((s) => s.dateProposals);
  const togglePlanVisibility = useAppStore((s) => s.togglePlanVisibility);
  const removeFriendPlan = useAppStore((s) => s.removeFriendPlan);
  const removeProposal = useAppStore((s) => s.removeProposal);

  const [friendsExpanded, setFriendsExpanded] = useState(true);
  const [proposalsExpanded, setProposalsExpanded] = useState(true);

  // All plan IDs for compare mode selection
  const allPlans = [
    ...savedPlans.map((p, i) => ({ id: p.id, name: p.name, color: getPlanColor(i), type: "saved" as const })),
    ...friendPlans.map((p) => ({ id: p.id, name: p.name, color: p.color, type: "friend" as const })),
  ];

  return (
    <div className="w-56 shrink-0 border-r border-border/50 bg-background/50 flex flex-col overflow-y-auto">
      {/* Mode Toggle */}
      <div className="p-3 border-b border-border/30">
        <div className="flex items-center gap-1 p-0.5 bg-secondary/30 rounded-lg">
          <button
            onClick={() => onModeChange("overlay")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-medium transition-all ${
              mode === "overlay"
                ? "bg-primary/15 text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="w-3 h-3" />
            Overlay
          </button>
          <button
            onClick={() => onModeChange("compare")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-medium transition-all ${
              mode === "compare"
                ? "bg-primary/15 text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Columns2 className="w-3 h-3" />
            Compare
          </button>
        </div>
      </div>

      {/* My Plans */}
      <div className="p-3 space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-3 h-3" />
          My Plans
        </p>
        {savedPlans.length === 0 ? (
          <p className="text-[9px] text-muted-foreground/50 italic pl-1">No saved plans yet</p>
        ) : (
          savedPlans.map((plan, index) => {
            const color = getPlanColor(index);
            const isVisible = planVisibility[plan.id] ?? true;
            const isActive = plan.id === activePlanId;

            return (
              <div
                key={plan.id}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all group ${
                  isActive ? "bg-secondary/30" : "hover:bg-secondary/20"
                }`}
              >
                {/* Color toggle checkbox */}
                <button
                  onClick={() => togglePlanVisibility(plan.id)}
                  className="shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all"
                  style={{
                    borderColor: color.dot,
                    backgroundColor: isVisible ? color.dot : "transparent",
                  }}
                  title={isVisible ? "Hide plan" : "Show plan"}
                >
                  {isVisible && (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1 4L3 6L7 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>

                {/* Plan name */}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium truncate" style={{ color: isVisible ? color.text : undefined }}>
                    {plan.name}
                  </p>
                  {plan.label && (
                    <p className="text-[8px] text-muted-foreground/50 truncate">{plan.label}</p>
                  )}
                </div>

                {/* Active indicator */}
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Separator */}
      <div className="mx-3 border-t border-border/30" />

      {/* Friends / Peers */}
      <div className="p-3 space-y-1.5">
        <button
          onClick={() => setFriendsExpanded(!friendsExpanded)}
          className="w-full text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 hover:text-foreground transition-colors"
        >
          <Users className="w-3 h-3" />
          Friends
          <span className="ml-auto text-[8px] font-normal">
            {friendsExpanded ? "▾" : "▸"}
          </span>
        </button>

        {friendsExpanded && (
          <>
            {friendPlans.length === 0 ? (
              <p className="text-[9px] text-muted-foreground/50 italic pl-1">
                Import a friend&apos;s plan to compare calendars
              </p>
            ) : (
              friendPlans.map((plan) => {
                const isVisible = planVisibility[plan.id] ?? true;

                return (
                  <div
                    key={plan.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary/20 transition-all group"
                  >
                    {/* Color toggle */}
                    <button
                      onClick={() => togglePlanVisibility(plan.id)}
                      className="shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all"
                      style={{
                        borderColor: plan.color,
                        backgroundColor: isVisible ? plan.color : "transparent",
                      }}
                      title={isVisible ? "Hide" : "Show"}
                    >
                      {isVisible && (
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1 4L3 6L7 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>

                    {/* Name */}
                    <span className="text-[10px] font-medium truncate flex-1" style={{ color: isVisible ? plan.color : undefined }}>
                      {plan.name}
                    </span>

                    {/* Item count */}
                    <span className="text-[8px] text-muted-foreground/40 shrink-0">
                      {plan.items.length}
                    </span>

                    {/* Remove */}
                    <button
                      onClick={() => removeFriendPlan(plan.id)}
                      className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                      title="Remove friend plan"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}

            <button
              onClick={onImportClick}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] text-primary/70 hover:text-primary hover:bg-primary/5 transition-all"
            >
              <Plus className="w-3 h-3" />
              Import Friend&apos;s Plan
            </button>
          </>
        )}
      </div>

      {/* Separator */}
      <div className="mx-3 border-t border-border/30" />

      {/* Proposals */}
      <div className="p-3 space-y-1.5">
        <button
          onClick={() => setProposalsExpanded(!proposalsExpanded)}
          className="w-full text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 hover:text-foreground transition-colors"
        >
          <Send className="w-3 h-3" />
          Proposals
          <span className="ml-auto text-[8px] font-normal">
            {proposalsExpanded ? "▾" : "▸"}
          </span>
        </button>

        {proposalsExpanded && (
          <>
            {dateProposals.length === 0 ? (
              <p className="text-[9px] text-muted-foreground/50 italic pl-1">
                Propose hunt dates to share with peers
              </p>
            ) : (
              dateProposals.map((proposal) => (
                <div
                  key={proposal.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-secondary/10 group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium truncate">
                      {proposal.stateId} · {formatSpeciesName(proposal.speciesId)}
                    </p>
                    <p className="text-[8px] text-muted-foreground/50">
                      {MONTH_NAMES_SHORT[proposal.startMonth - 1]} {proposal.startDay} – {MONTH_NAMES_SHORT[proposal.endMonth - 1]} {proposal.endDay}
                    </p>
                  </div>
                  <button
                    onClick={() => removeProposal(proposal.id)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))
            )}
            <button
              onClick={onProposalClick}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] text-primary/70 hover:text-primary hover:bg-primary/5 transition-all"
            >
              <Plus className="w-3 h-3" />
              New Proposal
            </button>
          </>
        )}
      </div>

      {/* Compare Mode: Plan Selectors */}
      {mode === "compare" && (
        <>
          <div className="mx-3 border-t border-border/30" />
          <div className="p-3 space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Compare Panes
            </p>
            {([0, 1] as const).map((slot) => (
              <div key={slot}>
                <label className="text-[9px] text-muted-foreground mb-0.5 block">
                  {slot === 0 ? "Left Pane" : "Right Pane"}
                </label>
                <select
                  value={comparePlanIds[slot] ?? ""}
                  onChange={(e) => onComparePlanSelect(slot, e.target.value)}
                  className="w-full px-2 py-1 rounded bg-secondary border border-border text-[10px] focus:border-primary focus:outline-none"
                >
                  <option value="">Select plan...</option>
                  {allPlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.type === "friend" ? `${p.name} (Friend)` : p.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
