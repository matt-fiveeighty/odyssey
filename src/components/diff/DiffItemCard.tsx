"use client";

import type { DiffItem, DiffCategory } from "@/lib/types";
import type { AdvisorUrgency } from "@/lib/types";
import {
  AlertTriangle,
  TrendingUp,
  Sparkles,
  Info,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

// --- Category -> AdvisorUrgency mapping ---

const CATEGORY_URGENCY: Record<DiffCategory, AdvisorUrgency> = {
  action_required: "immediate",
  warning: "soon",
  opportunity: "informational",
  status_update: "positive",
};

// --- Urgency styling (mirrors AdvisorCard URGENCY_STYLES) ---

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

const CATEGORY_ICONS: Record<
  DiffCategory,
  React.ComponentType<{ className?: string }>
> = {
  action_required: AlertTriangle,
  warning: TrendingUp,
  opportunity: Sparkles,
  status_update: Info,
};

// --- Component ---

export function DiffItemCard({ item }: { item: DiffItem }) {
  const urgency = CATEGORY_URGENCY[item.category];
  const style = URGENCY_STYLES[urgency];
  const Icon = CATEGORY_ICONS[item.category];

  const ctaClasses = `inline-flex items-center gap-1 text-xs font-medium mt-2 px-2.5 py-1 rounded-lg ${style.text} ${style.hoverBg} transition-colors`;

  return (
    <div
      className={`p-3 rounded-xl border transition-all ${style.bg} ${style.border}`}
    >
      {/* Top row: urgency dot + category icon + headline */}
      <div className="flex items-start gap-2">
        <span
          className={`w-2 h-2 rounded-full mt-1 shrink-0 ${style.dot}`}
        />
        <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${style.text}`} />
        <p className={`text-sm font-medium ${style.text}`}>{item.headline}</p>
      </div>

      {/* Interpretation (advisor voice with temporal prefix) */}
      <p className="text-xs text-muted-foreground leading-relaxed mt-1.5 ml-8">
        {item.interpretation}
      </p>

      {/* Recommendation */}
      <p className="text-xs text-muted-foreground/80 leading-relaxed mt-1 ml-8">
        {item.recommendation}
      </p>

      {/* CTA */}
      <div className="ml-8">
        {item.cta.external ? (
          <a
            href={item.cta.href}
            target="_blank"
            rel="noopener noreferrer"
            className={ctaClasses}
          >
            {item.cta.label}
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <Link href={item.cta.href} className={ctaClasses}>
            {item.cta.label}
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
