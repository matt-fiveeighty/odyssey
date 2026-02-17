import { z } from "zod";

// ============================================================================
// Shared enums
// ============================================================================

const stateIds = [
  "CO", "WY", "MT", "NV", "AZ", "UT", "NM", "OR", "ID", "KS",
] as const;

const speciesIds = [
  "elk", "mule_deer", "whitetail", "bear", "moose",
  "pronghorn", "bighorn_sheep", "mountain_goat", "bison", "mountain_lion",
] as const;

const goalStatuses = ["active", "dream", "completed"] as const;
const weaponTypes = ["archery", "rifle", "muzzleloader"] as const;
const seasonPreferences = ["early", "mid", "late", "any"] as const;
const huntStyles = ["diy_truck", "diy_backpack", "guided", "drop_camp"] as const;
const dreamTiers = ["once_in_a_lifetime", "trophy", "bucket_list", "attainable"] as const;
const pointTypes = ["preference", "bonus"] as const;

// ============================================================================
// Goal form schema
// ============================================================================

export const goalFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be 100 characters or fewer"),
  stateId: z.enum(stateIds, { message: "Select a state" }),
  speciesId: z.enum(speciesIds, { message: "Select a species" }),
  targetYear: z.number().int().min(new Date().getFullYear(), "Target year must be current year or later").max(new Date().getFullYear() + 15, "Target year is too far out"),
  status: z.enum(goalStatuses).default("active"),
  weaponType: z.enum(weaponTypes).optional(),
  seasonPreference: z.enum(seasonPreferences).optional(),
  huntStyle: z.enum(huntStyles).optional(),
  trophyDescription: z.string().max(200, "Description must be 200 characters or fewer").optional(),
  dreamTier: z.enum(dreamTiers).optional(),
  unitId: z.string().optional(),
});

export type GoalFormData = z.infer<typeof goalFormSchema>;

// ============================================================================
// Points form schema
// ============================================================================

export const pointsFormSchema = z.object({
  stateId: z.enum(stateIds, { message: "Select a state" }),
  speciesId: z.enum(speciesIds, { message: "Select a species" }),
  points: z.number().int().min(0, "Points cannot be negative").max(30, "Points seem unreasonably high"),
  pointType: z.enum(pointTypes),
  yearStarted: z.number().int().min(2000, "Year must be 2000 or later").max(new Date().getFullYear(), "Year cannot be in the future"),
});

export type PointsFormData = z.infer<typeof pointsFormSchema>;
