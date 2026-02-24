"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { StrategicAssessment, RoadmapAction } from "@/lib/types";
import { useWizardStore, useAppStore } from "@/lib/store";
import { StrategyToggle } from "./dashboard/StrategyToggle";
import { StatusTicker } from "./dashboard/StatusTicker";
import { KPIStrip } from "./dashboard/KPIStrip";
import { BurnRateMatrix } from "./dashboard/BurnRateMatrix";
import { ContextualAlerts } from "./dashboard/ContextualAlerts";
import { ActionTabs, type ActionTabValue } from "./dashboard/ActionTabs";
import { ActionList, type ActionItem } from "./dashboard/ActionList";
import { ActionDetail } from "./dashboard/ActionDetail";
import { PlanExport } from "@/components/shared/PlanExport";
import { SubscribeCalendar } from "./SubscribeCalendar";
import { ShareButton } from "./ShareButton";
import { Button } from "@/components/ui/button";
import { Check, RotateCcw, Pencil, Clock, Plane, GitCompareArrows, ChevronDown } from "lucide-react";

export interface EditableAction extends RoadmapAction {
  _edited?: boolean;
}

// Lazy load deep-dive sections (below the fold)
const TimelineRoadmap = dynamic(() => import("./sections/TimelineRoadmap").then(m => ({ default: m.TimelineRoadmap })));
const LogisticsTab = dynamic(() => import("./sections/LogisticsTab").then(m => ({ default: m.LogisticsTab })));
const StrategyComparison = dynamic(() => import("./sections/StrategyComparison").then(m => ({ default: m.StrategyComparison })));

interface ResultsShellProps {
  assessment: StrategicAssessment;
}

const DEEP_SECTIONS = [
  { id: "timeline", label: "Timeline", icon: Clock },
  { id: "logistics", label: "Logistics", icon: Plane },
  { id: "compare", label: "Compare", icon: GitCompareArrows },
] as const;

type DeepSectionId = (typeof DEEP_SECTIONS)[number]["id"];

