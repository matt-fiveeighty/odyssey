/**
 * Adaptive Frequency Router — "The Smart Pulse"
 *
 * State F&G websites do not update uniformly. Scraping everything daily
 * gets you IP-banned. Scraping monthly misses mid-season quota changes.
 *
 * This module routes crawl frequency based on:
 *   1. Deadline proximity (48h → 6hr, 30d → daily, closed → weekly)
 *   2. Data type (fees/regs → weekly, draw odds → annual trigger)
 *   3. Historical change velocity (states that change often get more pings)
 *   4. Server health (back off if 503s detected)
 *
 * The scheduler produces a CrawlSchedule — a sorted priority queue of
 * upcoming crawl tasks with their next execution time and frequency.
 */

// ============================================================================
// Types
// ============================================================================

export type CrawlFrequency =
  | "6_hours"    // Deadline imminent (≤48 hours)
  | "daily"      // Window opens in ≤30 days
  | "twice_week" // Active application season
  | "weekly"     // Window closed, legislative checks
  | "biweekly"   // Low-priority monitoring
  | "monthly"    // Off-season, minimal changes expected
  | "on_trigger" // Draw odds — only when press release detected
  | "paused";    // Server unhealthy, backoff active

export type DataCategory = "deadlines" | "fees" | "regulations" | "draw_odds" | "quotas" | "species";

export interface CrawlTask {
  id: string;
  stateId: string;
  category: DataCategory;
  frequency: CrawlFrequency;
  /** Next scheduled crawl (ISO timestamp) */
  nextCrawlAt: string;
  /** Why this frequency was chosen */
  reason: string;
  /** Priority (lower = higher priority, 1 = critical) */
  priority: number;
  /** URL to crawl */
  targetUrl: string;
  /** Whether the task is currently in backoff */
  inBackoff: boolean;
  /** Number of consecutive failures */
  consecutiveFailures: number;
}

export interface CrawlSchedule {
  tasks: CrawlTask[];
  generatedAt: string;
  /** Total tasks by frequency bucket */
  frequencyDistribution: Record<CrawlFrequency, number>;
  /** Next task that should execute */
  nextDue: CrawlTask | null;
}

export interface StateDeadlineContext {
  stateId: string;
  species: string[];
  /** Closest application deadline (ISO date) */
  closestDeadline: string | null;
  /** Whether the application window is currently open */
  windowOpen: boolean;
  /** Days until the closest deadline (negative = past) */
  daysUntilDeadline: number | null;
  /** URL for the application portal */
  fgUrl: string;
  /** URL for legislative/commission updates */
  regulatoryUrl?: string;
}

// ============================================================================
// Frequency Intervals (milliseconds)
// ============================================================================

export const FREQUENCY_MS: Record<CrawlFrequency, number> = {
  "6_hours": 6 * 60 * 60 * 1000,
  "daily": 24 * 60 * 60 * 1000,
  "twice_week": 3.5 * 24 * 60 * 60 * 1000,
  "weekly": 7 * 24 * 60 * 60 * 1000,
  "biweekly": 14 * 24 * 60 * 60 * 1000,
  "monthly": 30 * 24 * 60 * 60 * 1000,
  "on_trigger": Infinity,
  "paused": Infinity,
};

// ============================================================================
// Core: Compute Optimal Frequency
// ============================================================================

/**
 * Determine the optimal crawl frequency for a state based on
 * deadline proximity and data category.
 *
 * Rules:
 *   - Deadline ≤48 hours → 6-hour pings (critical window)
 *   - Deadline ≤30 days  → daily pings (approaching window)
 *   - Window open        → daily pings
 *   - Window closed      → weekly pings
 *   - Fees/regulations   → weekly (legislative cycle)
 *   - Draw odds          → on_trigger (annual, listen for press release)
 */
