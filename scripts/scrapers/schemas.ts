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
// Batch validation helper
// ---------------------------------------------------------------------------

/**
 * Validate an array of scraped records against a schema.
 * Returns valid rows and logs invalid ones — never blocks the pipeline.
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
