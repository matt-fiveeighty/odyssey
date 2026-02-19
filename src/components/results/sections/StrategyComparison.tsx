"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Zap,
  Shield,
  Scale,
  TrendingUp,
  DollarSign,
  Clock,
  Target,
  Crosshair,
  ArrowRight,
  Check,
} from "lucide-react";
import type { StrategicAssessment } from "@/lib/types";

interface StrategyComparisonProps {
  assessment: StrategicAssessment;
}

interface StrategyVariant {
  id: "aggressive" | "balanced" | "conservative";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  stateCount: number;
  firstHuntYear: number;
  totalHunts10yr: number;
  tenYearCost: number;
  annualAvg: number;
  riskLevel: "High" | "Medium" | "Low";
  pointBurnYear: number;
  highlights: string[];
  color: string;
}

/**
 * Generates 3 strategy variants from the confirmed assessment:
 * - Aggressive: More states, earlier burns, higher spend
 * - Balanced: The actual generated plan (engine-scored)
 * - Conservative: Fewer states, longer build, lower annual cost
 *
 * Note: Aggressive and Conservative variants are derived from the
 * Balanced plan using adjusted parameters, not re-scored through the
 * full engine. The Balanced plan is the only engine-scored result.
 */
function deriveVariants(assessment: StrategicAssessment): StrategyVariant[] {
  const currentYear = new Date().getFullYear();
  const recs = assessment.stateRecommendations;
  const roadmap = assessment.roadmap;
  const totalCost = assessment.financialSummary.tenYearTotal;
  const huntYears = roadmap.filter((y) => y.isHuntYear).length;
  const firstHunt = roadmap.find((y) => y.isHuntYear)?.year ?? currentYear + 5;
  const burnYear = roadmap.find((y) => y.phase === "burn")?.year ?? currentYear + 4;

  // Aggressive: scale cost by per-state addition + earlier hunt year bump
  const aggressiveStates = Math.min(recs.length + 2, 8);
  const costPerState = recs.length > 0 ? totalCost / recs.length : totalCost;
  const aggressiveFirstHunt = Math.max(currentYear + 1, firstHunt - 2);
  const aggressiveHunts = Math.min(huntYears + 3, 8);
  const aggressiveCost = Math.round(costPerState * aggressiveStates * 1.05); // 5% premium for accelerated timeline

  // Conservative: reduce to fewer states, scale proportionally
  const conservativeStates = Math.max(recs.length - 1, 1);
  const conservativeFirstHunt = firstHunt + 2;
  const conservativeHunts = Math.max(huntYears - 1, 1);
  const conservativeCost = Math.round(costPerState * conservativeStates * 0.95); // 5% savings from longer build

  return [
    {
      id: "aggressive",
      label: "Aggressive",
      icon: Zap,
      description: "Maximum tags, faster timelines. Higher annual spend but more hunts in 10 years.",
      stateCount: aggressiveStates,
      firstHuntYear: aggressiveFirstHunt,
      totalHunts10yr: aggressiveHunts,
      tenYearCost: aggressiveCost,
      annualAvg: Math.round(aggressiveCost / 10),
      riskLevel: "High",
      pointBurnYear: Math.max(currentYear + 2, burnYear - 2),
      highlights: [
        `Apply in ${aggressiveStates} states simultaneously`,
        `First hunt as early as ${aggressiveFirstHunt}`,
        `Target ${aggressiveHunts} hunts in 10 years`,
        "Burn points aggressively at 70% draw probability",
        "Higher financial commitment but maximum field time",
      ],
      color: "chart-4",
    },
    {
      id: "balanced",
      label: "Balanced",
      icon: Scale,
      description: "Your recommended strategy. Optimized risk-reward across states and timeline.",
      stateCount: recs.length,
      firstHuntYear: firstHunt,
      totalHunts10yr: huntYears,
      tenYearCost: totalCost,
      annualAvg: Math.round(totalCost / 10),
      riskLevel: "Medium",
      pointBurnYear: burnYear,
      highlights: [
        `${recs.length} states in your portfolio`,
        `First hunt projected for ${firstHunt}`,
        `${huntYears} hunts planned over 10 years`,
        "Strategic burn at optimal point thresholds",
        "Budget-matched to your targets",
      ],
      color: "primary",
    },
    {
      id: "conservative",
      label: "Conservative",
      icon: Shield,
      description: "Lower annual cost, longer point build. Prioritizes premium tags over frequency.",
      stateCount: conservativeStates,
      firstHuntYear: conservativeFirstHunt,
      totalHunts10yr: conservativeHunts,
      tenYearCost: conservativeCost,
      annualAvg: Math.round(conservativeCost / 10),
      riskLevel: "Low",
      pointBurnYear: burnYear + 2,
      highlights: [
        `Focus on ${conservativeStates} high-priority state${conservativeStates > 1 ? "s" : ""}`,
        `Patient build — first hunt around ${conservativeFirstHunt}`,
        "Maximize point accumulation for trophy units",
        "Lower annual financial commitment",
        `~$${Math.round(conservativeCost / 10).toLocaleString()}/yr average investment`,
      ],
      color: "chart-2",
    },
  ];
}