export function ResultsShell({ assessment }: ResultsShellProps) {
  const [actionTab, setActionTab] = useState<ActionTabValue>("all");
  const [selectedActionIndex, setSelectedActionIndex] = useState<number | null>(0);
  const [openSection, setOpenSection] = useState<DeepSectionId | null>(null);
  const wizard = useWizardStore();
  const appStore = useAppStore();
  const router = useRouter();

  const currentYear = new Date().getFullYear();

  // Lift timeline edits to survive dynamic imports unmounting children
  const [timelineEdits, setTimelineEdits] = useState<Record<number, EditableAction[]>>(() => {
    const map: Record<number, EditableAction[]> = {};
    for (const yr of assessment.roadmap) {
      map[yr.year] = yr.actions.map((a) => ({ ...a }));
    }
    return map;
  });
  const handleTimelineEditsChange = useCallback((edits: Record<number, EditableAction[]>) => {
    setTimelineEdits(edits);
  }, []);

  // Flatten all roadmap actions into a single list (like "Unpaid Invoices")
  const allActions: ActionItem[] = useMemo(() => {
    const items: ActionItem[] = [];
    for (const yr of assessment.roadmap) {
      for (const a of yr.actions) {
        items.push({ ...a, year: yr.year, isHuntYear: yr.isHuntYear });
      }
    }
    // Sort: current year first, then by deadline
    items.sort((a, b) => {
      const aIsCurrent = a.year === currentYear ? 0 : 1;
      const bIsCurrent = b.year === currentYear ? 0 : 1;
      if (aIsCurrent !== bIsCurrent) return aIsCurrent - bIsCurrent;
      if (a.year !== b.year) return a.year - b.year;
      if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });
    return items;
  }, [assessment.roadmap, currentYear]);

  // Filter actions by tab
  const filteredActions = useMemo(() => {
    switch (actionTab) {
      case "point_year":
        return allActions.filter((a) => a.type === "buy_points");
      case "draw_year":
        return allActions.filter((a) => a.type === "apply");
      case "hunt":
        return allActions.filter((a) => a.type === "hunt" || a.type === "scout");
      default:
        return allActions;
    }
  }, [allActions, actionTab]);

  // Keep selection in bounds when filter changes
  const effectiveIndex = useMemo(() => {
    if (selectedActionIndex === null) return filteredActions.length > 0 ? 0 : null;
    if (selectedActionIndex >= filteredActions.length) return filteredActions.length > 0 ? 0 : null;
    return selectedActionIndex;
  }, [selectedActionIndex, filteredActions.length]);

  const selectedAction = effectiveIndex !== null ? filteredActions[effectiveIndex] : null;

  function handleConfirmPlan() {
    wizard.confirmPlan(assessment);
    appStore.setConfirmedAssessment(assessment);
    appStore.setMilestones(assessment.milestones);
    router.push("/goals");
  }

  function handleEditPlan() {
    wizard.setStep(1);
  }

  function handleStartOver() {
    wizard.reset();
  }

  function toggleSection(id: DeepSectionId) {
    setOpenSection((prev) => (prev === id ? null : id));
  }

  return (
    <div className="space-y-4">
      {/* ROW 1: Strategy Toggle — toggleable header */}
      <StrategyToggle assessment={assessment} />

      {/* ROW 2: Status Ticker — color-coded annual status bar */}
      <StatusTicker assessment={assessment} />

      {/* ROW 3: KPI Strip — sunk/floated capital + first hunt + 10-year total */}
      <KPIStrip assessment={assessment} />

      {/* ROW 4: Burn Rate Matrix — per-species point position vs requirements */}
      <BurnRateMatrix assessment={assessment} />

      {/* ROW 5: Contextual Alerts — lottery badges, dead assets, physical horizon */}
      <ContextualAlerts assessment={assessment} />

      {/* ROW 6: Action Tabs — "All Actions / Point Year / Draw Year / Hunt" */}
      <ActionTabs
        actions={allActions}
        value={actionTab}
        onChange={(v) => { setActionTab(v); setSelectedActionIndex(0); }}
        currentYear={currentYear}
      />

      {/* ROW 4: Master-Detail — Action List (left) + Action Detail (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-0 min-h-[520px] rounded-xl border border-border/50 overflow-hidden bg-background/30">
        {/* Left: Action List */}
        <div className="lg:border-r border-border/30 lg:max-h-[600px] lg:overflow-y-auto scrollbar-thin">
          <div className="p-3 border-b border-border/30">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              {actionTab === "all" ? "All Actions" : actionTab === "point_year" ? "Point Year Actions" : actionTab === "draw_year" ? "Draw Year Actions" : "Hunts"}{" "}
              <span className="text-muted-foreground/50">({filteredActions.length})</span>
            </p>
          </div>
          <ActionList
            actions={filteredActions}
            selectedIndex={effectiveIndex}
            onSelect={setSelectedActionIndex}
          />
        </div>

        {/* Right: Action Detail — the detail card */}
        <div className="min-w-0">
          {selectedAction ? (
            <ActionDetail action={selectedAction} assessment={assessment} />
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground/60">
              Select an action to view details
            </div>
          )}
        </div>
      </div>

      {/* Deep-Dive Sections (below the fold, collapsible) */}
      <div className="space-y-2 pt-4 border-t border-border/50">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-2">Deep Dive</p>
        {DEEP_SECTIONS.map((section) => (
          <div key={section.id} className="rounded-xl border border-border/50 overflow-hidden">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center gap-2 p-3.5 hover:bg-secondary/20 transition-colors cursor-pointer"
            >
              <section.icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{section.label}</span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground ml-auto transition-transform duration-200 ${openSection === section.id ? "rotate-180" : ""}`} />
            </button>
            {openSection === section.id && (
              <div className="p-4 pt-0 fade-in-up">
                {section.id === "timeline" && <TimelineRoadmap assessment={assessment} editedActions={timelineEdits} onEditedActionsChange={handleTimelineEditsChange} />}
                {section.id === "logistics" && <LogisticsTab assessment={assessment} />}
                {section.id === "compare" && <StrategyComparison assessment={assessment} />}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleEditPlan} className="gap-1.5">
            <Pencil className="w-4 h-4" /> Edit Plan
          </Button>
          <Button variant="ghost" onClick={handleStartOver} className="gap-1.5 text-muted-foreground">
            <RotateCcw className="w-4 h-4" /> Start Over
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <PlanExport assessment={assessment} milestones={assessment.milestones} />
          <SubscribeCalendar assessment={assessment} />
          <ShareButton assessment={assessment} />
          <Button onClick={handleConfirmPlan} className="gap-1.5">
            <Check className="w-4 h-4" /> Confirm &amp; Start Tracking
          </Button>
        </div>
      </div>
    </div>
  );
}
