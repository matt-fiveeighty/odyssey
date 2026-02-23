"use client";

import { useState, useCallback } from "react";
import type { StrategicAssessment } from "@/lib/types";
import type { EditableAction } from "../ResultsShell";
import { STATES_MAP } from "@/lib/constants/states";
import { STATE_VISUALS } from "@/lib/constants/state-images";
import { SpeciesAvatar } from "@/components/shared/SpeciesAvatar";
import { DataSourceInline } from "@/components/shared/DataSourceBadge";
import { FreshnessBadge } from "@/components/shared/FreshnessBadge";
import { estimated } from "@/lib/engine/verified-datum";
import { formatSpeciesName } from "@/lib/utils";
import { ChevronDown, Target, Pencil, Check, DollarSign, Trash2, Plus, List, CalendarDays } from "lucide-react";
import { resolveFees } from "@/lib/engine/fee-resolver";
import { useWizardStore } from "@/lib/store";
import { SeasonCalendar } from "./SeasonCalendar";
import { LEGACY_PHASE_COLORS, ACTION_TYPE_COLORS } from "@/lib/constants/phase-colors";

interface TimelineRoadmapProps {
  assessment: StrategicAssessment;
  editedActions: Record<number, EditableAction[]>;
  onEditedActionsChange: (edits: Record<number, EditableAction[]>) => void;
}

const PHASE_COLORS = LEGACY_PHASE_COLORS;
const ACTION_TYPE_LABELS = ACTION_TYPE_COLORS;

