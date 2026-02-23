/**
 * Static unit centroid coordinates for geographic proximity calculations.
 * Approximate [lat, lon] based on unit names, geographic landmarks, and state context.
 *
 * Precision: ~10-30 mile accuracy, sufficient for 200+ mile scouting comparisons.
 *
 * Phase 10: Scouting Strategy
 */

/** [latitude, longitude] decimal degrees */
export const UNIT_CENTROIDS: Record<string, [number, number]> = {
  // ============================================================================
  // Colorado
  // ============================================================================
  "co-elk-011":         [39.97, -107.90],  // White River (Meeker area)
  "co-elk-211":         [38.32, -108.42],  // Bear's Ears (Naturita/Norwood)
  "co-elk-004":         [39.82, -108.20],  // Piceance Basin (Rio Blanco)
  "co-elk-003":         [40.05, -107.60],  // White River (east side)
  "co-md-011":          [39.97, -107.90],  // White River (Meeker area)
  "co-md-211":          [38.32, -108.42],  // Bear's Ears (Naturita/Norwood)
  "co-black_bear-011":  [39.97, -107.90],  // White River (Meeker area)
  "co-black_bear-076":  [37.78, -107.67],  // San Juan (Silverton/Ouray)
  "co-moose-001":       [40.73, -106.18],  // North Park (Walden)

  // ============================================================================
  // Wyoming
  // ============================================================================
  "wy-elk-035":         [44.50, -107.20],  // Bighorn Mountains
  "wy-elk-100":         [41.80, -108.80],  // Desert Elk (Red Desert)
  "wy-md-145":          [42.70, -110.50],  // Wyoming Range (Star Valley)
  "wy-moose-001":       [43.75, -110.75],  // Teton / Upper Snake

  // ============================================================================
  // Montana
  // ============================================================================
  "mt-elk-general":          [46.50, -113.50],  // SW Montana general
  "mt-black_bear-spring":    [47.00, -114.00],  // Western MT spring bear
  "mt-moose-general":        [46.80, -112.00],  // Central MT moose
  "mt-whitetail-general":    [47.50, -114.50],  // NW Montana whitetail

  // ============================================================================
  // Nevada
  // ============================================================================
  "nv-elk-231":         [41.75, -115.40],  // Jarbidge (NE Nevada)

  // ============================================================================
  // Idaho
  // ============================================================================
  "id-elk-sawtooth":        [44.00, -114.90],  // Sawtooth Zone (Stanley)
  "id-black_bear-spring":   [46.50, -116.00],  // Spring controlled (Clearwater)
  "id-moose-controlled":    [44.50, -111.20],  // SE Idaho moose
  "id-whitetail-general":   [47.00, -116.50],  // Northern Idaho (Coeur d'Alene)

  // ============================================================================
  // Arizona
  // ============================================================================
  "az-elk-001":             [36.50, -112.10],  // Kaibab (Grand Canyon North Rim)
  "az-black_bear-023":      [34.40, -111.00],  // Mogollon Rim

  // ============================================================================
  // Utah
  // ============================================================================
  "ut-elk-general":         [39.50, -111.50],  // Central UT general
  "ut-moose-wasatch":       [40.60, -111.60],  // Wasatch Mountains

  // ============================================================================
  // New Mexico
  // ============================================================================
  "nm-elk-034":             [35.87, -106.52],  // Valles Caldera (Jemez Mountains)

  // ============================================================================
  // Oregon
  // ============================================================================
  "or-elk-starkey":         [45.20, -118.50],  // Starkey (La Grande area)

  // ============================================================================
  // Kansas
  // ============================================================================
  "ks-md-001":              [38.80, -100.50],  // Western Kansas
  "ks-wt-general":          [38.70, -98.00],   // Statewide whitetail center

  // ============================================================================
  // Washington
  // ============================================================================
  "wa-elk-general":         [46.80, -117.50],  // Eastern WA general
  "wa-elk-blue-mountains":  [46.10, -117.80],  // Blue Mountains
  "wa-md-okanogan":         [48.50, -119.80],  // Okanogan Highlands

  // ============================================================================
  // Nebraska
  // ============================================================================
  "ne-elk-pine-ridge":          [42.80, -103.50],  // Pine Ridge (NW Nebraska)
  "ne-md-pine-ridge":           [42.70, -103.70],  // Pine Ridge / Wildcat Hills
  "ne-pronghorn-sandhills":     [42.00, -101.00],  // Sandhills Prairie

  // ============================================================================
  // South Dakota
  // ============================================================================
  "sd-elk-black-hills":         [43.85, -103.50],  // Black Hills
  "sd-md-badlands":             [43.75, -102.50],  // Badlands / West River
  "sd-pronghorn-prairie":       [43.50, -101.50],  // Prairie Pronghorn

  // ============================================================================
  // North Dakota
  // ============================================================================
  "nd-elk-badlands":            [47.30, -103.50],  // Badlands / Little Missouri
  "nd-md-badlands":             [47.20, -103.30],  // Badlands Unit
  "nd-pronghorn-west":          [47.00, -104.00],  // Western ND Prairie

  // ============================================================================
  // Alaska
  // ============================================================================
  "ak-moose-general":          [62.00, -150.00],  // Road System (Matanuska-Susitna)
  "ak-moose-draw":             [63.00, -145.00],  // Controlled Use (Interior)
  "ak-black_bear-coastal":     [58.00, -134.00],  // Coastal Brown Bear (SE Alaska)
  "ak-goat-general":           [60.50, -145.50],  // Southeast / Chugach
};

