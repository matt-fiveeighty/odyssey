"use client";

import { useMemo } from "react";
import type { StrategicAssessment, RoadmapAction, StateRecommendation } from "@/lib/types";
import { STATES_MAP } from "@/lib/constants/states";
import { STATE_VISUALS } from "@/lib/constants/state-images";
import { SpeciesAvatar } from "@/components/shared/SpeciesAvatar";
import { useWizardStore } from "@/lib/store";
import { resolveFees } from "@/lib/engine/fee-resolver";
import { formatSpeciesName } from "@/lib/utils";
import { Target, Mountain, TrendingUp, ExternalLink, Compass, Star, Info } from "lucide-react";

interface ActionDetailProps {
  action: RoadmapAction & { year: number; isHuntYear: boolean };
  assessment: StrategicAssessment;
}

export function ActionDetail({ action, assessment }: ActionDetailProps) {
  const state = STATES_MAP[action.stateId];
  const vis = STATE_VISUALS[action.stateId];
  const homeState = useWizardStore((s) => s.homeState);

  const stateRec = assessment.stateRecommendations.find((r) => r.stateId === action.stateId);
  const unitDetail = stateRec?.bestUnits.find((u) => u.unitCode === action.unitCode) ?? stateRec?.bestUnits[0];

  const fees = useMemo(() => {
    if (!state) return null;
    return resolveFees(state, homeState);
  }, [state, homeState]);

  if (!state) return null;

  const actionLabel = action.type === "buy_points" ? "Point Year" : action.type === "apply" ? "Draw Year" : action.type === "hunt" ? "Hunt" : "Scout";

  return (
    <div className="rounded-xl border border-border/60 bg-secondary/20 overflow-hidden h-full flex flex-col">
      {/* Header — like "Invoice details # 427-012" */}
      <div className="p-5 border-b border-border/30">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Action Details</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
            action.type === "hunt" ? "bg-chart-3/15 text-chart-3" :
            action.type === "apply" ? "bg-primary/15 text-primary" :
            "bg-chart-2/15 text-chart-2"
          }`}>
            {actionLabel}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-2">
          {/* Large species thumbnail — like the company logo area */}
          <SpeciesAvatar speciesId={action.speciesId} size={56} className="rounded-xl" />
          <div>
            <h2 className="text-lg font-bold">
              {state.name} — {formatSpeciesName(action.speciesId)}
            </h2>
            <p className="text-xs text-muted-foreground">
              {unitDetail ? `${unitDetail.unitName || unitDetail.unitCode}` : action.unitCode ?? "General"} · {action.year}
            </p>
          </div>
        </div>
      </div>

      {/* 3 Metric Chips — like the $10,630 / $31,892 / $10,630 row in the invoice */}
      <div className="grid grid-cols-3 gap-2 p-5 pb-3">
        <div className="p-3 rounded-xl bg-background/60 border border-border/30 text-center">
          <p className="text-xl font-bold">${action.cost.toLocaleString()}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">
            {action.type === "buy_points" ? "Point Cost" : action.type === "hunt" ? "Hunt Cost" : "Application"}
          </p>
        </div>
        {unitDetail && (
          <>
            <div className="p-3 rounded-xl bg-background/60 border border-border/30 text-center">
              <p className="text-xl font-bold flex items-center justify-center gap-1">
                <Target className="w-4 h-4 text-chart-3" />
                {Math.round(unitDetail.successRate * 100)}%
              </p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">Success Rate</p>
            </div>
            <div className="p-3 rounded-xl bg-background/60 border border-border/30 text-center">
              <p className="text-xl font-bold flex items-center justify-center gap-1">
                <Mountain className="w-4 h-4 text-chart-4" />
                {unitDetail.trophyRating}/10
              </p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">Trophy Rating</p>
            </div>
          </>
        )}
        {!unitDetail && (
          <>
            <div className="p-3 rounded-xl bg-background/60 border border-border/30 text-center">
              <p className="text-xl font-bold">{action.year}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">Year</p>
            </div>
            <div className="p-3 rounded-xl bg-background/60 border border-border/30 text-center">
              <p className="text-xl font-bold">{state.abbreviation}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">State</p>
            </div>
          </>
        )}
      </div>

      {/* Detail sections — scrollable */}
      <div className="flex-1 overflow-y-auto p-5 pt-2 space-y-4">
        {/* TLDR / Description */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Info className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">TLDR</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{action.description}</p>
        </div>

        {/* Point Strategy */}
        {stateRec && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Compass className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Point Strategy</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{stateRec.pointStrategy}</p>
          </div>
        )}

        {/* Draw Odds + Timeline */}
        {unitDetail?.drawConfidence && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Draw Odds</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-background/40 border border-border/20">
              <div className="text-center">
                <p className="text-lg font-bold text-chart-2">{unitDetail.drawConfidence.optimistic}</p>
                <p className="text-[8px] text-muted-foreground uppercase">Best</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{unitDetail.drawConfidence.expected}</p>
                <p className="text-[8px] text-muted-foreground uppercase">Expected</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-chart-4">{unitDetail.drawConfidence.pessimistic}</p>
                <p className="text-[8px] text-muted-foreground uppercase">Worst</p>
              </div>
              <span className="text-[10px] text-muted-foreground ml-auto">years to draw</span>
            </div>
            <p className="text-[10px] text-muted-foreground/60 mt-1">{unitDetail.drawTimeline}</p>
          </div>
        )}

        {/* Pro Tip */}
        {unitDetail?.tacticalNotes?.proTip && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/15">
            <div className="flex items-center gap-1.5 mb-1">
              <Star className="w-3 h-3 text-primary" />
              <span className="text-[10px] text-primary uppercase tracking-wider font-medium">Pro Tip</span>
            </div>
            <p className="text-xs text-primary/80 italic leading-relaxed">{unitDetail.tacticalNotes.proTip}</p>
          </div>
        )}

        {/* Tactical Notes */}
        {unitDetail?.tacticalNotes && (
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            {unitDetail.tacticalNotes.accessMethod && (
              <div className="p-2 rounded-lg bg-background/30">
                <p className="text-muted-foreground/50 uppercase text-[8px] mb-0.5">Access</p>
                <p className="text-muted-foreground">{unitDetail.tacticalNotes.accessMethod}</p>
              </div>
            )}
            {unitDetail.tacticalNotes.campingOptions && (
              <div className="p-2 rounded-lg bg-background/30">
                <p className="text-muted-foreground/50 uppercase text-[8px] mb-0.5">Camping</p>
                <p className="text-muted-foreground">{unitDetail.tacticalNotes.campingOptions}</p>
              </div>
            )}
            {unitDetail.tacticalNotes.typicalHuntLength && (
              <div className="p-2 rounded-lg bg-background/30">
                <p className="text-muted-foreground/50 uppercase text-[8px] mb-0.5">Duration</p>
                <p className="text-muted-foreground">{unitDetail.tacticalNotes.typicalHuntLength}</p>
              </div>
            )}
            {unitDetail.tacticalNotes.bestSeasonTier && (
              <div className="p-2 rounded-lg bg-background/30">
                <p className="text-muted-foreground/50 uppercase text-[8px] mb-0.5">Best Season</p>
                <p className="text-muted-foreground">{unitDetail.tacticalNotes.bestSeasonTier}</p>
              </div>
            )}
          </div>
        )}

        {/* Fee Breakdown */}
        {fees && (
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Fees</span>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {fees.qualifyingLicense > 0 && (
                <span className="text-[10px] px-2 py-1 rounded-lg bg-background/40 border border-border/20">
                  License <span className="font-semibold">${Math.round(fees.qualifyingLicense)}</span>
                </span>
              )}
              {fees.appFee > 0 && (
                <span className="text-[10px] px-2 py-1 rounded-lg bg-background/40 border border-border/20">
                  App Fee <span className="font-semibold">${Math.round(fees.appFee)}</span>
                </span>
              )}
              {(fees.pointCost[action.speciesId] ?? 0) > 0 && (
                <span className="text-[10px] px-2 py-1 rounded-lg bg-background/40 border border-border/20">
                  Point <span className="font-semibold">${Math.round(fees.pointCost[action.speciesId])}</span>
                </span>
              )}
              {(fees.tagCosts[action.speciesId] ?? 0) > 0 && (
                <span className="text-[10px] px-2 py-1 rounded-lg bg-background/40 border border-border/20 opacity-60">
                  Tag (if drawn) <span className="font-semibold">${Math.round(fees.tagCosts[action.speciesId]).toLocaleString()}</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer: F&G Link — the yellow "Pay out now" button */}
      <div className="p-4 border-t border-border/30">
        {(action.url || state.fgUrl) && (
          <a
            href={action.url || state.fgUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#c8e64c] hover:bg-[#b8d63c] text-[#1a1a1a] font-semibold text-sm transition-colors"
          >
            {action.type === "buy_points" ? "Buy Points at F&G" : action.type === "apply" ? "Apply at F&G" : "Visit F&G"}
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}
