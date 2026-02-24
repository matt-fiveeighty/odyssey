"use client";

import { useMemo } from "react";
import type { StrategicAssessment } from "@/lib/types";
import { generateContextualAlerts, type ContextualAlert } from "@/lib/engine/change-impact";
import { useWizardStore } from "@/lib/store";
import { STATES_MAP } from "@/lib/constants/states";
import { AlertTriangle, Info, Dice5, Skull, Clock, X } from "lucide-react";
import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ContextualAlertsProps {
  assessment: StrategicAssessment;
}

const ALERT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  lottery_play: Dice5,
  dead_asset: Skull,
  fee_increase: AlertTriangle,
  plateau_reclassified: Info,
  physical_horizon_exceeded: Clock,
};

const ALERT_STYLES: Record<string, { border: string; bg: string; icon: string }> = {
  info:     { border: "border-blue-500/30", bg: "bg-blue-500/5",   icon: "text-blue-400" },
  warning:  { border: "border-chart-4/30",  bg: "bg-chart-4/5",    icon: "text-chart-4" },
  critical: { border: "border-red-500/30",  bg: "bg-red-500/5",    icon: "text-red-400" },
};

export function ContextualAlerts({ assessment }: ContextualAlertsProps) {
  const existingPoints = useWizardStore((s) => s.existingPoints);
  const physicalHorizon = useWizardStore((s) => s.physicalHorizon);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const alerts = useMemo(
    () => generateContextualAlerts(assessment, existingPoints, physicalHorizon ?? undefined),
    [assessment, existingPoints, physicalHorizon],
  );

  const visibleAlerts = alerts.filter((a) => !dismissed.has(a.id));
  if (visibleAlerts.length === 0) return null;

  function dismiss(id: string) {
    setDismissed((prev) => new Set(prev).add(id));
  }

  // Group by severity
  const critical = visibleAlerts.filter((a) => a.severity === "critical");
  const warning = visibleAlerts.filter((a) => a.severity === "warning");
  const info = visibleAlerts.filter((a) => a.severity === "info");
  const sorted = [...critical, ...warning, ...info];

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
            Alerts ({visibleAlerts.length})
          </span>
          <Tooltip>
            <TooltipTrigger>
              <span className="text-[10px] text-muted-foreground/40 cursor-help">[?]</span>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs text-xs">
              Contextual alerts adapt to each state&apos;s draw system.
              Lottery states get different signals than preference states.
              Dead assets are flagged when point creep outpaces accumulation.
            </TooltipContent>
          </Tooltip>
        </div>

        {sorted.map((alert) => {
          const Icon = ALERT_ICONS[alert.type] ?? Info;
          const style = ALERT_STYLES[alert.severity];

          return (
            <div
              key={alert.id}
              className={`${style.bg} ${style.border} border rounded-xl p-3 flex items-start gap-3`}
            >
              <Icon className={`w-4 h-4 ${style.icon} mt-0.5 shrink-0`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold">{alert.headline}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                  {alert.detail}
                </p>
                <p className="text-[10px] text-muted-foreground/70 mt-1 italic">
                  {alert.recommendation}
                </p>
              </div>
              <button
                onClick={() => dismiss(alert.id)}
                className="shrink-0 p-1 rounded hover:bg-secondary/50 transition-colors"
              >
                <X className="w-3 h-3 text-muted-foreground/40" />
              </button>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
