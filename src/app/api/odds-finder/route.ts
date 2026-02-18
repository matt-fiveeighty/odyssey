import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { SAMPLE_UNITS } from "@/lib/constants/sample-units";
import { STATES_MAP } from "@/lib/constants/states";
import { calculateDrawOdds } from "@/lib/engine/draw-odds";
import type { Unit } from "@/lib/types";

/**
 * Checks whether a unit has season data matching the requested weapon type.
 * Uses seasonDates (structured) first, then falls back to tactical notes
 * (free-text bestSeasonTier). Returns a scoring signal, not a hard filter.
 */
function getWeaponMatch(
  unit: Unit,
  weaponType?: string
): { matches: boolean; seasonLabel?: string } {
  if (!weaponType || weaponType === "any") {
    return { matches: false };
  }

  const wt = weaponType.toLowerCase();

  // 1. Check structured seasonDates keys (e.g. "archery", "1st_rifle", "muzzleloader")
  if (unit.seasonDates) {
    const keys = Object.keys(unit.seasonDates);
    for (const key of keys) {
      const k = key.toLowerCase();
      if (
        (wt === "archery" && k.includes("archery")) ||
        (wt === "rifle" && k.includes("rifle")) ||
        (wt === "muzzleloader" && (k.includes("muzzleloader") || k.includes("muzzle")))
      ) {
        const dates = unit.seasonDates[key];
        return {
          matches: true,
          seasonLabel: `${key} (${dates.start} - ${dates.end})`,
        };
      }
    }
  }

  // 2. Fallback: check tacticalNotes.bestSeasonTier free text
  if (unit.tacticalNotes?.bestSeasonTier) {
    const info = unit.tacticalNotes.bestSeasonTier.toLowerCase();
    if (
      (wt === "archery" && info.includes("archery")) ||
      (wt === "rifle" && info.includes("rifle")) ||
      (wt === "muzzleloader" && (info.includes("muzzleloader") || info.includes("muzzle")))
    ) {
      return {
        matches: true,
        seasonLabel: unit.tacticalNotes.bestSeasonTier,
      };
    }
  }

  // 3. Fallback: check notes field
  if (unit.notes) {
    const notes = unit.notes.toLowerCase();
    if (
      (wt === "archery" && notes.includes("archery")) ||
      (wt === "rifle" && notes.includes("rifle")) ||
      (wt === "muzzleloader" && (notes.includes("muzzleloader") || notes.includes("muzzle")))
    ) {
      return { matches: true, seasonLabel: undefined };
    }
  }

  return { matches: false };
}