export function computeOptimalFrequency(
  context: StateDeadlineContext,
  category: DataCategory,
  now: Date = new Date(),
): { frequency: CrawlFrequency; reason: string; priority: number } {
  // Draw odds are annual — only triggered by press release detection
  if (category === "draw_odds") {
    return {
      frequency: "on_trigger",
      reason: `${context.stateId} draw odds drop once yearly. Awaiting press release trigger.`,
      priority: 5,
    };
  }

  // Fees and regulations: weekly legislative monitoring
  if (category === "fees" || category === "regulations") {
    // Unless deadline is imminent, then daily
    if (context.daysUntilDeadline !== null && context.daysUntilDeadline <= 30 && context.daysUntilDeadline > 0) {
      return {
        frequency: "daily",
        reason: `${context.stateId} deadline in ${context.daysUntilDeadline} days. Fee/regulation monitoring elevated to daily.`,
        priority: 2,
      };
    }
    return {
      frequency: "weekly",
      reason: `${context.stateId} fees/regulations monitored on weekly legislative cycle.`,
      priority: 4,
    };
  }

  // Deadline-based frequency routing
  if (context.daysUntilDeadline === null || context.closestDeadline === null) {
    // No deadline data — conservative weekly
    return {
      frequency: "weekly",
      reason: `${context.stateId} no deadline data available. Default weekly monitoring.`,
      priority: 4,
    };
  }

  // Deadline passed
  if (context.daysUntilDeadline < 0) {
    return {
      frequency: "weekly",
      reason: `${context.stateId} application window closed (deadline ${Math.abs(context.daysUntilDeadline)} days ago). Weekly monitoring.`,
      priority: 5,
    };
  }

  // ≤48 hours — CRITICAL
  if (context.daysUntilDeadline <= 2) {
    return {
      frequency: "6_hours",
      reason: `CRITICAL: ${context.stateId} deadline in ${context.daysUntilDeadline} day(s). 6-hour monitoring active.`,
      priority: 1,
    };
  }

  // ≤7 days — twice per week (elevated)
  if (context.daysUntilDeadline <= 7) {
    return {
      frequency: "twice_week",
      reason: `${context.stateId} deadline in ${context.daysUntilDeadline} days. Elevated monitoring.`,
      priority: 2,
    };
  }

  // ≤30 days — daily
  if (context.daysUntilDeadline <= 30) {
    return {
      frequency: "daily",
      reason: `${context.stateId} deadline in ${context.daysUntilDeadline} days. Daily monitoring active.`,
      priority: 2,
    };
  }

  // >30 days — weekly
  return {
    frequency: "weekly",
    reason: `${context.stateId} deadline in ${context.daysUntilDeadline} days. Standard weekly monitoring.`,
    priority: 4,
  };
}

// ============================================================================
// Schedule Builder
// ============================================================================

/**
 * Build a complete crawl schedule for all states and data categories.
 */
export function buildCrawlSchedule(
  contexts: StateDeadlineContext[],
  categories: DataCategory[] = ["deadlines", "fees", "regulations", "draw_odds"],
  now: Date = new Date(),
): CrawlSchedule {
  const tasks: CrawlTask[] = [];

  for (const ctx of contexts) {
    for (const category of categories) {
      const { frequency, reason, priority } = computeOptimalFrequency(ctx, category, now);
      const intervalMs = FREQUENCY_MS[frequency];
      const nextCrawlAt = intervalMs === Infinity
        ? "awaiting_trigger"
        : new Date(now.getTime() + intervalMs).toISOString();

      tasks.push({
        id: `crawl-${ctx.stateId}-${category}`,
        stateId: ctx.stateId,
        category,
        frequency,
        nextCrawlAt,
        reason,
        priority,
        targetUrl: category === "regulations" && ctx.regulatoryUrl
          ? ctx.regulatoryUrl
          : ctx.fgUrl,
        inBackoff: false,
        consecutiveFailures: 0,
      });
    }
  }

  // Sort by priority (ascending) then by nextCrawlAt
  tasks.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (a.nextCrawlAt === "awaiting_trigger") return 1;
    if (b.nextCrawlAt === "awaiting_trigger") return -1;
    return a.nextCrawlAt.localeCompare(b.nextCrawlAt);
  });

  // Frequency distribution
  const dist = {} as Record<CrawlFrequency, number>;
  for (const t of tasks) {
    dist[t.frequency] = (dist[t.frequency] ?? 0) + 1;
  }

  return {
    tasks,
    generatedAt: now.toISOString(),
    frequencyDistribution: dist,
    nextDue: tasks.find((t) => t.nextCrawlAt !== "awaiting_trigger") ?? null,
  };
}

// ============================================================================
// Exponential Backoff — "Ghost Protocol" Resilience
// ============================================================================

