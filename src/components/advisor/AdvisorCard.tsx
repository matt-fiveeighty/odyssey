"use client";

import type { AdvisorInsight, AdvisorInsightCategory, AdvisorUrgency } from "@/lib/types";
import {
  Clock,
  Shield,
  TrendingUp,
  AlertTriangle,
  Target,
  RefreshCw,
  Calendar,
  PiggyBank,
  Binoculars,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

// --- Urgency color mapping (matches canonical urgency tokens from urgency.ts) ---

const URGENCY_STYLES: Record<
  AdvisorUrgency,
  { text: string; dot: string; border: string; bg: string; hoverBg: string }
> = {
  immediate: {
    text: "text-destructive",
    dot: "bg-destructive",
    border: "border-destructive/20",
    bg: "bg-destructive/5",
    hoverBg: "hover:bg-destructive/10",
  },
  soon: {
    text: "text-warning",
    dot: "bg-warning",
    border: "border-warning/20",
    bg: "bg-warning/5",
    hoverBg: "hover:bg-warning/10",
  },
  informational: {
    text: "text-chart-2",
    dot: "bg-chart-2",
    border: "border-chart-2/20",
    bg: "bg-chart-2/5",
    hoverBg: "hover:bg-chart-2/10",
  },
  positive: {
    text: "text-primary",
    dot: "bg-primary",
    border: "border-primary/20",
    bg: "bg-primary/5",
    hoverBg: "hover:bg-primary/10",
  },
};

// --- Category icon mapping ---

const CATEGORY_ICONS: Record<AdvisorInsightCategory, React.ComponentType<{ className?: string }>> = {
  deadline: Clock,
  portfolio: Shield,
  point_creep: TrendingUp,
  discipline: AlertTriangle,
  milestone: Target,
  temporal: RefreshCw,
  calendar: Calendar,
  savings: PiggyBank,
  scouting: Binoculars,
};

// --- Component ---

export function AdvisorCard({ insight }: { insight: AdvisorInsight }) {
  const style = URGENCY_STYLES[insight.urgency];
  const Icon = CATEGORY_ICONS[insight.category];

  const ctaClasses = `inline-flex items-center gap-1 text-xs font-medium mt-2 px-2.5 py-1 rounded-lg ${style.text} ${style.hoverBg} transition-colors`;

  return (
    <div className={`p-3 rounded-xl border transition-all ${style.bg} ${style.border}`}>
      {/* Top row: urgency dot + category icon + interpretation */}
      <div className="flex items-start gap-2">
        <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${style.dot}`} />
        <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${style.text}`} />
        <p className={`text-sm font-medium ${style.text}`}>{insight.interpretation}</p>
      </div>

      {/* Portfolio and temporal context */}
      {(insight.portfolioContext || insight.temporalContext) && (
        <div className="mt-1.5 ml-8 space-y-0.5">
          {insight.portfolioContext && (
            <p className="text-xs text-muted-foreground italic">{insight.portfolioContext}</p>
          )}
          {insight.temporalContext && (
            <p className="text-xs text-muted-foreground italic">{insight.temporalContext}</p>
          )}
        </div>
      )}

      {/* Recommendation */}
      <p className="text-xs text-muted-foreground leading-relaxed mt-1.5 ml-8">
        {insight.recommendation}
      </p>

      {/* CTA */}
      <div className="ml-8">
        {insight.cta.external ? (
          <a
            href={insight.cta.href}
            target="_blank"
            rel="noopener noreferrer"
            className={ctaClasses}
          >
            {insight.cta.label}
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <Link href={insight.cta.href} className={ctaClasses}>
            {insight.cta.label}
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
