"use client";

import { useMemo } from "react";
import { useRoadmapStore } from "@/lib/store";
import { STATES_MAP } from "@/lib/constants/states";
import { SPECIES_MAP } from "@/lib/constants/species";
import { StateOutline } from "@/components/shared/StateOutline";
import { SpeciesAvatar } from "@/components/shared/SpeciesAvatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  DollarSign,
  MapPin,
  Crosshair,
  TrendingUp,
  AlertTriangle,
  Shield,
  Info,
} from "lucide-react";

export default function PortfolioPage() {
  const activeAssessment = useRoadmapStore((s) => s.activeAssessment);

  // Build species coverage matrix from roadmap
  const speciesMatrix = useMemo(() => {
    if (!activeAssessment) return [];
    const matrix = new Map<string, Set<string>>();
    for (const year of activeAssessment.roadmap) {
      for (const action of year.actions) {
        if (!matrix.has(action.speciesId)) {
          matrix.set(action.speciesId, new Set());
        }
        matrix.get(action.speciesId)!.add(action.stateId);
      }
    }
    return Array.from(matrix.entries()).map(([speciesId, states]) => ({
      speciesId,
      speciesName: SPECIES_MAP[speciesId]?.name ?? speciesId,
      states: Array.from(states),
    }));
  }, [activeAssessment]);

  // Concentration analysis
  const concentrationData = useMemo(() => {
    if (!activeAssessment) return null;
    const recs = activeAssessment.stateRecommendations;
    const total = recs.reduce((s, r) => s + r.annualCost, 0);
    if (total === 0) return null;

    const byState = recs.map((r) => ({
      stateId: r.stateId,
      stateName: STATES_MAP[r.stateId]?.name ?? r.stateId,
      cost: r.annualCost,
      pct: Math.round((r.annualCost / total) * 100),
      role: r.role,
    }));

    const topState = byState.sort((a, b) => b.pct - a.pct)[0];
    const isConcentrated = topState && topState.pct > 40;

    const roleDistribution = {
      primary: recs.filter((r) => r.role === "primary").length,
      secondary: recs.filter((r) => r.role === "secondary").length,
      wildcard: recs.filter((r) => r.role === "wildcard").length,
      long_term: recs.filter((r) => r.role === "long_term").length,
    };

    return { byState, topState, isConcentrated, roleDistribution };
  }, [activeAssessment]);

  if (!activeAssessment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <PieChart className="w-10 h-10 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          Build a roadmap first. Your portfolio view will show your full investment breakdown.
        </p>
      </div>
    );
  }

  const stateCount = activeAssessment.stateRecommendations.length;
  const totalCost = activeAssessment.financialSummary.annualSubscription;
  const tenYearTotal = activeAssessment.financialSummary.tenYearTotal;
  const yearOne = activeAssessment.financialSummary.yearOneInvestment;

  const ROLE_COLORS: Record<string, string> = {
    primary: "text-primary bg-primary/10 border-primary/20",
    secondary: "text-chart-2 bg-chart-2/10 border-chart-2/20",
    wildcard: "text-chart-3 bg-chart-3/10 border-chart-3/20",
    long_term: "text-chart-4 bg-chart-4/10 border-chart-4/20",
  };

  return (
    <div className="p-6 space-y-6 fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <PieChart className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-semibold">Portfolio</h1>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          icon={<MapPin className="w-4 h-4 text-info" />}
          label="Active States"
          value={String(stateCount)}
        />
        <KpiCard
          icon={<DollarSign className="w-4 h-4 text-success" />}
          label="Annual Cost"
          value={`$${Math.round(totalCost).toLocaleString()}`}
        />
        <KpiCard
          icon={<TrendingUp className="w-4 h-4 text-primary" />}
          label="Year One"
          value={`$${Math.round(yearOne).toLocaleString()}`}
        />
        <KpiCard
          icon={<Crosshair className="w-4 h-4 text-warning" />}
          label="Species"
          value={String(speciesMatrix.length)}
        />
      </div>

      {/* Main grid: Left = allocation, Right = analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Allocation Breakdown */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Allocation Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeAssessment.stateRecommendations.map((rec) => {
              const state = STATES_MAP[rec.stateId];
              const pct = totalCost > 0 ? Math.round((rec.annualCost / totalCost) * 100) : 0;
              return (
                <div key={rec.stateId} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StateOutline stateId={rec.stateId} size={20} strokeColor="white" strokeWidth={2} fillColor="rgba(255,255,255,0.1)" />
                      <span className="text-sm font-medium">{state?.name ?? rec.stateId}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-semibold capitalize ${ROLE_COLORS[rec.role] ?? "text-muted-foreground"}`}>
                        {rec.role.replace("_", " ")}
                      </span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">${Math.round(rec.annualCost).toLocaleString()}/yr</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  {/* Info bullets — contextual state facts */}
                  {state && (
                    <div className="space-y-0.5 ml-0.5">
                      {state.applicationApproachDescription && (
                        <p className="text-[9px] text-muted-foreground/50 flex items-start gap-1">
                          <Info className="w-2.5 h-2.5 shrink-0 mt-px" />
                          {state.applicationApproachDescription}
                        </p>
                      )}
                      {(state.licenseFees.qualifyingLicense ?? 0) > 0 && (
                        <p className="text-[9px] text-muted-foreground/50 flex items-start gap-1">
                          <Info className="w-2.5 h-2.5 shrink-0 mt-px" />
                          Requires ${Math.round(state.licenseFees.qualifyingLicense!)} qualifying license
                        </p>
                      )}
                      {state.pointSystem && (
                        <p className="text-[9px] text-muted-foreground/50 flex items-start gap-1">
                          <Info className="w-2.5 h-2.5 shrink-0 mt-px" />
                          {state.pointSystemDetails.description}
                        </p>
                      )}
                      {state.onceInALifetime && state.onceInALifetime.length > 0 && (
                        <p className="text-[9px] text-warning/60 flex items-start gap-1">
                          <AlertTriangle className="w-2.5 h-2.5 shrink-0 mt-px" />
                          Once-in-a-lifetime: {state.onceInALifetime.map(s => SPECIES_MAP[s]?.name ?? s).join(", ")}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Total */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-sm font-semibold">Total Annual</span>
              <span className="text-lg font-bold text-primary">${Math.round(totalCost).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* RIGHT: Analytics */}
        <div className="space-y-4">
          {/* Species Coverage Matrix */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-warning" />
                Species Coverage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {speciesMatrix.map((sp) => (
                <div key={sp.speciesId} className="flex items-center gap-3 py-1.5">
                  <SpeciesAvatar speciesId={sp.speciesId} size={28} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{sp.speciesName}</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {sp.states.map((stateId) => (
                        <span key={stateId} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-semibold">
                          {stateId}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {sp.states.length} state{sp.states.length !== 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Concentration Analysis */}
          {concentrationData && (
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-info" />
                  Concentration Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Role distribution */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: "Primary", count: concentrationData.roleDistribution.primary, color: "text-primary" },
                    { label: "Secondary", count: concentrationData.roleDistribution.secondary, color: "text-info" },
                    { label: "Wildcard", count: concentrationData.roleDistribution.wildcard, color: "text-warning" },
                    { label: "Long Term", count: concentrationData.roleDistribution.long_term, color: "text-chart-4" },
                  ].map((role) => (
                    <div key={role.label} className="p-2 rounded-lg bg-secondary/20">
                      <p className={`text-lg font-bold ${role.color}`}>{role.count}</p>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{role.label}</p>
                    </div>
                  ))}
                </div>

                {/* Concentration warning */}
                {concentrationData.isConcentrated && concentrationData.topState && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                    <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                    <div className="text-xs text-muted-foreground">
                      <span className="font-semibold text-warning">{concentrationData.topState.pct}%</span> of your annual cost is in{" "}
                      <span className="font-semibold">{concentrationData.topState.stateName}</span>. Consider diversifying to reduce risk from a single state&apos;s draw system.
                    </div>
                  </div>
                )}

                {!concentrationData.isConcentrated && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
                    <Shield className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      Your portfolio is well diversified. No single state exceeds 40% of your annual cost.
                    </p>
                  </div>
                )}

                {/* Financial summary */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">10 Year Total</p>
                    <p className="text-sm font-bold">${Math.round(tenYearTotal).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">ROI Rating</p>
                    <p className="text-sm font-bold">{activeAssessment.financialSummary.roi}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-card border border-border/50">
      {icon}
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </div>
  );
}
