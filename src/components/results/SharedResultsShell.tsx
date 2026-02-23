"use client";

import Link from "next/link";
import type {
  StrategicAssessment,
  StateRecommendation,
  RoadmapYear,
  RoadmapAction,
} from "@/lib/types";
import { YEAR_TYPE_LABELS } from "@/lib/types";
import { STATES_MAP } from "@/lib/constants/states";
import { SpeciesAvatar } from "@/components/shared/SpeciesAvatar";
import { formatSpeciesName, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Clock,
  ArrowRight,
  MapPin,
  Target,
  DollarSign,
  Calendar,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SharedResultsShellProps {
  assessment: StrategicAssessment;
  expiresAt: string; // ISO date string of expiration
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROLE_COLORS: Record<string, string> = {
  primary: "bg-primary/15 text-primary",
  secondary: "bg-chart-2/15 text-chart-2",
  wildcard: "bg-chart-3/15 text-chart-3",
  long_term: "bg-chart-4/15 text-chart-4",
};

const ACTION_TYPE_BADGES: Record<
  string,
  { label: string; color: string }
> = {
  apply: { label: "Apply", color: "bg-info/15 text-info" },
  buy_points: { label: "Buy Points", color: "bg-warning/15 text-warning" },
  hunt: { label: "Hunt", color: "bg-success/15 text-success" },
  scout: { label: "Scout", color: "bg-premium/15 text-premium" },
};

function formatExpirationDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Sub-sections (all inline, zero Zustand)
// ---------------------------------------------------------------------------

function ExpirationBanner({ expiresAt }: { expiresAt: string }) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-secondary/50 border border-border">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="w-4 h-4 shrink-0" />
        <span>
          Shared Hunt Strategy &mdash; expires{" "}
          {formatExpirationDate(expiresAt)}
        </span>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href="/plan-builder" className="gap-1.5">
          Create your own plan <ArrowRight className="w-4 h-4" />
        </Link>
      </Button>
    </div>
  );
}

function HeroSection({
  assessment,
}: {
  assessment: StrategicAssessment;
}) {
  const { financialSummary, stateRecommendations, macroSummary } = assessment;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#1a2332] to-[#0f1923] border border-primary/20 p-6 md:p-8">
      <h2 className="text-lg font-bold mb-2">Hunt Strategy Overview</h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-2">
        {assessment.profileSummary}
      </p>
      <p className="text-xs text-muted-foreground/70 italic mb-6">
        {assessment.strategyOverview}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          value={String(stateRecommendations.length)}
          label="States"
          color="text-primary"
        />
        <StatCard
          value={String(macroSummary.plannedHunts)}
          label="Planned Hunts"
          color="text-chart-3"
        />
        <StatCard
          value={formatCurrency(financialSummary.tenYearTotal)}
          label="10-Year Total"
          color="text-chart-4"
        />
        <StatCard
          value={formatCurrency(financialSummary.yearOneInvestment)}
          label="Year 1 Investment"
          color="text-chart-2"
        />
      </div>
    </div>
  );
}

function StatCard({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color: string;
}) {
  return (
    <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
        {label}
      </p>
    </div>
  );
}