export interface BackoffState {
  stateId: string;
  consecutiveFailures: number;
  lastFailureAt: string;
  nextRetryAt: string;
  /** Current backoff delay in ms */
  currentDelayMs: number;
  /** Whether this state's crawling is fully paused */
  paused: boolean;
  reason: string;
}

/** Base delay: 5 minutes */
const BASE_BACKOFF_MS = 5 * 60 * 1000;
/** Max delay: 24 hours (don't go completely silent) */
const MAX_BACKOFF_MS = 24 * 60 * 60 * 1000;
/** Max consecutive failures before full pause */
const MAX_FAILURES_BEFORE_PAUSE = 10;

/**
 * Compute exponential backoff for a failed crawl.
 *
 * Sequence: 5min → 10min → 20min → 40min → 80min → ... → 24hr cap
 *
 * After 10 consecutive failures, the state is PAUSED and a P1 alert fires.
 * A human must manually unpause after investigating.
 */
export function computeBackoff(
  stateId: string,
  consecutiveFailures: number,
  now: Date = new Date(),
): BackoffState {
  if (consecutiveFailures >= MAX_FAILURES_BEFORE_PAUSE) {
    return {
      stateId,
      consecutiveFailures,
      lastFailureAt: now.toISOString(),
      nextRetryAt: "paused",
      currentDelayMs: Infinity,
      paused: true,
      reason: `${stateId}: ${consecutiveFailures} consecutive failures. Crawling PAUSED. Requires manual investigation.`,
    };
  }

  const delayMs = Math.min(
    BASE_BACKOFF_MS * Math.pow(2, consecutiveFailures - 1),
    MAX_BACKOFF_MS,
  );

  const nextRetry = new Date(now.getTime() + delayMs);

  return {
    stateId,
    consecutiveFailures,
    lastFailureAt: now.toISOString(),
    nextRetryAt: nextRetry.toISOString(),
    currentDelayMs: delayMs,
    paused: false,
    reason: `${stateId}: Failure #${consecutiveFailures}. Backing off ${Math.round(delayMs / 60000)} minutes. Next retry: ${nextRetry.toISOString()}.`,
  };
}

// ============================================================================
// Data Provenance — Freshness Stamps
// ============================================================================

export interface FreshnessStamp {
  stateId: string;
  field: string;
  /** When this data point was last verified against the F&G source */
  lastVerifiedAt: string;
  /** How the verification happened */
  verificationMethod: "crawl" | "manual" | "api" | "lkg_fallback";
  /** Source URL that was checked */
  sourceUrl: string;
  /** Human-readable freshness string */
  freshnessLabel: string;
  /** Whether data is considered stale (>7 days since verification) */
  isStale: boolean;
  /** Staleness level for UI styling */
  stalenessLevel: "fresh" | "aging" | "stale" | "critical";
}

/**
 * Compute a freshness stamp for a data point.
 *
 * UI rendering:
 *   🔒 "Verified against WY G&F: 4 hours ago" (fresh)
 *   🔒 "Verified: 3 days ago" (aging)
 *   ⚠️ "Last verified: 8 days ago" (stale)
 *   🔴 "STALE: Last verified 30+ days ago" (critical)
 */
export function computeFreshnessStamp(
  stateId: string,
  field: string,
  lastVerifiedAt: string,
  sourceUrl: string,
  verificationMethod: FreshnessStamp["verificationMethod"] = "crawl",
  now: Date = new Date(),
): FreshnessStamp {
  const verifiedDate = new Date(lastVerifiedAt);
  const ageMs = now.getTime() - verifiedDate.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  const ageDays = ageHours / 24;

  let freshnessLabel: string;
  let stalenessLevel: FreshnessStamp["stalenessLevel"];
  let isStale = false;

  if (ageHours < 24) {
    const hours = Math.floor(ageHours);
    freshnessLabel = hours === 0
      ? `Verified against ${stateId} G&F: just now`
      : `Verified against ${stateId} G&F: ${hours} hour${hours !== 1 ? "s" : ""} ago`;
    stalenessLevel = "fresh";
  } else if (ageDays < 4) {
    const days = Math.floor(ageDays);
    freshnessLabel = `Verified: ${days} day${days !== 1 ? "s" : ""} ago`;
    stalenessLevel = "aging";
  } else if (ageDays < 14) {
    const days = Math.floor(ageDays);
    freshnessLabel = `Last verified: ${days} days ago`;
    stalenessLevel = "stale";
    isStale = true;
  } else {
    const days = Math.floor(ageDays);
    freshnessLabel = `STALE: Last verified ${days} days ago`;
    stalenessLevel = "critical";
    isStale = true;
  }

  return {
    stateId,
    field,
    lastVerifiedAt,
    verificationMethod,
    sourceUrl,
    freshnessLabel,
    isStale,
    stalenessLevel,
  };
}