/**
 * POST /api/odds-finder — Highest Odds Finder.
 *
 * Body: { speciesId, weaponType?, timeline, userPoints? }
 * timeline: "this_year" | "1_3_years" | "3_7_years" | "flexible"
 *
 * Returns ranked units with "why" bullets.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { speciesId, weaponType, timeline, userPoints } = body;

  if (!speciesId || !timeline) {
    return NextResponse.json(
      { error: "speciesId and timeline are required" },
      { status: 400 }
    );
  }

  // Get timeline years range
  const timelineYears: [number, number] =
    timeline === "this_year"
      ? [0, 0]
      : timeline === "1_3_years"
        ? [1, 3]
        : timeline === "3_7_years"
          ? [3, 7]
          : [0, 15]; // flexible

  try {
    const supabase = await createServerSupabase();

    // Try DB first
    const { data: dbUnits } = await supabase
      .from("ref_units")
      .select("*")
      .eq("species_id", speciesId)
      .order("trophy_rating", { ascending: false });

    let units: Unit[] = [];

    if (dbUnits && dbUnits.length > 0) {
      units = dbUnits.map((row) => ({
        id: row.id,
        stateId: row.state_id,
        speciesId: row.species_id,
        unitCode: row.unit_code,
        unitName: row.unit_name ?? undefined,
        successRate: Number(row.success_rate) || 0,
        trophyRating: row.trophy_rating ?? 5,
        pointsRequiredResident: row.points_required_resident ?? 0,
        pointsRequiredNonresident: row.points_required_nonresident ?? 0,
        terrainType: row.terrain_type ?? [],
        pressureLevel: row.pressure_level ?? "Moderate",
        elevationRange: row.elevation_range ?? [0, 0],
        publicLandPct: Number(row.public_land_pct) || 0,
        tagQuotaNonresident: row.tag_quota_nonresident ?? 0,
        seasonDates: row.season_dates ?? undefined,
        notes: row.notes ?? undefined,
        tacticalNotes: row.tactical_notes ?? undefined,
        nearestAirport: row.nearest_airport ?? undefined,
        driveTimeFromAirport: row.drive_time_from_airport ?? undefined,
      }));
    } else {
      units = SAMPLE_UNITS.filter((u) => u.speciesId === speciesId);
    }

    // Score and rank each unit
    const results = units.map((unit) => {
      const state = STATES_MAP[unit.stateId];
      const pts = userPoints?.[unit.stateId] ?? 0;

      const odds = calculateDrawOdds({
        stateId: unit.stateId,
        userPoints: pts,
        unit,
      });

      // Filter by timeline
      const fitsTimeline =
        odds.yearsToLikelyDraw >= timelineYears[0] &&
        odds.yearsToLikelyDraw <= timelineYears[1];

      // Determine weapon season match from seasonDates or tacticalNotes
      const weaponMatch = getWeaponMatch(unit, weaponType);

      // Generate "why" bullets
      const whyBullets: string[] = [];
      if (unit.successRate > 0.3)
        whyBullets.push(`${Math.round(unit.successRate * 100)}% success rate — well above average`);
      if (unit.trophyRating >= 8)
        whyBullets.push(`Trophy rating ${unit.trophyRating}/10 — elite quality potential`);
      if (unit.publicLandPct > 0.5)
        whyBullets.push(`${Math.round(unit.publicLandPct * 100)}% public land — strong DIY access`);
      if (unit.pressureLevel === "Low")
        whyBullets.push("Low hunting pressure");
      if (odds.currentOdds > 0.3)
        whyBullets.push(`${Math.round(odds.currentOdds * 100)}% draw odds this year`);
      if (state?.pointSystem === "random" || state?.pointSystem === "bonus")
        whyBullets.push(`${state.pointSystemDetails.description} — everyone has a shot`);
      if (weaponMatch.matches && weaponMatch.seasonLabel)
        whyBullets.push(`Has ${weaponType} season — ${weaponMatch.seasonLabel}`);

      // Composite score
      let compositeScore =
        unit.successRate * 20 +
        unit.trophyRating * 5 +
        unit.publicLandPct * 10 +
        (unit.pressureLevel === "Low" ? 15 : unit.pressureLevel === "Moderate" ? 8 : 0) +
        odds.currentOdds * 30 +
        (fitsTimeline ? 20 : 0);

      // Weapon type scoring boost (not a hard filter)
      if (weaponMatch.matches) {
        compositeScore += 15;
      }

      return {
        unit,
        stateName: state?.name ?? unit.stateId,
        drawOdds: odds,
        fitsTimeline,
        compositeScore,
        whyBullets: whyBullets.slice(0, 4),
      };
    });

    // Sort by composite score, prioritize units that fit timeline
    results.sort((a, b) => {
      if (a.fitsTimeline !== b.fitsTimeline) return a.fitsTimeline ? -1 : 1;
      return b.compositeScore - a.compositeScore;
    });

    return NextResponse.json({
      results: results.slice(0, 20),
      total: results.length,
      filters: { speciesId, weaponType, timeline },
    });
  } catch (err) {
    console.error("Odds finder error:", err);
    return NextResponse.json(
      { error: "Failed to compute odds" },
      { status: 500 }
    );
  }
}
