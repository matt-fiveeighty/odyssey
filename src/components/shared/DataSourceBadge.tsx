"use client";

import { useState, useEffect } from "react";
import { Info } from "lucide-react";
import { STATES_MAP } from "@/lib/constants/states";

// ---------------------------------------------------------------------------
// Staleness thresholds (days)
// ---------------------------------------------------------------------------

/** Data is "fresh" if scraped within this many days */
const FRESH_THRESHOLD_DAYS = 7;
/** Data is "approaching stale" between FRESH and STALE thresholds */
const STALE_THRESHOLD_DAYS = 10;

type FreshnessLevel = "fresh" | "approaching" | "stale" | "unverified";

function getFreshnessLevel(lastScrapedAt?: string): FreshnessLevel {
  if (!lastScrapedAt) return "unverified";
  const daysSince = Math.floor(
    (Date.now() - new Date(lastScrapedAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSince <= FRESH_THRESHOLD_DAYS) return "fresh";
  if (daysSince <= STALE_THRESHOLD_DAYS) return "approaching";
  return "stale";
}

const FRESHNESS_DOT: Record<FreshnessLevel, string> = {
  fresh: "bg-emerald-500",
  approaching: "bg-amber-500",
  stale: "bg-red-500",
  unverified: "bg-muted-foreground/40",
};

const FRESHNESS_LABEL: Record<FreshnessLevel, string> = {
  fresh: "Verified",
  approaching: "Verify soon",
  stale: "Stale",
  unverified: "Unverified",
};

// ---------------------------------------------------------------------------
// DataSourceBadge — full version with freshness dot
// ---------------------------------------------------------------------------

interface DataSourceBadgeProps {
  stateId: string;
  /** E.g. "Fee Schedule" or "Application Deadlines" */
  dataType?: string;
  /** Show "Data last updated: {timestamp}" below the badge (default false) */
  showLastUpdated?: boolean;
  className?: string;
}

/**
 * Shows source agency, data type, verification date, and freshness indicator.
 * Green dot = fresh (<7d), amber = approaching stale (7-10d), red = stale (>10d).
 */
export function DataSourceBadge({
  stateId,
  dataType,
  showLastUpdated = false,
  className = "",
}: DataSourceBadgeProps) {
  const state = STATES_MAP[stateId];
  if (!state) return null;

  const freshness = getFreshnessLevel(state.lastScrapedAt);

  const lastScraped = state.lastScrapedAt
    ? new Date(state.lastScrapedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const stateAgencyName = getAgencyName(stateId);

  // Client-only relative time to avoid hydration flicker
  const [relativeTime, setRelativeTime] = useState<string>("");
  useEffect(() => {
    if (!state.lastScrapedAt) return;
    const days = Math.floor(
      (Date.now() - new Date(state.lastScrapedAt).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (days === 0) setRelativeTime("(today)");
    else if (days === 1) setRelativeTime("(yesterday)");
    else if (days < 30) setRelativeTime(`(${days}d ago)`);
    else setRelativeTime(`(${Math.floor(days / 30)}mo ago)`);
  }, [state.lastScrapedAt]);

  return (
    <div className={className}>
      <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/60">
        {/* Freshness dot */}
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${FRESHNESS_DOT[freshness]}`}
          title={`${FRESHNESS_LABEL[freshness]}${lastScraped ? ` — ${lastScraped}` : ""}`}
        />
        <Info className="w-2.5 h-2.5 shrink-0" />
        <span>
          Source: {stateAgencyName}
          {dataType ? ` · ${dataType}` : ""}
          {" · "}
          {lastScraped ? `${FRESHNESS_LABEL[freshness]} ${lastScraped}` : "Unverified"}
        </span>
        {state.fgUrl && (
          <a
            href={state.fgUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary/50 hover:text-primary underline-offset-2 hover:underline"
          >
            Verify
          </a>
        )}
      </div>
      {showLastUpdated && lastScraped && (
        <div className="text-[8px] text-muted-foreground/40 mt-0.5">
          Data last updated: {lastScraped} {relativeTime}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DataSourceInline — compact inline version for tight spaces
// ---------------------------------------------------------------------------

export function DataSourceInline({ stateId }: { stateId: string }) {
  const state = STATES_MAP[stateId];
  if (!state) return null;

  const freshness = getFreshnessLevel(state.lastScrapedAt);

  const lastVerified = state.lastScrapedAt
    ? new Date(state.lastScrapedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "Unverified";

  return (
    <span className="inline-flex items-center gap-1 text-[8px] text-muted-foreground/40">
      <span
        className={`w-1 h-1 rounded-full inline-block ${FRESHNESS_DOT[freshness]}`}
      />
      {getAgencyShort(stateId)} {lastVerified}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Agency lookups — all 15 states
// ---------------------------------------------------------------------------

function getAgencyName(stateId: string): string {
  const agencies: Record<string, string> = {
    CO: "Colorado Parks & Wildlife",
    WY: "Wyoming Game & Fish",
    MT: "Montana Fish, Wildlife & Parks",
    NV: "Nevada Dept. of Wildlife",
    AZ: "Arizona Game & Fish",
    UT: "Utah Division of Wildlife",
    NM: "New Mexico Game & Fish",
    OR: "Oregon Dept. of Fish & Wildlife",
    ID: "Idaho Fish & Game",
    KS: "Kansas Dept. of Wildlife",
    AK: "Alaska Dept. of Fish & Game",
    WA: "Washington Dept. of Fish & Wildlife",
    NE: "Nebraska Game & Parks",
    SD: "South Dakota Game, Fish & Parks",
    ND: "North Dakota Game & Fish",
  };
  return agencies[stateId] ?? `${stateId} Fish & Game`;
}

function getAgencyShort(stateId: string): string {
  const short: Record<string, string> = {
    CO: "CPW", WY: "WGF", MT: "MFWP", NV: "NDOW", AZ: "AZGFD",
    UT: "UDWR", NM: "NMGF", OR: "ODFW", ID: "IDFG", KS: "KDWP",
    AK: "ADFG", WA: "WDFW", NE: "NGPC", SD: "SDGFP", ND: "NDGF",
  };
  return short[stateId] ?? stateId;
}
