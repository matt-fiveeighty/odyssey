"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { StrategicAssessment, RoadmapAction } from "@/lib/types";
import { useWizardStore, useAppStore } from "@/lib/store";
import { HeroSummary } from "./sections/HeroSummary";
import { PlanExport } from "@/components/shared/PlanExport";
import { Button } from "@/components/ui/button";
import { BarChart3, MapPin, Clock, Plane, Check, RotateCcw, GitCompareArrows } from "lucide-react";

export interface EditableAction extends RoadmapAction {
  _edited?: boolean;
}

// Lazy load tab content — only HeroSummary is above the fold
const PortfolioOverview = dynamic(() => import("./sections/PortfolioOverview").then(m => ({ default: m.PortfolioOverview })));
const StatePortfolio = dynamic(() => import("./sections/StatePortfolio").then(m => ({ default: m.StatePortfolio })));
const TimelineRoadmap = dynamic(() => import("./sections/TimelineRoadmap").then(m => ({ default: m.TimelineRoadmap })));
const LogisticsTab = dynamic(() => import("./sections/LogisticsTab").then(m => ({ default: m.LogisticsTab })));
const StrategyComparison = dynamic(() => import("./sections/StrategyComparison").then(m => ({ default: m.StrategyComparison })));

interface ResultsShellProps {
  assessment: StrategicAssessment;
}

const TABS = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "states", label: "States", icon: MapPin },
  { id: "timeline", label: "Timeline", icon: Clock },
  { id: "logistics", label: "Logistics", icon: Plane },
  { id: "compare", label: "Compare", icon: GitCompareArrows },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function ResultsShell({ assessment }: ResultsShellProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const wizard = useWizardStore();
  const appStore = useAppStore();
  const router = useRouter();

  // Lift timeline edits to survive tab switches (dynamic imports unmount children)
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

  function handleConfirmPlan() {
    wizard.confirmPlan(assessment);
    appStore.setConfirmedAssessment(assessment);
    appStore.setMilestones(assessment.milestones);
    router.push("/goals");
  }

  function handleStartOver() {
    wizard.reset();
  }

  const handleTabKeyDown = useCallback((e: React.KeyboardEvent) => {
    const idx = TABS.findIndex((t) => t.id === activeTab);
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const next = TABS[(idx + 1) % TABS.length];
      setActiveTab(next.id);
      document.getElementById(`tab-${next.id}`)?.focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prev = TABS[(idx - 1 + TABS.length) % TABS.length];
      setActiveTab(prev.id);
      document.getElementById(`tab-${prev.id}`)?.focus();
    }
  }, [activeTab]);

  return (
    <div className="space-y-6">
      <HeroSummary assessment={assessment} />

      {/* Tab bar */}
      <div role="tablist" aria-label="Results sections" className="flex gap-1 p-1 bg-secondary/50 rounded-xl" onKeyDown={handleTabKeyDown}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer ${
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`} className="fade-in-up">
        {activeTab === "overview" && <PortfolioOverview assessment={assessment} />}
        {activeTab === "states" && <StatePortfolio assessment={assessment} />}
        {activeTab === "timeline" && <TimelineRoadmap assessment={assessment} editedActions={timelineEdits} onEditedActionsChange={handleTimelineEditsChange} />}
        {activeTab === "logistics" && <LogisticsTab assessment={assessment} />}
        {activeTab === "compare" && <StrategyComparison assessment={assessment} />}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button variant="ghost" onClick={handleStartOver} className="gap-1.5">
          <RotateCcw className="w-4 h-4" /> Start Over
        </Button>
        <div className="flex items-center gap-2">
          <PlanExport assessment={assessment} milestones={assessment.milestones} />
          <Button onClick={handleConfirmPlan} className="gap-1.5">
            <Check className="w-4 h-4" /> Confirm &amp; Track This Plan
          </Button>
        </div>
      </div>
    </div>
  );
}
