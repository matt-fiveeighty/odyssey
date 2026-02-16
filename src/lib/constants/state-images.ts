// CSS gradient backgrounds representing each state's terrain aesthetic
// Used for visual richness in state cards without requiring actual image assets

export const STATE_VISUALS: Record<string, { gradient: string; terrain: string; emoji: string }> = {
  CO: {
    gradient: "from-blue-950 via-slate-700 to-emerald-900",
    terrain: "Rocky Mountain peaks, dark timber, and alpine meadows",
    emoji: "🏔️",
  },
  WY: {
    gradient: "from-amber-950 via-yellow-900 to-slate-800",
    terrain: "Sagebrush basins, windswept ridges, and red desert",
    emoji: "🌾",
  },
  MT: {
    gradient: "from-emerald-950 via-teal-800 to-slate-900",
    terrain: "Glacier-carved valleys, dense timber, and river bottoms",
    emoji: "🌲",
  },
  NV: {
    gradient: "from-orange-950 via-amber-900 to-stone-800",
    terrain: "Basin and range, high desert, and mountain mahogany",
    emoji: "🏜️",
  },
  AZ: {
    gradient: "from-red-950 via-orange-900 to-amber-800",
    terrain: "Pinyon-juniper, canyon country, and ponderosa parks",
    emoji: "🌵",
  },
  UT: {
    gradient: "from-rose-950 via-stone-700 to-sky-900",
    terrain: "Red rock, aspen groves, and high-altitude plateaus",
    emoji: "⛰️",
  },
  NM: {
    gradient: "from-violet-950 via-rose-900 to-amber-900",
    terrain: "Chihuahuan desert, volcanic mesas, and pinyon forests",
    emoji: "🌄",
  },
  OR: {
    gradient: "from-green-950 via-emerald-800 to-cyan-900",
    terrain: "Cascade Range, old-growth timber, and high desert",
    emoji: "🌿",
  },
  ID: {
    gradient: "from-cyan-950 via-blue-800 to-emerald-900",
    terrain: "Rugged backcountry, river of no return, and alpine lakes",
    emoji: "🐻",
  },
  KS: {
    gradient: "from-yellow-950 via-green-900 to-amber-800",
    terrain: "Agricultural edges, creek bottoms, and Flint Hills prairie",
    emoji: "🦌",
  },
};