export function StrategyComparison({ assessment }: StrategyComparisonProps) {
  const variants = useMemo(() => deriveVariants(assessment), [assessment]);
  const [selected, setSelected] = useState<"aggressive" | "balanced" | "conservative">("balanced");

  const metrics = [
    { label: "States", key: "stateCount" as const, suffix: "" },
    { label: "First Hunt", key: "firstHuntYear" as const, suffix: "" },
    { label: "10-Yr Hunts", key: "totalHunts10yr" as const, suffix: "" },
    { label: "10-Year Cost", key: "tenYearCost" as const, suffix: "", format: (v: number) => `$${v.toLocaleString()}` },
    { label: "Annual Avg", key: "annualAvg" as const, suffix: "/yr", format: (v: number) => `$${v.toLocaleString()}` },
    { label: "Risk Level", key: "riskLevel" as const, suffix: "" },
  ];

  return (
    <div className="space-y-6">
      {/* Strategy cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {variants.map((v) => {
          const isSelected = selected === v.id;
          const Icon = v.icon;
          return (
            <button
              key={v.id}
              onClick={() => setSelected(v.id)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? `border-${v.color} bg-${v.color}/5 ring-1 ring-${v.color}/20`
                  : "border-border bg-card hover:border-primary/20"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg bg-${v.color}/15 flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 text-${v.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{v.label}</h3>
                  {v.id === "balanced" && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-semibold">
                      RECOMMENDED
                    </span>
                  )}
                </div>
                {isSelected && <Check className="w-4 h-4 text-primary ml-auto" />}
              </div>
              <p className="text-xs text-muted-foreground">{v.description}</p>

              {/* Quick stats */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="text-center p-2 rounded-lg bg-secondary/30">
                  <p className="text-lg font-bold">{v.totalHunts10yr}</p>
                  <p className="text-[9px] text-muted-foreground">hunts / 10yr</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-secondary/30">
                  <p className="text-lg font-bold">${(v.annualAvg / 1000).toFixed(1)}k</p>
                  <p className="text-[9px] text-muted-foreground">per year</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Comparison table */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-chart-4 via-primary to-chart-2" />
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-xs text-muted-foreground font-medium">Metric</th>
                {variants.map((v) => (
                  <th
                    key={v.id}
                    className={`text-center p-3 text-xs font-semibold ${
                      selected === v.id ? "text-primary bg-primary/5" : "text-muted-foreground"
                    }`}
                  >
                    {v.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => (
                <tr key={m.label} className="border-b border-border/50">
                  <td className="p-3 text-xs text-muted-foreground">{m.label}</td>
                  {variants.map((v) => {
                    const val = v[m.key];
                    const display = m.format ? m.format(val as number) : `${val}${m.suffix}`;
                    return (
                      <td
                        key={v.id}
                        className={`text-center p-3 text-xs font-medium ${
                          selected === v.id ? "text-foreground bg-primary/5 font-semibold" : ""
                        }`}
                      >
                        {display}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Selected strategy detail */}
      {(() => {
        const v = variants.find((v) => v.id === selected)!;
        const Icon = v.icon;
        return (
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl bg-${v.color}/15 flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 text-${v.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold">{v.label} Strategy</h3>
                  <p className="text-xs text-muted-foreground">{v.description}</p>
                </div>
              </div>

              <div className="space-y-2">
                {v.highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{h}</span>
                  </div>
                ))}
              </div>

              {/* Timeline visualization */}
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground font-semibold mb-2">10-Year Timeline</p>
                <div className="flex gap-1">
                  {Array.from({ length: 10 }, (_, i) => {
                    const yr = new Date().getFullYear() + i;
                    const isBuild = yr < v.pointBurnYear;
                    const isBurn = yr >= v.pointBurnYear && yr < v.firstHuntYear;
                    const isHunt = yr >= v.firstHuntYear;
                    return (
                      <div key={yr} className="flex-1 text-center">
                        <div
                          className={`h-8 rounded-md flex items-center justify-center text-[8px] font-bold text-white ${
                            isHunt ? "bg-chart-2" : isBurn ? "bg-chart-4" : "bg-chart-1"
                          }`}
                        >
                          {isHunt ? <Crosshair className="w-3 h-3" /> : isBurn ? <Target className="w-3 h-3" /> : null}
                        </div>
                        <p className="text-[8px] text-muted-foreground mt-0.5 font-mono">{String(yr).slice(2)}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-4 mt-2">
                  <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                    <div className="w-2.5 h-2.5 rounded-sm bg-chart-1" /> Build
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                    <div className="w-2.5 h-2.5 rounded-sm bg-chart-4" /> Burn
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                    <div className="w-2.5 h-2.5 rounded-sm bg-chart-2" /> Hunt
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Methodology disclosure */}
      <p className="text-[10px] text-muted-foreground/50 text-center leading-relaxed">
        The Balanced strategy is your engine-scored recommendation. Aggressive and Conservative variants are estimates
        derived from the Balanced plan using adjusted state counts and timelines &mdash; they are not independently scored.
      </p>
    </div>
  );
}
