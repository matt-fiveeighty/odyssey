"use client";

import { useState, useEffect } from "react";
import type { VerifiedDatum, DataConfidence } from "@/lib/engine/verified-datum";

// ---------------------------------------------------------------------------
// Confidence visual mapping
// ---------------------------------------------------------------------------

const CONFIDENCE_COLORS: Record<DataConfidence, string> = {
  verified: "bg-emerald-500",
  user_reported: "bg-blue-500",
  estimated: "bg-amber-500",
  stale: "bg-red-500",
};

const CONFIDENCE_LABELS: Record<DataConfidence, string> = {
  verified: "Verified",
  user_reported: "User Reported",
  estimated: "Estimated",
  stale: "Stale",
};

const CONFIDENCE_DESCRIPTIONS: Record<DataConfidence, string> = {
  verified: "Scraped directly from state Fish & Game website",
  user_reported: "Reported by a user and awaiting verification",
  estimated: "Estimated based on historical data and heuristics",
  stale: "Data is older than expected — may be outdated",
};

// ---------------------------------------------------------------------------
// FreshnessBadge
// ---------------------------------------------------------------------------

interface FreshnessBadgeProps {
  datum: VerifiedDatum<unknown>;
  /** Optional: show inline text label (default true) */
  showLabel?: boolean;
  className?: string;
}

/**
 * Datum-level provenance indicator.
 *
 * Renders a colored confidence dot (green=verified, blue=user_reported,
 * amber=estimated, red=stale) with an optional text label and a hover
 * tooltip showing the confidence explanation, source label, relative
 * update time, and a "View source" link.
 *
 * All staleness/time computations run client-side via useEffect to
 * avoid server/client hydration mismatches (Pitfall 6).
 */
export function FreshnessBadge({
  datum,
  showLabel = true,
  className = "",
}: FreshnessBadgeProps) {
  // Compute effective confidence — isStale overrides to "stale"
  const effective: DataConfidence = datum.isStale ? "stale" : datum.confidence;

  // Client-only relative time to avoid hydration flicker
  const [relativeTime, setRelativeTime] = useState<string>("");

  useEffect(() => {
    if (!datum.source.scrapedAt) {
      setRelativeTime("No date available");
      return;
    }
    const days = Math.floor(
      (Date.now() - new Date(datum.source.scrapedAt).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (days === 0) setRelativeTime("Today");
    else if (days === 1) setRelativeTime("Yesterday");
    else if (days < 30) setRelativeTime(`${days} days ago`);
    else if (days < 365)
      setRelativeTime(`${Math.floor(days / 30)} months ago`);
    else setRelativeTime(`${Math.floor(days / 365)} years ago`);
  }, [datum.source.scrapedAt]);

  return (
    <span
      className={`group relative inline-flex items-center gap-1 ${className}`}
    >
      {/* Confidence dot */}
      <span
        className={`w-1.5 h-1.5 rounded-full ${CONFIDENCE_COLORS[effective]}`}
      />

      {/* Optional text label */}
      {showLabel && (
        <span className="text-[9px] text-muted-foreground/60">
          {CONFIDENCE_LABELS[effective]}
        </span>
      )}

      {/* Provenance tooltip (shown on hover) */}
      <div className="absolute bottom-full left-0 mb-1 w-56 rounded-md bg-popover/95 backdrop-blur-sm border border-border p-2.5 text-[10px] shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-50">
        <div className="font-medium text-foreground">
          {CONFIDENCE_LABELS[effective]}
        </div>
        <div className="text-muted-foreground mt-0.5">
          {CONFIDENCE_DESCRIPTIONS[effective]}
        </div>
        {datum.source.url && (
          <div className="mt-1.5 text-muted-foreground/80">
            <span className="font-medium">Source:</span> {datum.source.label}
          </div>
        )}
        {datum.source.scrapedAt && (
          <div className="text-muted-foreground/80">
            <span className="font-medium">Updated:</span> {relativeTime}
          </div>
        )}
        {datum.source.url && (
          <a
            href={datum.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-primary/60 hover:text-primary underline-offset-2 hover:underline"
          >
            View source
          </a>
        )}
      </div>
    </span>
  );
}
