// ============================================================================
// Content-Derived Stable UID Generation
// ============================================================================
// Generates deterministic UIDs for iCalendar events using SHA-256 hashing.
// Same event content → same UID → calendar clients update instead of duplicate.
//
// RFC 5545 UID format: <unique-id>@<domain>
// ============================================================================

import { createHash } from "crypto";

export interface EventIdentity {
  stateId: string;
  speciesId: string;
  itemType: string; // "application" | "hunt" | "point_purchase" | "scout" | "deadline" | "prep"
  year: number;
  month: number; // 1-12
  day?: number;
}

/**
 * Generate a stable UID from event identity.
 * Deterministic: same inputs always produce the same UID.
 *
 * Uses alphabetical key ordering in JSON.stringify to guarantee consistency.
 */
export function generateStableUID(identity: EventIdentity): string {
  // Alphabetical key order for deterministic serialization
  const content = JSON.stringify({
    day: identity.day ?? 0,
    month: identity.month,
    species: identity.speciesId,
    state: identity.stateId,
    type: identity.itemType,
    year: identity.year,
  });

  const hash = createHash("sha256").update(content).digest("hex").slice(0, 16);

  return `${hash}@odysseyoutdoors.com`;
}