function StateRecommendationCard({ rec }: { rec: StateRecommendation }) {
  const state = STATES_MAP[rec.stateId];
  if (!state) return null;

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-sm font-bold shrink-0">
            {state.abbreviation}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold">{state.name}</span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${ROLE_COLORS[rec.role] ?? "bg-secondary text-muted-foreground"}`}
              >
                {rec.roleDescription}
              </span>
              <span className="text-xs text-muted-foreground ml-auto">
                {formatCurrency(rec.annualCost)}/yr
              </span>
            </div>

            {/* Species avatars */}
            {state.availableSpecies.length > 0 && (
              <div className="flex gap-1 mb-2">
                {state.availableSpecies.slice(0, 6).map((sp) => (
                  <SpeciesAvatar key={sp} speciesId={sp} size={18} />
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground leading-relaxed">
              {rec.reason}
            </p>
          </div>
        </div>

        {/* Point Strategy */}
        <div className="mb-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
            Point Strategy
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {rec.pointStrategy}
          </p>
        </div>

        {/* Best Units */}
        {rec.bestUnits.length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
              Recommended Units
            </p>
            <div className="space-y-2">
              {rec.bestUnits.map((unit, ui) => (
                <div
                  key={ui}
                  className="p-2.5 rounded-lg bg-secondary/30 border border-border/50"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold">
                      {unit.unitName || unit.unitCode}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {unit.drawTimeline}
                    </span>
                  </div>
                  <div className="flex gap-3 text-[10px] text-muted-foreground">
                    <span>
                      <Target className="w-3 h-3 inline mr-0.5" />
                      {Math.round(unit.successRate * 100)}% success
                    </span>
                    <span>
                      <MapPin className="w-3 h-3 inline mr-0.5" />
                      {unit.trophyRating}/10 trophy
                    </span>
                  </div>
                  {unit.drawConfidence && (
                    <div className="mt-1.5 flex items-center gap-2 text-[9px] text-muted-foreground/70">
                      <span>Draw range:</span>
                      <span className="text-chart-2 font-medium">
                        Yr {unit.drawConfidence.optimistic}
                      </span>
                      <span>&ndash;</span>
                      <span className="font-medium">
                        Yr {unit.drawConfidence.expected}
                      </span>
                      <span>&ndash;</span>
                      <span className="text-chart-4 font-medium">
                        Yr {unit.drawConfidence.pessimistic}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RoadmapTimeline({
  roadmap,
}: {
  roadmap: RoadmapYear[];
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold flex items-center gap-2">
        <Calendar className="w-4 h-4 text-primary" />
        10-Year Roadmap
      </h3>

      {roadmap.map((yr) => {
        const yearTypeLabel =
          YEAR_TYPE_LABELS[yr.phase as keyof typeof YEAR_TYPE_LABELS] ??
          yr.phaseLabel ??
          yr.phase;

        return (
          <div
            key={yr.year}
            className="rounded-xl border border-border overflow-hidden"
          >
            {/* Year header */}
            <div className="flex items-center justify-between p-3 bg-secondary/20">
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm">{yr.year}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-primary/10 text-primary capitalize">
                  {yearTypeLabel}
                </span>
                {yr.isHuntYear && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-chart-2/15 text-chart-2 font-medium">
                    Hunt Year
                  </span>
                )}
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {formatCurrency(yr.estimatedCost)}
              </span>
            </div>

            {/* Actions */}
            <div className="p-3 space-y-2">
              {yr.actions.map((action, ai) => (
                <RoadmapActionRow key={ai} action={action} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RoadmapActionRow({ action }: { action: RoadmapAction }) {
  const state = STATES_MAP[action.stateId];
  const badge = ACTION_TYPE_BADGES[action.type] ?? ACTION_TYPE_BADGES.buy_points;

  return (
    <div className="flex items-start gap-2 p-2 rounded-lg bg-secondary/10">
      {state && (
        <div className="w-7 h-7 rounded bg-secondary flex items-center justify-center text-[8px] font-bold shrink-0">
          {state.abbreviation}
        </div>
      )}
      {action.speciesId && (
        <SpeciesAvatar speciesId={action.speciesId} size={22} />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span
            className={`text-[8px] px-1.5 py-0.5 rounded font-medium ${badge.color}`}
          >
            {badge.label}
          </span>
          {action.speciesId && (
            <span className="text-[10px] text-muted-foreground">
              {formatSpeciesName(action.speciesId)}
            </span>
          )}
        </div>
        <p className="text-xs font-medium">{action.description}</p>
        <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5">
          {action.unitCode && (
            <span className="font-mono">Unit {action.unitCode}</span>
          )}
          {action.estimatedDrawOdds != null && action.estimatedDrawOdds > 0 && (
            <span>{action.estimatedDrawOdds}% draw odds</span>
          )}
          <span className="font-mono">{formatCurrency(action.cost)}</span>
          {action.dueDate && <span>Due: {action.dueDate}</span>}
        </div>
      </div>
    </div>
  );
}

function FinancialSummarySection({
  assessment,
}: {
  assessment: StrategicAssessment;
}) {
  const { financialSummary, budgetBreakdown } = assessment;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-primary" />
        Financial Summary
      </h3>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            Annual Subscription
          </p>
          <p className="text-xl font-bold text-primary">
            {formatCurrency(financialSummary.annualSubscription)}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            10-Year Total
          </p>
          <p className="text-xl font-bold text-chart-4">
            {formatCurrency(financialSummary.tenYearTotal)}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            Year 1 Investment
          </p>
          <p className="text-xl font-bold text-chart-2">
            {formatCurrency(financialSummary.yearOneInvestment)}
          </p>
        </div>
      </div>

      {/* Budget breakdown */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-3 rounded-xl bg-secondary/30 border border-border/50">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
            Point Year
          </p>
          <p className="text-lg font-bold text-primary">
            {formatCurrency(budgetBreakdown.pointYearCost)}
          </p>
          <div className="space-y-1 mt-2">
            {budgetBreakdown.pointYearItems.slice(0, 8).map((item, i) => (
              <div key={i} className="flex justify-between text-[10px]">
                <span className="text-muted-foreground truncate mr-2">
                  {item.label}
                </span>
                <span className="text-foreground font-mono">
                  {formatCurrency(item.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-secondary/30 border border-border/50">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
            Hunt Year
          </p>
          <p className="text-lg font-bold text-chart-2">
            {formatCurrency(budgetBreakdown.huntYearCost)}
          </p>
          <div className="space-y-1 mt-2">
            {budgetBreakdown.huntYearItems.slice(0, 8).map((item, i) => (
              <div key={i} className="flex justify-between text-[10px]">
                <span className="text-muted-foreground truncate mr-2">
                  {item.label}
                </span>
                <span className="text-foreground font-mono">
                  {formatCurrency(item.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BottomCta() {
  return (
    <div className="text-center py-10 border-t border-border">
      <h3 className="text-lg font-semibold mb-2">
        Ready to build your own strategy?
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Get a personalized 10-year western big game hunting roadmap in minutes.
      </p>
      <Button asChild size="lg">
        <Link href="/plan-builder">Start Your Plan</Link>
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SharedResultsShell({
  assessment,
  expiresAt,
}: SharedResultsShellProps) {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <ExpirationBanner expiresAt={expiresAt} />
      <HeroSection assessment={assessment} />

      {/* State Recommendations */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          State Recommendations
        </h3>
        {assessment.stateRecommendations.map((rec) => (
          <StateRecommendationCard key={rec.stateId} rec={rec} />
        ))}
      </div>

      {/* Roadmap Timeline */}
      <RoadmapTimeline roadmap={assessment.roadmap} />

      {/* Financial Summary */}
      <FinancialSummarySection assessment={assessment} />

      {/* Bottom CTA */}
      <BottomCta />
    </div>
  );
}
