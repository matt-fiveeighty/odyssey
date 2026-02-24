"use client";

import type { RoadmapAction } from "@/lib/types";

export type ActionTabValue = "all" | "point_year" | "draw_year" | "hunt";

interface ActionTabsProps {
  actions: (RoadmapAction & { year: number; isHuntYear: boolean })[];
  value: ActionTabValue;
  onChange: (value: ActionTabValue) => void;
  currentYear: number;
}

const TABS: { id: ActionTabValue; label: string }[] = [
  { id: "all", label: "All Actions" },
  { id: "point_year", label: "Point Year" },
  { id: "draw_year", label: "Draw Year" },
  { id: "hunt", label: "Hunt" },
];

export function ActionTabs({ actions, value, onChange, currentYear }: ActionTabsProps) {
  const counts: Record<ActionTabValue, number> = {
    all: actions.length,
    point_year: actions.filter((a) => a.type === "buy_points").length,
    draw_year: actions.filter((a) => a.type === "apply").length,
    hunt: actions.filter((a) => a.type === "hunt" || a.type === "scout").length,
  };

  return (
    <div className="flex items-center gap-3">
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-secondary/40 rounded-lg flex-1">
        {TABS.map((tab) => {
          const count = counts[tab.id];
          if (tab.id !== "all" && count === 0) return null;
          const active = value === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 cursor-pointer ${
                active
                  ? tab.id === "hunt"
                    ? "bg-chart-3 text-white shadow-sm"
                    : "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:bg-secondary/60"
              }`}
            >
              {tab.label}
              <span className={`text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full font-semibold ${
                active ? "bg-white/20" : "bg-secondary/60"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Current year highlight */}
      <span className="text-[10px] px-2 py-1 rounded-md bg-primary/10 text-primary font-semibold shrink-0">
        {currentYear}
      </span>
    </div>
  );
}
