"use client";

import { useMemo } from "react";
import type { StrategicAssessment, UserPoints } from "@/lib/types";
import type { RoadmapActionItem } from "./RoadmapActionList";
import { SpeciesAvatar } from "@/components/shared/SpeciesAvatar";
import { formatSpeciesName, cn } from "@/lib/utils";
import { STATES_MAP } from "@/lib/constants/states";
import { resolveFees } from "@/lib/engine/fee-resolver";
import { useWizardStore, useAppStore } from "@/lib/store";
import { ACTION_TYPE_COLORS, DEFAULT_ACTION_STYLE } from "./action-colors";
import { ExternalLink, Download } from "lucide-react";
import { exportDeadline } from "@/lib/calendar-export";

interface RoadmapActionDetailProps {
  action: RoadmapActionItem;
  assessment: StrategicAssessment;
}

export function RoadmapActionDetail({ action, assessment }: RoadmapActionDetailProps) {
  const homeState = useWizardStore((s) => s.homeState);
  const userPoints = useAppStore((s) => s.userPoints);

  const state = STATES_MAP[action.stateId];
  const stateRec = assessment.stateRecommendations.find((r) => r.stateId === action.stateId);
  const unitInfo = stateRec?.bestUnits.find((u) => u.unitCode === action.unitCode);

  const currentPoints = useMemo(() => {
    const pt = userPoints.find(
      (p: UserPoints) => p.stateId === action.stateId && p.speciesId === action.speciesId,
    );
    return pt?.points ?? 0;
  }, [userPoints, action.stateId, action.speciesId]);

  const goalPoints = unitInfo?.drawConfidence?.expected ?? 0;
  const estimatedDrawYear = unitInfo?.drawConfidence
    ? new Date().getFullYear() + (unitInfo.drawConfidence.expected - currentPoints)
    : null;

  const fees = useMemo(() => {
    if (!state) return null;
    return resolveFees(state, homeState);
  }, [state, homeState]);

  const licenseFee = fees?.qualifyingLicense ?? 0;
  const appFee = fees?.appFee ?? 0;
  const tagFee = fees?.tagCosts[action.speciesId] ?? 0;
  const pointFee = fees?.pointCost[action.speciesId] ?? 0;

  const totalCost = useMemo(() => {
    if (action.type === "apply") return licenseFee + appFee + (tagFee > 0 ? tagFee : 0);
    if (action.type === "buy_points") return licenseFee + pointFee;
    return action.cost;
  }, [action, licenseFee, appFee, tagFee, pointFee]);

  const deadline = action.dueDate
    ? new Date(action.dueDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const typeStyle = ACTION_TYPE_COLORS[action.type] ?? DEFAULT_ACTION_STYLE;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header — type-colored accent */}
      <div className="p-5 bg-secondary/40 border-b border-border/40">
        <div className="flex items-center gap-1.5 mb-3">
          <span className={cn("text-[10px] uppercase tracking-wider font-medium", typeStyle.text)}>
            Action Details
          </span>
          <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-medium", typeStyle.pill)}>
            {typeStyle.detailLabel}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <SpeciesAvatar speciesId={action.speciesId} size={48} className="rounded-xl shadow-sm" />
          <div>
            <p className="text-lg font-bold text-foreground">
              {state?.name ?? action.stateId}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatSpeciesName(action.speciesId)}
              {action.unitCode && <span className="text-muted-foreground/40"> · {action.unitCode}</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Points Metrics — colored labels, white values */}
      <div className="p-4 border-b border-border/30">
        <p className={cn("text-[9px] uppercase tracking-wider font-medium mb-2.5", typeStyle.text)}>
          Point Tracking
        </p>
        <div className="grid grid-cols-3 gap-2.5">
          <MetricTile value={String(currentPoints)} label="Current Pts" labelColor="text-info" />
          <MetricTile value={String(goalPoints)} label="Goal Pts" labelColor={typeStyle.text} />
          <MetricTile value={estimatedDrawYear ? String(estimatedDrawYear) : "—"} label="Est. Draw" labelColor="text-chart-4" />
        </div>
      </div>

      {/* Fee Breakdown */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto scrollbar-thin">
        <p className={cn("text-[9px] uppercase tracking-wider font-medium", typeStyle.text)}>
          Fee Breakdown
        </p>
        <div className="grid grid-cols-2 gap-2">
          <FeePill label="License Fee" value={licenseFee > 0 ? `$${licenseFee}` : "—"} url={action.url} />
          <FeePill
            label={action.type === "buy_points" ? "Point Fee" : "Tag Fee"}
            value={
              action.type === "buy_points"
                ? pointFee > 0 ? `$${pointFee}` : "—"
                : tagFee > 0 ? `$${Math.round(tagFee).toLocaleString()}` : "—"
            }
            url={action.url}
          />
          <FeePill
            label="Deadline"
            value={deadline ?? "—"}
            url={action.url}
            onCalendar={
              action.dueDate
                ? () => exportDeadline({
                    stateName: state?.name ?? action.stateId,
                    species: formatSpeciesName(action.speciesId),
                    openDate: action.dueDate!,
                    closeDate: action.dueDate!,
                    url: action.url,
                  })
                : undefined
            }
          />
          <FeePill label="Unit" value={action.unitCode ?? "General"} url={action.url} />
        </div>

        {/* Total — type-colored label, white value */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/40 border border-border/50">
          <span className={cn("text-[10px] uppercase tracking-wider font-medium", typeStyle.text)}>
            Total {action.type === "apply" ? "(inc license)" : ""}
          </span>
          <span className="text-base font-bold tabular-nums text-foreground">
            ${Math.round(totalCost).toLocaleString()}
          </span>
        </div>
      </div>

      {/* CTA */}
      {action.url && (
        <div className="p-4 border-t border-border/40">
          <a
            href={action.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#c8e64c] hover:bg-[#b8d63c] text-[#1a1a1a] font-semibold text-sm transition-colors shadow-sm"
          >
            {action.type === "buy_points" ? "Buy Points" : action.type === "hunt" ? "View Details" : "Apply Now"}
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}
    </div>
  );
}

/* ─── Metric Tile (Point Tracking) ─────────────────────────────
 * Same label-top / value-bottom pattern as KPI tiles.
 */
function MetricTile({ value, label, labelColor }: {
  value: string;
  label: string;
  labelColor: string;
}) {
  return (
    <div className="flex flex-col justify-between p-3 rounded-xl bg-secondary/40 border border-border/40 text-center min-h-[72px]">
      <p className="text-xl font-bold tabular-nums text-foreground">{value}</p>
      <p className={cn("text-[9px] uppercase tracking-wider mt-auto", labelColor)}>{label}</p>
    </div>
  );
}

/* ─── Fee Pill ───────────────────────────────────────────────── */

function FeePill({ label, value, url, onCalendar }: {
  label: string;
  value: string;
  url?: string;
  onCalendar?: () => void;
}) {
  return (
    <div className="flex flex-col justify-between p-2.5 rounded-xl bg-secondary/40 border border-border/35 min-h-[60px]">
      <p className="text-[9px] text-muted-foreground/60 uppercase tracking-wider font-medium mb-1">
        {label}
      </p>
      <div className="flex items-center gap-1.5 mt-auto">
        <span className="text-sm font-semibold text-foreground">{value}</span>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="text-muted-foreground/30 hover:text-primary transition-colors"
            onClick={(e) => e.stopPropagation()}>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
        {onCalendar && (
          <button onClick={(e) => { e.stopPropagation(); onCalendar(); }}
            className="text-muted-foreground/30 hover:text-primary transition-colors cursor-pointer"
            title="Export to calendar">
            <Download className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
