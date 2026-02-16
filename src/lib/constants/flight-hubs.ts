/**
 * Flight Hub Data for Odyssey Outdoors
 *
 * Maps home states to departure airports and provides common hunting
 * flight routes with estimated costs. Used by the travel logistics
 * generator to personalize flight recommendations.
 */

// Maps state abbreviation → primary departure airports
export const HOME_AIRPORTS: Record<string, string[]> = {
  AL: ["BHM", "HSV", "MOB"],
  AK: ["ANC", "FAI"],
  AZ: ["PHX", "TUS"],
  AR: ["LIT", "XNA"],
  CA: ["LAX", "SFO", "SAN", "SMF", "OAK"],
  CO: ["DEN", "COS"],
  CT: ["BDL", "HVN"],
  DE: ["PHL", "ILG"],
  FL: ["MCO", "MIA", "TPA", "JAX", "FLL", "RSW"],
  GA: ["ATL", "SAV"],
  HI: ["HNL", "OGG"],
  ID: ["BOI", "IDA"],
  IL: ["ORD", "MDW"],
  IN: ["IND", "SBN"],
  IA: ["DSM", "CID"],
  KS: ["MCI", "ICT"],
  KY: ["SDF", "CVG"],
  LA: ["MSY", "SHV"],
  ME: ["PWM", "BGR"],
  MD: ["BWI", "DCA"],
  MA: ["BOS", "PVD"],
  MI: ["DTW", "GRR"],
  MN: ["MSP", "RST"],
  MS: ["JAN", "GPT"],
  MO: ["STL", "MCI"],
  MT: ["BZN", "BIL", "MSO", "GTF"],
  NE: ["OMA", "LNK"],
  NV: ["LAS", "RNO"],
  NH: ["MHT", "BOS"],
  NJ: ["EWR", "PHL"],
  NM: ["ABQ", "SAF"],
  NY: ["JFK", "LGA", "EWR", "BUF", "SYR"],
  NC: ["CLT", "RDU"],
  ND: ["FAR", "BIS"],
  OH: ["CLE", "CMH", "CVG"],
  OK: ["OKC", "TUL"],
  OR: ["PDX", "RDM", "EUG"],
  PA: ["PHL", "PIT"],
  RI: ["PVD", "BOS"],
  SC: ["CHS", "CAE", "GSP"],
  SD: ["RAP", "FSD"],
  TN: ["BNA", "MEM"],
  TX: ["DFW", "IAH", "AUS", "SAT", "ELP"],
  UT: ["SLC", "SGU"],
  VT: ["BTV", "BOS"],
  VA: ["DCA", "IAD", "RIC", "ORF"],
  WA: ["SEA", "GEG"],
  WV: ["CRW", "CKB"],
  WI: ["MKE", "MSN"],
  WY: ["JAC", "CPR", "SHR", "RKS"],
};

// Hunting destination airports per state
export const HUNTING_AIRPORTS: Record<string, { primary: string; alternatives: string[] }> = {
  CO: { primary: "DEN", alternatives: ["GJT", "EGE", "MTJ", "HDN"] },
  WY: { primary: "JAC", alternatives: ["CPR", "SHR", "RKS", "BIL"] },
  MT: { primary: "BZN", alternatives: ["BIL", "MSO", "GTF"] },
  NV: { primary: "RNO", alternatives: ["LAS", "EKO"] },
  AZ: { primary: "PHX", alternatives: ["FLG", "TUS"] },
  UT: { primary: "SLC", alternatives: ["SGU", "CDC"] },
  NM: { primary: "ABQ", alternatives: ["SAF"] },
  OR: { primary: "PDX", alternatives: ["RDM", "MFR"] },
  ID: { primary: "BOI", alternatives: ["IDA", "SUN", "LWS"] },
  KS: { primary: "MCI", alternatives: ["ICT", "GCK"] },
  WA: { primary: "SEA", alternatives: ["GEG", "PSC"] },
  NE: { primary: "OMA", alternatives: ["LNK", "RAP"] },
  SD: { primary: "RAP", alternatives: ["FSD", "PIR"] },
  ND: { primary: "BIS", alternatives: ["FAR", "MOT"] },
  AK: { primary: "ANC", alternatives: ["FAI", "JNU"] },
};

// Common hunting flight routes with pricing
export interface FlightRoute {
  from: string;
  to: string;
  targetState: string;
  avgCost: number;
  flightTime: string;
  direct: boolean;
  airlines: string;
  notes: string;
}