export function TimelineRoadmap({ assessment, editedActions, onEditedActionsChange }: TimelineRoadmapProps) {
  const [viewMode, setViewMode] = useState<"years" | "months">("years");
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set([assessment.roadmap[0]?.year]));
  const [editingYear, setEditingYear] = useState<number | null>(null);

  const toggleYear = useCallback((year: number) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }, []);

  const updateAction = useCallback((year: number, index: number, field: string, value: string | number) => {
    const next = {
      ...editedActions,
      [year]: editedActions[year].map((a, i) =>
        i === index ? { ...a, [field]: value, _edited: true } : a
      ),
    };
    onEditedActionsChange(next);
  }, [editedActions, onEditedActionsChange]);

  const removeAction = useCallback((year: number, index: number) => {
    const next = {
      ...editedActions,
      [year]: editedActions[year].filter((_, i) => i !== index),
    };
    onEditedActionsChange(next);
  }, [editedActions, onEditedActionsChange]);

  const addAction = useCallback((year: number) => {
    const defaultAction: EditableAction = {
      type: "buy_points",
      stateId: assessment.stateRecommendations[0]?.stateId ?? "",
      speciesId: "",
      description: "",
      cost: 0,
      costs: [],
      _edited: true,
    };
    const next = {
      ...editedActions,
      [year]: [...(editedActions[year] ?? []), defaultAction],
    };
    onEditedActionsChange(next);
  }, [editedActions, onEditedActionsChange, assessment.stateRecommendations]);

  // Compute year costs from edited actions
  const getYearCost = useCallback((year: number) => {
    return (editedActions[year] ?? []).reduce((s, a) => s + a.cost, 0);
  }, [editedActions]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">10-Year Roadmap</p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">Click a year to expand. Pencil icon to edit actions.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="flex items-center gap-0.5 rounded-lg bg-secondary/30 p-0.5">
            <button
              onClick={() => setViewMode("years")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "years"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label="Year view"
              title="Year view"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("months")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "months"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label="Month calendar view"
              title="Month calendar view"
            >
              <CalendarDays className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <DollarSign className="w-3.5 h-3.5" />
            <span className="font-bold text-foreground">
              ${Math.round(assessment.roadmap.reduce((s, yr) => s + getYearCost(yr.year), 0)).toLocaleString()}
            </span>
            <span>total</span>
          </div>
        </div>
      </div>

      {/* Visual timeline bar */}
      <div className="flex gap-1 mb-4">
        {assessment.roadmap.map((yr) => {
          const colors = PHASE_COLORS[yr.phase] ?? PHASE_COLORS.building;
          return (
            <div
              key={yr.year}
              className={`flex-1 h-8 rounded-lg ${colors.bg} flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity ${expandedYears.has(yr.year) ? "ring-1 ring-primary/30" : ""}`}
              onClick={() => toggleYear(yr.year)}
            >
              <span className={`text-[9px] font-bold ${colors.text}`}>{yr.year}</span>
              {yr.isHuntYear && <Target className={`w-2.5 h-2.5 ml-0.5 ${colors.text}`} />}
            </div>
          );
        })}
      </div>

      {/* Season calendar (month view) */}
      {viewMode === "months" && (
        <SeasonCalendar assessment={assessment} />
      )}

      {/* Year view: key years + accordion */}
      {viewMode === "years" && (
        <>
      {/* Key years callout */}
      {assessment.keyYears.length > 0 && (
        <div className="p-3 rounded-xl bg-secondary/30 border border-border/50 mb-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Key Milestones</p>
          <div className="space-y-1">
            {assessment.keyYears.map((ky) => (
              <div key={ky.year} className="flex gap-2 text-xs">
                <span className="font-bold text-primary w-8">{ky.year}</span>
                <span className="text-muted-foreground">{ky.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Year accordion — editable */}
      {assessment.roadmap.map((yr) => {
        const isExpanded = expandedYears.has(yr.year);
        const isEditing = editingYear === yr.year;
        const colors = PHASE_COLORS[yr.phase] ?? PHASE_COLORS.building;
        const actions = editedActions[yr.year] ?? yr.actions;
        const yearCost = getYearCost(yr.year);
        const hasEdits = actions.some((a: EditableAction) => a._edited);

        return (
          <div key={yr.year} className={`rounded-xl border overflow-hidden ${hasEdits ? "border-primary/30" : "border-border"}`}>
            {/* Year header */}
            <button
              onClick={() => toggleYear(yr.year)}
              className="w-full flex items-center justify-between p-3 hover:bg-secondary/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${colors.dot}`} />
                <span className="font-bold text-sm">{yr.year}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${colors.bg} ${colors.text} capitalize`}>
                  {yr.phase}
                </span>
                {yr.isHuntYear && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-chart-2/15 text-chart-2 font-medium">Hunt Year</span>
                )}
                {hasEdits && (
                  <span className="text-[8px] px-1 py-0.5 rounded bg-primary/10 text-primary font-medium">Edited</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground">${Math.round(yearCost).toLocaleString()}</span>
                <span className="text-[10px] text-muted-foreground">{actions.length} items</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
              </div>
            </button>

            {/* Year content — expanded */}
            <div className={`transition-all duration-300 ease-out overflow-hidden ${isExpanded ? "max-h-[4000px] opacity-100" : "max-h-0 opacity-0"}`}>
              <div className="p-3 pt-0 space-y-2 border-t border-border/50">
                {/* Edit toggle */}
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                    {actions.length} action{actions.length !== 1 ? "s" : ""} · ${Math.round(yearCost).toLocaleString()}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingYear(isEditing ? null : yr.year); }}
                    className={`text-[10px] px-2 py-1 rounded flex items-center gap-1 transition-colors ${
                      isEditing ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {isEditing ? <Check className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
                    {isEditing ? "Done" : "Edit"}
                  </button>
                </div>

                {/* Action items */}
                {actions.map((action: EditableAction, ai: number) => {
                  const state = STATES_MAP[action.stateId];
                  const vis = STATE_VISUALS[action.stateId];
                  const typeLabel = ACTION_TYPE_LABELS[action.type] ?? ACTION_TYPE_LABELS.buy_points;

                  return (
                    <div key={ai} className={`flex items-start gap-2 p-2.5 rounded-lg ${action._edited ? "bg-primary/5 border border-primary/10" : "bg-secondary/20"}`}>
                      {state && (
                        <div className={`w-7 h-7 rounded flex items-center justify-center text-[8px] font-bold text-white shrink-0 bg-gradient-to-br ${vis?.gradient ?? "from-slate-700 to-slate-900"}`}>
                          {state.abbreviation}
                        </div>
                      )}
                      {action.speciesId && (
                        <SpeciesAvatar speciesId={action.speciesId} size={22} />
                      )}
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className={`text-[8px] px-1.5 py-0.5 rounded font-medium ${typeLabel.color}`}>
                                {typeLabel.label}
                              </span>
                              {action.speciesId && (
                                <span className="text-[10px] text-muted-foreground">{formatSpeciesName(action.speciesId)}</span>
                              )}
                            </div>
                            <input
                              type="text"
                              value={action.description}
                              onChange={(e) => updateAction(yr.year, ai, "description", e.target.value)}
                              className="w-full px-2 py-1 rounded bg-secondary border border-border text-xs focus:border-primary focus:outline-none"
                              placeholder="Description..."
                            />
                            <div className="flex gap-2">
                              {action.unitCode !== undefined && (
                                <div className="flex-1">
                                  <label className="text-[9px] text-muted-foreground">Unit</label>
                                  <input
                                    type="text"
                                    value={action.unitCode ?? ""}
                                    onChange={(e) => updateAction(yr.year, ai, "unitCode", e.target.value)}
                                    className="w-full px-2 py-0.5 rounded bg-secondary border border-border text-xs focus:border-primary focus:outline-none"
                                    placeholder="Unit code"
                                  />
                                </div>
                              )}
                              <div className="w-20">
                                <label className="text-[9px] text-muted-foreground">Cost</label>
                                <input
                                  type="number"
                                  value={action.cost}
                                  onChange={(e) => updateAction(yr.year, ai, "cost", Number(e.target.value))}
                                  className="w-full px-2 py-0.5 rounded bg-secondary border border-border text-xs text-right font-mono focus:border-primary focus:outline-none"
                                />
                              </div>
                              <button
                                onClick={() => removeAction(yr.year, ai)}
                                aria-label="Remove action"
                                className="self-end mb-0.5 p-1 text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className={`text-[8px] px-1.5 py-0.5 rounded font-medium ${typeLabel.color}`}>
                                {typeLabel.label}
                              </span>
                              <p className="text-xs font-medium">{action.description}</p>
                            </div>
                            <div className="flex gap-3 text-[10px] text-muted-foreground">
                              {action.unitCode && (
                                <span className="font-mono">Unit {action.unitCode}</span>
                              )}
                              {action.estimatedDrawOdds !== undefined && action.estimatedDrawOdds > 0 && (
                                <span>{action.estimatedDrawOdds}% draw odds</span>
                              )}
                              <span className="font-mono inline-flex items-center gap-0.5">${Math.round(action.cost).toLocaleString()}<FreshnessBadge datum={estimated(action.cost, "State fee schedule")} showLabel={false} /></span>
                              {action.dueDate && <span className="inline-flex items-center gap-0.5">Due: {action.dueDate}<FreshnessBadge datum={estimated(action.dueDate, "State deadline schedule")} showLabel={false} /></span>}
                              {action.stateId && <DataSourceInline stateId={action.stateId} />}
                            </div>
                            {/* Itemized costs */}
                            {action.costs.length > 0 && (
                              <div className="flex flex-wrap gap-x-3 mt-1">
                                {action.costs.map((c, ci) => (
                                  <span key={ci} className="text-[9px] text-muted-foreground/60">
                                    {c.label}: ${c.amount}
                                  </span>
                                ))}
                              </div>
                            )}
                            {/* Fee breakdown from state schedule */}
                            {action.costs.length === 0 && (() => {
                              const homeState = useWizardStore.getState().homeState;
                              const st = STATES_MAP[action.stateId];
                              if (!st) return null;
                              const fees = resolveFees(st, homeState);
                              const parts: string[] = [];
                              if (action.type === "apply" || action.type === "buy_points") {
                                if (fees.qualifyingLicense > 0) parts.push(`$${Math.round(fees.qualifyingLicense)} license`);
                                if (action.type === "apply" && fees.appFee > 0) parts.push(`$${Math.round(fees.appFee)} app`);
                                if (action.type === "buy_points") {
                                  const pt = fees.pointCost[action.speciesId ?? ""] ?? 0;
                                  if (pt > 0) parts.push(`$${Math.round(pt)} point`);
                                }
                                if (action.type === "apply") {
                                  const tag = fees.tagCosts[action.speciesId ?? ""] ?? 0;
                                  if (tag > 0) parts.push(`If drawn: $${Math.round(tag).toLocaleString()} tag`);
                                }
                              }
                              return parts.length > 0 ? (
                                <p className="text-[9px] text-muted-foreground/50 mt-0.5">{parts.join(" · ")}</p>
                              ) : null;
                            })()}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Add action button in edit mode */}
                {isEditing && (
                  <button
                    onClick={() => addAction(yr.year)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border/50 text-[10px] text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Add Action
                  </button>
                )}

                {/* Year investment summary */}
                <div className="flex items-center justify-between pt-2 border-t border-border/30 text-xs">
                  <div className="flex gap-3 text-muted-foreground">
                    <span>{actions.filter((a: EditableAction) => a.type === "buy_points").length} point buys</span>
                    <span>{actions.filter((a: EditableAction) => a.type === "apply").length} applications</span>
                    <span>{actions.filter((a: EditableAction) => a.type === "hunt").length} hunts</span>
                  </div>
                  <span className="font-bold">${Math.round(yearCost).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
        </>
      )}
    </div>
  );
}
