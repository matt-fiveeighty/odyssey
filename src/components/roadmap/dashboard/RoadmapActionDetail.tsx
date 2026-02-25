"use client";

import { useMemo } from "react";
import type { StrategicAssessment, UserPoints } from "@/lib/types";
import type { RoadmapActionItem } from "./RoadmapActionList";
import { SpeciesAvatar } from "@/components/shared/SpeciesAvatar";
import { MagneticButton } from "@/components/shared/MagneticButton";
import { formatSpeciesName, cn } from "@/lib/utils";
import { STATES_MAP } from "@/lib/constants/states";
import { SPECIES_IMAGES } from "@/lib/constants/species-images";
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

  const speciesImage = SPECIES_IMAGES[action.speciesId];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header — Glassmorphism HUD over species photography */}
      <div className="relative overflow-hidden">
        {/* Background: vivid species photography */}
        {speciesImage && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${speciesImage.src})` }}
            aria-hidden="true"
          />
        )}
        {/* Frosted glass overlay */}
        <div className={cn(
          "relative p-5 border-b border-border/40",
          speciesImage ? "glass-panel" : "bg-secondary/40",
        )}>
          <div className="flex items-center gap-1.5 mb-3">
            <span className={cn("text-[10px] uppercase tracking-wider font-medium", typeStyle.text)}>
              Action Details
            </span>
            <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-medium", typeStyle.pill)}>
              {typeStyle.detailLabel}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <SpeciesAvatar speciesId={action.speciesId} size={48} className="rounded-xl shadow-sm ring-1 ring-white/10" />
            <div>
              <p className="text-lg font-bold text-white drop-shadow-sm">
                {state?.name ?? action.stateId}
              </p>
              <p className="text-sm text-white/70">
                {formatSpeciesName(action.speciesId)}
                {action.unitCode && <span className="text-white/40"> · {action.unitCode}</span>}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Points Metrics — colored labels, monospace white values */}
      <div className="p-4 border-b border-border/30">
        <p className={cn("label-uppercase mb-2.5", typeStyle.text)}>
          Point Tracking
        </p>
        <div className="grid grid-cols-3 gap-2.5">
          <MetricTile value={String(currentPoints)} label="Current Pts" labelColor="text-info" />
          <MetricTile value={String(goalPoints)} label="Goal Pts" labelColor={typeStyle.text} />
          <MetricTile value={estimatedDrawYear ? String(estimatedDrawYear) : "—"} label="Est. Draw" labelColor="text-chart-4" />
        </div>
        {/* Confidence Band */}
        {unitInfo?.drawConfidence && unitInfo.drawConfidence.pessimistic > 0 && (
          <ConfidenceBand
            optimistic={unitInfo.drawConfidence.optimistic}
            expected={unitInfo.drawConfidence.expected}
            pessimistic={unitInfo.drawConfidence.pessimistic}
            currentPoints={currentPoints}
            goalPoints={goalPoints}
          />
        )}
      </div>

      {/* Fee Breakdown */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto scrollbar-thin">
        <p className={cn("label-uppercase", typeStyle.text)}>
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

        {/* Total — type-colored label, monospace white value */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/40 border border-border/50">
          <span className={cn("label-uppercase", typeStyle.text)}>
            Total {action.type === "apply" ? "(inc license)" : ""}
          </span>
          <span className="text-base font-bold font-financial text-foreground">
            ${Math.round(totalCost).toLocaleString()}
          </span>
        </div>
      </div>

      {/* CTA — Magnetic button with cursor-tracking glow */}
      {action.url && (
        <div className="p-4 border-t border-border/40">
          <MagneticButton
            href={action.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#c8e64c] hover:bg-[#b8d63c] text-[#1a1a1a] font-semibold text-sm transition-colors shadow-sm"
          >
            {action.type === "buy_points" ? "Buy Points" : action.type === "hunt" ? "View Details" : "Apply Now"}
            <ExternalLink className="w-4 h-4" />
          </MagneticButton>
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
      <p className="text-xl font-bold font-financial text-foreground">{value}</p>
      <p className={cn("label-uppercase mt-auto", labelColor)}>{label}</p>
    </div>
  );
}

/* ─── Confidence Band ────────────────────────────────────────
 * Visual range showing optimistic → expected → pessimistic draw timelines.
 * Uses a gradient bar with positioned markers.
 */

function ConfidenceBand({
  optimistic,
  expected,
  pessimistic,
  currentPoints,
  goalPoints,
}: {
  optimistic: number;
  expected: number;
  pessimistic: number;
  currentPoints: number;
  goalPoints: number;
}) {
  const currentYear = new Date().getFullYear();
  const maxYears = Math.max(pessimistic, 1);

  // Position percentages along the band
  const optPct = Math.min((optimistic / maxYears) * 100, 100);
  const expPct = Math.min((expected / maxYears) * 100, 100);
  // Progress: how close we are to drawing (as fraction of expected)
  const progressPct = goalPoints > 0 ? Math.min((currentPoints / goalPoints) * 100, 100) : 0;

  return (
    <div className="mt-3 p-3 rounded-xl bg-secondary/30 border border-border/40">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] uppercase tracking-wider font-medium text-muted-foreground/60">
          Draw Timeline Confidence
        </span>
        <span className="text-[9px] text-muted-foreground/40">
          {optimistic}–{pessimistic} yrs
        </span>
      </div>

      {/* Bar */}
      <div className="relative h-3 rounded-full bg-secondary/60 overflow-hidden">
        {/* Full pessimistic range (background) */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500/20 via-amber-500/20 to-red-500/20" />

        {/* Optimistic zone */}
        <div
          className="absolute inset-y-0 left-0 rounded-l-full bg-emerald-500/30"
          style={{ width: `${optPct}%` }}
        />

        {/* Expected marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-foreground/40"
          style={{ left: `${expPct}%` }}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-1.5 text-[9px]">
        <span className="text-emerald-400 font-medium">
          {currentYear + optimistic}
          <span className="text-muted-foreground/40 ml-0.5">best</span>
        </span>
        <span className="text-foreground/60 font-medium">
          {currentYear + expected}
          <span className="text-muted-foreground/40 ml-0.5">likely</span>
        </span>
        <span className="text-red-400/70 font-medium">
          {currentYear + pessimistic}
          <span className="text-muted-foreground/40 ml-0.5">worst</span>
        </span>
      </div>

      {/* Point accumulation progress */}
      {goalPoints > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-muted-foreground/50">Point Progress</span>
            <span className="text-[9px] font-medium text-foreground/70">
              {currentPoints}/{goalPoints} pts ({Math.round(progressPct)}%)
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary/60 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary/60 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}
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
      <p className="label-uppercase mb-1">{label}</p>
      <div className="flex items-center gap-1.5 mt-auto">
        <span className="text-sm font-semibold font-financial text-foreground">{value}</span>
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
