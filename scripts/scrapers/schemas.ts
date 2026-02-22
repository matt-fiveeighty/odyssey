/**
 * Zod Validation Schemas for Scraped Data
 *
 * Validates scraped data before DB upsert. Invalid rows are logged and skipped
 * rather than blocking valid data from being imported.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Core schemas
// ---------------------------------------------------------------------------

export const ScrapedUnitSchema = z.object({
  stateId: z.string().min(2).max(2),
  speciesId: z.string().min(1),
  unitCode: z.string().min(1),
  unitName: z.string().min(1),
  successRate: z.number().min(0).max(100).optional(),
  trophyRating: z.number().min(0).max(10).optional(),
  pointsRequiredResident: z.number().min(0).optional(),
  pointsRequiredNonresident: z.number().min(0).optional(),
  terrainType: z.array(z.string()).optional(),
  pressureLevel: z.enum(["Low", "Moderate", "High"]).optional(),
  elevationRange: z.tuple([z.number(), z.number()]).optional(),
  publicLandPct: z.number().min(0).max(100).optional(),
  tagQuotaNonresident: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export const ScrapedDrawHistorySchema = z.object({
  unitId: z.string().regex(/^[A-Z]{2}:\w+:.+$/, "Must be stateId:speciesId:unitCode"),
  year: z.number().int().min(2000).max(2050),
  applicants: z.number().int().min(0),
  tags: z.number().int().min(0),
  odds: z.number().min(0).max(100),
  minPointsDrawn: z.number().int().min(0).nullable(),
});

export const ScrapedDeadlineSchema = z.object({
  stateId: z.string().min(2).max(2),
  speciesId: z.string().min(1),
  deadlineType: z.string().min(1),
  date: z.string().min(1),
  year: z.number().int().min(2000).max(2050),
  notes: z.string().optional(),
});

export const ScrapedFeeSchema = z.object({
  stateId: z.string().min(2).max(2),
  feeName: z.string().min(1).max(200),
  amount: z.number().min(0).max(50000),
  residency: z.enum(["resident", "nonresident", "both"]),
  speciesId: z.string().optional(),
  frequency: z.string().min(1),
  notes: z.string().optional(),
});

export const ScrapedSeasonSchema = z.object({
  stateId: z.string().min(2).max(2),
  speciesId: z.string().min(1),
  unitCode: z.string().optional(),
  seasonType: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  year: z.number().int().min(2000).max(2050),
  notes: z.string().optional(),
});

export const ScrapedRegulationSchema = z.object({
  stateId: z.string().min(2).max(2),
  title: z.string().min(1).max(300),
  summary: z.string().min(1),
  effectiveDate: z.string().optional(),
  sourceUrl: z.string().url(),
  category: z.enum(["rule_change", "announcement", "emergency_closure", "leftover_tags"]),
});

export const ScrapedLeftoverTagSchema = z.object({
  stateId: z.string().min(2).max(2),
  speciesId: z.string().min(1),
  unitCode: z.string().min(1),
  tagsAvailable: z.number().int().min(1),
  seasonType: z.string().optional(),
  sourceUrl: z.string().url(),
});

// ---------------------------------------------------------------------------
// Plausibility-guarded schemas (domain-specific validation)
// ---------------------------------------------------------------------------

/** Fee amounts must be > $0 and < $10,000. Tag fees of $0 are implausible. */
export const PlausibleFeeSchema = ScrapedFeeSchema.refine(
  (fee) => fee.amount > 0 && fee.amount < 10000,
  { message: "Fee amount outside plausible range ($0-$10,000)" }
).refine(
  (fee) => !(fee.amount === 0 && fee.feeName.toLowerCase().includes("tag")),
  { message: "Tag cost of $0 is implausible" }
);

/** Deadline dates must be between 2024 and 2030. */
export const PlausibleDeadlineSchema = ScrapedDeadlineSchema.refine(
  (dl) => {
    const parsed = new Date(dl.date);
    if (isNaN(parsed.getTime())) return false;
    const year = parsed.getFullYear();
    return year >= 2024 && year <= 2030;
  },
  { message: "Deadline date outside plausible range (2024-2030) or unparseable" }
);

/** Season dates must be parseable and year between 2024-2030. Start must be before end. */
export const PlausibleSeasonSchema = ScrapedSeasonSchema.refine(
  (s) => s.year >= 2024 && s.year <= 2030,
  { message: "Season year outside plausible range (2024-2030)" }
);

/** Leftover tags must have at least 1 tag available. */
export const PlausibleLeftoverTagSchema = ScrapedLeftoverTagSchema.refine(
  (lt) => lt.tagsAvailable >= 1,
  { message: "Leftover tags must have at least 1 available" }
);

/** Draw history: odds 0-100%, applicants and tags non-negative, year 2000-2050 */
export const PlausibleDrawHistorySchema = ScrapedDrawHistorySchema.refine(
  (dh) => dh.odds >= 0 && dh.odds <= 100,
  { message: "Draw odds outside 0-100% range" }
);

// ---------------------------------------------------------------------------
// Batch validation helper
// ---------------------------------------------------------------------------

/**
 * Validate an array of scraped records against a schema.
 * Returns valid rows and logs invalid ones -- never blocks the pipeline.
 *
 * Pass a Plausible*Schema for domain-specific guards (recommended for DB upsert),
 * or the base schema for structural validation only.
 */
export function validateBatch<T>(
  rows: unknown[],
  schema: z.ZodType<T>,
  label: string,
  log: (msg: string) => void
): T[] {
  const valid: T[] = [];
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const result = schema.safeParse(rows[i]);
    if (result.success) {
      valid.push(result.data);
    } else {
      skipped++;
      if (skipped <= 5) {
        log(`  [${label}] Row ${i} failed validation: ${result.error.issues.map(e => e.message).join(", ")}`);
      }
    }
  }

  if (skipped > 0) {
    log(`  [${label}] Validated: ${valid.length} ok, ${skipped} skipped`);
  }

  return valid;
}
