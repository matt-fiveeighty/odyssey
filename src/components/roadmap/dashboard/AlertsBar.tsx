"use client";

import { useState } from "react";
import type { GotchaAlert } from "@/lib/engine/state-gotchas";
import type { PlanConflict } from "@/lib/engine/conflict-resolver";
import { STATES_MAP } from "@/lib/constants/states";
import {
  AlertTriangle,
  Info,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface AlertsBarProps {
  gotchas: GotchaAlert[];
  conflicts: PlanConflict[];
  /** When true, inject a "plan out of sync" alert at the top */
  needsRegeneration?: boolean;
}

type AlertItem = {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  recommendation?: string;
  stateAbbr?: string;
};

function normalizeAlerts(
  gotchas: GotchaAlert[],
  conflicts: PlanConflict[],
): AlertItem[] {
  const items: AlertItem[] = [];
  for (const g of gotchas) {
    items.push({
      id: g.id,
      severity: g.severity,
      title: g.title,
      description: g.description,
      recommendation: g.recommendation,
      stateAbbr: STATES_MAP[g.stateId]?.abbreviation ?? g.stateId,
    });
  }
  for (const c of conflicts) {
    items.push({
      id: c.id,
      severity: c.severity,
      title: c.title,
      description: c.description,
      recommendation: c.resolution,
      stateAbbr: c.affectedActions[0]
        ? STATES_MAP[c.affectedActions[0].stateId]?.abbreviation ?? c.affectedActions[0].stateId
        : undefined,
    });
  }
  // Sort: critical > warning > info
  const order = { critical: 0, warning: 1, info: 2 };
  items.sort((a, b) => order[a.severity] - order[b.severity]);
  return items;
}

const SEVERITY_CONFIG = {
  critical: {
    icon: ShieldAlert,
    bg: "bg-red-500/8",
    border: "border-red-500/20",
    badge: "bg-red-500/15 text-red-400",
    dot: "bg-red-400",
    text: "text-red-400",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-amber-500/8",
    border: "border-amber-500/20",
    badge: "bg-amber-500/15 text-amber-400",
    dot: "bg-amber-400",
    text: "text-amber-400",
  },
  info: {
    icon: Info,
    bg: "bg-blue-500/8",
    border: "border-blue-500/20",
    badge: "bg-blue-500/15 text-blue-400",
    dot: "bg-blue-400",
    text: "text-blue-400",
  },
};

export function AlertsBar({ gotchas, conflicts, needsRegeneration }: AlertsBarProps) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const allAlerts = normalizeAlerts(gotchas, conflicts);
  // Inject a synthetic "plan stale" alert when regeneration is needed
  if (needsRegeneration) {
    allAlerts.unshift({
      id: "__needs_regen__",
      severity: "warning",
      title: "Plan out of sync",
      description: "Profile inputs changed since this roadmap was generated.",
      recommendation: "Regenerate your roadmap from the banner above, or visit your profile to review changes.",
    });
  }
  const visible = allAlerts.filter((a) => !dismissed.has(a.id));

  if (visible.length === 0) return null;

  const criticalCount = visible.filter((a) => a.severity === "critical").length;
  const warningCount = visible.filter((a) => a.severity === "warning").length;
  const infoCount = visible.filter((a) => a.severity === "info").length;

  const preview = visible.slice(0, 2);
  const hasMore = visible.length > 2;

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
      {/* Summary bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-secondary/30 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {criticalCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[10px] font-semibold">
                <ShieldAlert className="w-3 h-3" />
                {criticalCount}
              </span>
            )}
            {warningCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-semibold">
                <AlertTriangle className="w-3 h-3" />
                {warningCount}
              </span>
            )}
            {infoCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 text-[10px] font-semibold">
                <Info className="w-3 h-3" />
                {infoCount}
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {visible.length} alert{visible.length !== 1 ? "s" : ""} — state gotchas & plan conflicts
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Collapsed preview — show top 2 as one-liners */}
      {!expanded && (
        <div className="px-4 pb-3 space-y-1.5">
          {preview.map((alert) => {
            const cfg = SEVERITY_CONFIG[alert.severity];
            return (
              <div
                key={alert.id}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
                <span className={cn("font-medium", cfg.text)}>{alert.title}</span>
                {alert.stateAbbr && (
                  <span className="text-muted-foreground/40">· {alert.stateAbbr}</span>
                )}
              </div>
            );
          })}
          {hasMore && (
            <p className="text-[10px] text-muted-foreground/40 pl-3.5">
              +{visible.length - 2} more...
            </p>
          )}
        </div>
      )}

      {/* Expanded: full cards */}
      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {visible.map((alert) => {
            const cfg = SEVERITY_CONFIG[alert.severity];
            const Icon = cfg.icon;
            return (
              <div
                key={alert.id}
                className={cn(
                  "rounded-lg border p-3 relative",
                  cfg.bg,
                  cfg.border,
                )}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDismissed((prev) => new Set([...prev, alert.id]));
                  }}
                  className="absolute top-2 right-2 w-5 h-5 rounded flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="flex items-start gap-2.5 pr-5">
                  <Icon className={cn("w-4 h-4 shrink-0 mt-0.5", cfg.text)} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={cn("text-xs font-semibold", cfg.text)}>
                        {alert.title}
                      </p>
                      {alert.stateAbbr && (
                        <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-medium", cfg.badge)}>
                          {alert.stateAbbr}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {alert.description}
                    </p>
                    {alert.recommendation && (
                      <p className="text-[11px] text-foreground/70 mt-1.5 leading-relaxed">
                        <span className="font-medium">→ </span>
                        {alert.recommendation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