/**
 * Haversine formula: great-circle distance between two [lat, lon] points in miles.
 */
export function haversineDistance(
  a: [number, number],
  b: [number, number],
): number {
  const R = 3959; // Earth radius in miles
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;

  const sinHalfDLat = Math.sin(dLat / 2);
  const sinHalfDLon = Math.sin(dLon / 2);
  const h = sinHalfDLat * sinHalfDLat + Math.cos(lat1) * Math.cos(lat2) * sinHalfDLon * sinHalfDLon;

  return 2 * R * Math.asin(Math.sqrt(h));
}

type ProximityResult =
  | { distanceMiles: number; source: "centroid" }
  | { distanceMiles: null; source: "state_region"; proximity: "close" | "medium" | "far" };

/**
 * Get distance between two units. Uses centroid coordinates when available,
 * falls back to state-level region proximity.
 */
export function getUnitDistance(
  unitIdA: string,
  unitIdB: string,
  stateIdA: string,
  stateIdB: string,
): ProximityResult {
  const coordA = UNIT_CENTROIDS[unitIdA];
  const coordB = UNIT_CENTROIDS[unitIdB];

  if (coordA && coordB) {
    return { distanceMiles: Math.round(haversineDistance(coordA, coordB)), source: "centroid" };
  }

  // Fallback: state-level region proximity
  return { distanceMiles: null, source: "state_region", proximity: getStateRegionProximity(stateIdA, stateIdB) };
}

/** State-level region proximity (duplicated from roadmap-generator since it's private) */
function getStateRegionProximity(stateA: string, stateB: string): "close" | "medium" | "far" {
  const regions: Record<string, string[]> = {
    west: ["CO", "WY", "MT", "ID", "UT", "NV", "OR", "NM", "AZ", "WA", "AK"],
    plains: ["KS", "NE", "SD", "ND"],
    midwest: ["MN", "IA", "MO", "WI", "IL", "IN", "OH", "MI"],
    south: ["FL", "GA", "AL", "SC", "NC", "TN", "MS", "LA", "AR", "TX", "OK"],
    northeast: ["NY", "PA", "NJ", "CT", "MA", "VT", "NH", "ME", "MD", "VA", "WV", "DE", "RI"],
  };

  // AK is far from everything except AK and WA
  if ((stateA === "AK" || stateB === "AK") && stateA !== stateB && stateA !== "WA" && stateB !== "WA") {
    return "far";
  }

  const regionA = Object.entries(regions).find(([, states]) => states.includes(stateA))?.[0] ?? "west";
  const regionB = Object.entries(regions).find(([, states]) => states.includes(stateB))?.[0] ?? "west";

  if (regionA === regionB) return "close";
  if ((regionA === "west" && regionB === "plains") || (regionA === "plains" && regionB === "west")) return "close";
  if (regionA !== regionB) return "medium";
  return "far";
}
