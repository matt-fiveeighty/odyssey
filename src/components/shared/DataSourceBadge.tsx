"use client";

import { Info } from "lucide-react";
import { STATES_MAP } from "@/lib/constants/states";

interface DataSourceBadgeProps {
  stateId: string;
  /** E.g. "2025-26 Fee Schedule" or "Application Deadlines" */
  dataType?: string;
  className?: string;
}

/**
 * Shows "Source: [State] Game & Fish · 2025-26" with optional link
 * Builds trust with the CPA persona (Michael) and credibility for all users.
 */
export function DataSourceBadge({ stateId, dataType, className = "" }: DataSourceBadgeProps) {
  const state = STATES_MAP[stateId];
  if (!state) return null;

  const lastScraped = state.lastScrapedAt
    ? new Date(state.lastScrapedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "2025-26";

  const stateAgencyName = getAgencyName(stateId);

  return (
    <div className={`flex items-center gap-1.5 text-[9px] text-muted-foreground/60 ${className}`}>
      <Info className="w-2.5 h-2.5 shrink-0" />
      <span>
        Source: {stateAgencyName}
        {dataType ? ` · ${dataType}` : ""}
        {" · "}
        {lastScraped}
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
  );
}

/** Compact inline version for tight spaces */
export function DataSourceInline({ stateId }: { stateId: string }) {
  const state = STATES_MAP[stateId];
  if (!state) return null;

  return (
    <span className="text-[8px] text-muted-foreground/40">
      {getAgencyShort(stateId)} 2025-26
    </span>
  );
}

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
  };
  return agencies[stateId] ?? `${stateId} Fish & Game`;
}

function getAgencyShort(stateId: string): string {
  const short: Record<string, string> = {
    CO: "CPW", WY: "WGF", MT: "MFWP", NV: "NDOW", AZ: "AZGFD",
    UT: "UDWR", NM: "NMGF", OR: "ODFW", ID: "IDFG", KS: "KDWP", AK: "ADFG",
  };
  return short[stateId] ?? stateId;
}