export const HUNTING_ROUTES: FlightRoute[] = [
  // Florida → hunting states
  { from: "MCO", to: "DEN", targetState: "CO", avgCost: 180, flightTime: "3h45m", direct: true, airlines: "Frontier/United", notes: "Direct flights daily. Book 6-8 weeks out for September-November hunting dates." },
  { from: "MCO", to: "SLC", targetState: "UT", avgCost: 220, flightTime: "4h30m", direct: true, airlines: "Delta/JetBlue", notes: "Direct available. Hub for UT/WY/ID. Rent 4WD at SLC and drive." },
  { from: "MCO", to: "BOI", targetState: "ID", avgCost: 280, flightTime: "5h+", direct: false, airlines: "United/Delta", notes: "Usually 1 stop through DEN or SLC. Best hub for central/southern ID." },
  { from: "MCO", to: "JAC", targetState: "WY", avgCost: 350, flightTime: "5h+", direct: false, airlines: "United/American", notes: "Seasonal direct flights Jun-Oct on some carriers. Otherwise connect through DEN." },
  { from: "MCO", to: "BZN", targetState: "MT", avgCost: 320, flightTime: "5h+", direct: false, airlines: "Delta/United", notes: "Connect through SLC or MSP. Book early for fall hunting season." },
  { from: "MCO", to: "ABQ", targetState: "NM", avgCost: 200, flightTime: "4h", direct: true, airlines: "Southwest/Frontier", notes: "Direct flights available. Short drive to most NM elk units." },
  { from: "MCO", to: "PHX", targetState: "AZ", avgCost: 160, flightTime: "4h15m", direct: true, airlines: "Frontier/Spirit/Southwest", notes: "Direct flights are cheap. 2-3 hour drive north to Kaibab/Rim Country." },
  { from: "MCO", to: "RNO", targetState: "NV", avgCost: 280, flightTime: "5h+", direct: false, airlines: "United/Southwest", notes: "Usually 1 stop. Reno is the gateway to most NV hunting units." },
  { from: "MCO", to: "PDX", targetState: "OR", avgCost: 260, flightTime: "5h30m", direct: true, airlines: "JetBlue/Alaska", notes: "Direct available seasonally. 3-4 hrs to eastern OR hunting units." },
  { from: "MCO", to: "MCI", targetState: "KS", avgCost: 180, flightTime: "3h", direct: true, airlines: "Southwest/Frontier", notes: "Direct flights. Short drive west to mule deer country or south for whitetail." },

  // Texas → hunting states
  { from: "DFW", to: "DEN", targetState: "CO", avgCost: 150, flightTime: "2h30m", direct: true, airlines: "United/American/Frontier", notes: "Multiple daily directs. Best prices on Frontier." },
  { from: "DFW", to: "SLC", targetState: "UT", avgCost: 180, flightTime: "3h", direct: true, airlines: "Delta/American", notes: "Direct flights multiple times daily." },
  { from: "DFW", to: "BOI", targetState: "ID", avgCost: 220, flightTime: "3h30m", direct: true, airlines: "United/American", notes: "Limited direct options. Connect through DEN for more schedules." },
  { from: "DFW", to: "ABQ", targetState: "NM", avgCost: 130, flightTime: "2h", direct: true, airlines: "Southwest/American", notes: "Short cheap flight. Drive to hunting units same day." },

  // Georgia → hunting states
  { from: "ATL", to: "DEN", targetState: "CO", avgCost: 170, flightTime: "3h30m", direct: true, airlines: "Delta/Frontier/Southwest", notes: "Delta hub — tons of options. Direct flights all day." },
  { from: "ATL", to: "SLC", targetState: "UT", avgCost: 200, flightTime: "4h", direct: true, airlines: "Delta", notes: "Delta direct. Good hub for UT/WY/ID trips." },
  { from: "ATL", to: "BOI", targetState: "ID", avgCost: 280, flightTime: "5h+", direct: false, airlines: "Delta/United", notes: "Connect through SLC or DEN." },

  // Northeast → hunting states
  { from: "JFK", to: "DEN", targetState: "CO", avgCost: 200, flightTime: "4h30m", direct: true, airlines: "United/JetBlue/Frontier", notes: "Direct flights daily. Morning departure gets you there by lunch MT." },
  { from: "JFK", to: "SLC", targetState: "UT", avgCost: 230, flightTime: "5h", direct: true, airlines: "Delta/JetBlue", notes: "Direct available. Arrive evening, drive to hunt area next morning." },
  { from: "EWR", to: "DEN", targetState: "CO", avgCost: 190, flightTime: "4h20m", direct: true, airlines: "United", notes: "United hub. Direct flights every hour." },
  { from: "BOS", to: "DEN", targetState: "CO", avgCost: 210, flightTime: "4h45m", direct: true, airlines: "United/JetBlue/Frontier", notes: "Multiple directs daily." },

  // Midwest → hunting states
  { from: "ORD", to: "DEN", targetState: "CO", avgCost: 140, flightTime: "2h45m", direct: true, airlines: "United/Frontier/Spirit", notes: "United hub. Cheap direct flights constantly." },
  { from: "ORD", to: "BOI", targetState: "ID", avgCost: 200, flightTime: "3h45m", direct: true, airlines: "United/Alaska", notes: "Limited directs. Connect through DEN for more options." },
  { from: "MSP", to: "DEN", targetState: "CO", avgCost: 130, flightTime: "2h30m", direct: true, airlines: "Delta/Frontier/Sun Country", notes: "Cheap and frequent direct flights." },
  { from: "MSP", to: "BZN", targetState: "MT", avgCost: 180, flightTime: "2h30m", direct: true, airlines: "Delta", notes: "Quick hop to Montana. Drive to hunting areas same day." },
  { from: "MCI", to: "DEN", targetState: "CO", avgCost: 120, flightTime: "2h", direct: true, airlines: "Southwest/Frontier", notes: "Very cheap direct flights. Can even drive to CO in 8 hours." },

  // Routes to new Phase 2 states
  { from: "MCO", to: "SEA", targetState: "WA", avgCost: 250, flightTime: "5h30m", direct: true, airlines: "Alaska/Delta/JetBlue", notes: "Direct flights available. SEA hub for WA and Pacific NW hunting." },
  { from: "MCO", to: "ANC", targetState: "AK", avgCost: 400, flightTime: "8h+", direct: false, airlines: "Alaska/Delta", notes: "Connect through SEA. Book early for Aug-Sep hunting season." },
  { from: "DFW", to: "SEA", targetState: "WA", avgCost: 200, flightTime: "4h", direct: true, airlines: "Alaska/American/Delta", notes: "Multiple daily directs. 2-3 hrs to eastern WA elk country." },
  { from: "DFW", to: "ANC", targetState: "AK", avgCost: 380, flightTime: "7h+", direct: false, airlines: "Alaska/Delta", notes: "Connect through SEA. Alaska Airlines has best connections." },
  { from: "DFW", to: "RAP", targetState: "SD", avgCost: 250, flightTime: "3h", direct: false, airlines: "United/American", notes: "Connect through DEN. Gateway to Black Hills elk and badlands deer." },
  { from: "ATL", to: "SEA", targetState: "WA", avgCost: 220, flightTime: "5h", direct: true, airlines: "Delta/Alaska", notes: "Delta direct. Good connection to all WA hunting areas." },
  { from: "ORD", to: "SEA", targetState: "WA", avgCost: 170, flightTime: "4h15m", direct: true, airlines: "Alaska/United/American", notes: "Multiple directs daily." },
  { from: "ORD", to: "ANC", targetState: "AK", avgCost: 350, flightTime: "7h", direct: false, airlines: "Alaska/United", notes: "Connect through SEA. Book early for peak moose season." },
  { from: "ORD", to: "RAP", targetState: "SD", avgCost: 220, flightTime: "2h30m", direct: false, airlines: "United/American", notes: "Connect through DEN. Rapid City is gateway to Black Hills." },
  { from: "MSP", to: "RAP", targetState: "SD", avgCost: 180, flightTime: "1h45m", direct: true, airlines: "Delta/United", notes: "Short hop. Drive to Black Hills same day." },
  { from: "MSP", to: "BIS", targetState: "ND", avgCost: 160, flightTime: "1h30m", direct: true, airlines: "Delta/United", notes: "Quick flight to ND. Drive to badlands hunting in 2 hrs." },
  { from: "MSP", to: "ANC", targetState: "AK", avgCost: 320, flightTime: "6h+", direct: false, airlines: "Alaska/Delta", notes: "Connect through SEA. Good option for Midwest hunters heading to AK." },
];

/**
 * Find best flight routes from a home state to a target hunting state.
 * Returns routes sorted by cost, preferring direct flights.
 */
export function findBestRoutes(homeState: string, targetStateId: string): FlightRoute[] {
  const homeAirports = HOME_AIRPORTS[homeState] ?? [];
  if (homeAirports.length === 0) return [];

  const routes = HUNTING_ROUTES.filter(
    (r) => homeAirports.includes(r.from) && r.targetState === targetStateId
  ).sort((a, b) => {
    // Prefer direct flights, then sort by cost
    if (a.direct && !b.direct) return -1;
    if (!a.direct && b.direct) return 1;
    return a.avgCost - b.avgCost;
  });

  return routes;
}

/**
 * Get the primary departure airport for a home state.
 */
export function getPrimaryAirport(homeState: string): string {
  const airports = HOME_AIRPORTS[homeState];
  return airports?.[0] ?? "nearest airport";
}