// ============================================================================
// Weekly Digest Compiler — Push Reporting
// ============================================================================

export interface WeeklyDigest {
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  /** States that had successful data updates */
  successfulUpdates: Array<{
    stateId: string;
    field: string;
    verifiedAt: string;
    summary: string;
  }>;
  /** Anomalies that were quarantined */
  quarantinedAnomalies: Array<{
    stateId: string;
    field: string;
    detectedAt: string;
    summary: string;
    awaitingApproval: boolean;
  }>;
  /** Frequency changes the scheduler made */
  frequencyChanges: Array<{
    stateId: string;
    category: DataCategory;
    oldFrequency: CrawlFrequency;
    newFrequency: CrawlFrequency;
    reason: string;
  }>;
  /** Crawler failures and backoff events */
  crawlerFailures: Array<{
    stateId: string;
    failureCount: number;
    lastError: string;
    status: "backing_off" | "paused" | "recovered";
  }>;
  /** Self-healed data blocks (LLM vision attempted) */
  selfHealedBlocks: Array<{
    stateId: string;
    field: string;
    method: "llm_vision" | "pattern_match";
    confidence: number;
    awaitingApproval: boolean;
    summary: string;
  }>;
  /** Overall health score (0-100) */
  healthScore: number;
  /** Summary line for Slack/email */
  summaryLine: string;
}

/**
 * Compile a weekly digest from pipeline activity logs.
 *
 * Delivery: Push to #data-ops Slack + admin email every Monday 8 AM.
 */
export function compileWeeklyDigest(
  successfulUpdates: WeeklyDigest["successfulUpdates"],
  quarantinedAnomalies: WeeklyDigest["quarantinedAnomalies"],
  frequencyChanges: WeeklyDigest["frequencyChanges"],
  crawlerFailures: WeeklyDigest["crawlerFailures"],
  selfHealedBlocks: WeeklyDigest["selfHealedBlocks"],
  now: Date = new Date(),
): WeeklyDigest {
  const periodEnd = now.toISOString();
  const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Health score calculation:
  // Start at 100, deduct for failures and anomalies
  let healthScore = 100;
  healthScore -= crawlerFailures.filter((f) => f.status === "paused").length * 15;
  healthScore -= crawlerFailures.filter((f) => f.status === "backing_off").length * 5;
  healthScore -= quarantinedAnomalies.filter((a) => a.awaitingApproval).length * 10;
  healthScore -= selfHealedBlocks.length * 5;
  healthScore = Math.max(0, Math.min(100, healthScore));

  const totalStates = new Set([
    ...successfulUpdates.map((u) => u.stateId),
    ...crawlerFailures.map((f) => f.stateId),
  ]).size;

  const failedStates = crawlerFailures.filter((f) => f.status !== "recovered").length;
  const pendingApprovals = quarantinedAnomalies.filter((a) => a.awaitingApproval).length;

  const summaryLine = [
    `📊 Weekly Data Ops Digest`,
    `${successfulUpdates.length} updates verified`,
    failedStates > 0 ? `⚠️ ${failedStates} state(s) with crawler issues` : null,
    pendingApprovals > 0 ? `🔒 ${pendingApprovals} quarantined item(s) awaiting approval` : null,
    selfHealedBlocks.length > 0 ? `🤖 ${selfHealedBlocks.length} self-healed block(s)` : null,
    `Health: ${healthScore}/100`,
  ].filter(Boolean).join(" | ");

  return {
    generatedAt: now.toISOString(),
    periodStart,
    periodEnd,
    successfulUpdates,
    quarantinedAnomalies,
    frequencyChanges,
    crawlerFailures,
    selfHealedBlocks,
    healthScore,
    summaryLine,
  };
}
