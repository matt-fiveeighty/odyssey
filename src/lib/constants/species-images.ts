/**
 * Centralized species imagery, gradients, and descriptions.
 * Consumed by StepWhatsCalling, SpeciesAvatar, Calculator, and results sections.
 */

export const SPECIES_IMAGES: Record<string, { src: string; alt: string }> = {
  elk: { src: "/images/species/elk.png", alt: "Bull elk bugling in a mountain meadow" },
  mule_deer: { src: "/images/species/mule-deer.png", alt: "Mule deer buck in sagebrush" },
  whitetail: { src: "/images/species/whitetail.png", alt: "Whitetail buck in morning fog" },
  coues_deer: { src: "/images/species/coues-deer.png", alt: "Coues deer buck in Sonoran desert" },
  blacktail: { src: "/images/species/blacktail.png", alt: "Columbia blacktail buck in old-growth forest" },
  sitka_blacktail: { src: "/images/species/sitka-blacktail.png", alt: "Sitka blacktail deer in coastal rainforest" },
  black_bear: { src: "/images/species/black-bear.png", alt: "Black bear walking through timber" },
  grizzly: { src: "/images/species/grizzly.png", alt: "Grizzly bear crossing a mountain river" },
  moose: { src: "/images/species/moose.png", alt: "Bull moose in timber" },
  pronghorn: { src: "/images/species/pronghorn.png", alt: "Pronghorn buck on open prairie" },
  bighorn_sheep: { src: "/images/species/bighorn-sheep.png", alt: "Bighorn ram on alpine ridge" },
  dall_sheep: { src: "/images/species/dall-sheep.png", alt: "Dall sheep ram in mountain terrain" },
  mountain_goat: { src: "/images/species/mountain-goat.png", alt: "Mountain goat on rocky cliff" },
  bison: { src: "/images/species/bison.png", alt: "Bison bull on frosty morning prairie" },
  caribou: { src: "/images/species/caribou.png", alt: "Caribou bull on tundra" },
  mountain_lion: { src: "/images/species/mountain-lion.png", alt: "Mountain lion in rocky terrain" },
  muskox: { src: "/images/species/muskox.png", alt: "Muskox on arctic tundra" },
  wolf: { src: "/images/species/wolf.png", alt: "Gray wolf in mountain wilderness" },
};

export const SPECIES_GRADIENTS: Record<string, string> = {
  elk: "from-amber-900 to-emerald-950",
  mule_deer: "from-yellow-900 to-stone-800",
  whitetail: "from-green-900 to-amber-950",
  coues_deer: "from-orange-800 to-amber-950",
  blacktail: "from-emerald-900 to-green-950",
  sitka_blacktail: "from-teal-900 to-emerald-950",
  black_bear: "from-stone-800 to-slate-950",
  grizzly: "from-amber-800 to-stone-900",
  moose: "from-blue-950 to-cyan-900",
  pronghorn: "from-amber-800 to-yellow-950",
  bighorn_sheep: "from-stone-700 to-slate-900",
  dall_sheep: "from-slate-500 to-blue-900",
  mountain_goat: "from-slate-600 to-blue-950",
  bison: "from-amber-950 to-stone-900",
  caribou: "from-blue-900 to-slate-800",
  mountain_lion: "from-orange-900 to-stone-950",
  muskox: "from-stone-800 to-amber-950",
  wolf: "from-slate-700 to-blue-950",
};

export const SPECIES_DESCRIPTIONS: Record<string, string> = {
  elk: "The king of western big game. Bugling bulls, mountain meadows, and the hunt of a lifetime.",
  mule_deer: "Crafty high-country bucks that test your glassing and stalking skills.",
  whitetail: "Familiar quarry in unfamiliar territory. Western whitetail hunts are a different game.",
  coues_deer: "The gray ghost of the Southwest. Tiny deer, giant challenge — the ultimate glassing game.",
  blacktail: "Pacific Northwest timber bucks. Rainforest hunting at its finest in Oregon and Washington.",
  sitka_blacktail: "Alaska's coastal deer. Hunt the temperate rainforest islands for a unique adventure.",
  black_bear: "Spring or fall, spot-and-stalk or bait. An accessible species with great success rates.",
  grizzly: "The ultimate North American predator. Coastal brown bears and interior grizzlies demand respect.",
  moose: "The ultimate once-in-a-lifetime draw. Massive animals, near-100% success when drawn.",
  pronghorn: "Speed goats on the open prairie. High draw odds and fast-paced spot-and-stalk action.",
  bighorn_sheep: "The pinnacle of North American hunting. A lifetime of points for one unforgettable ram.",
  dall_sheep: "White rams above the clouds. Alaska's high-alpine pursuit for the dedicated mountain hunter.",
  mountain_goat: "Above treeline, above the clouds. Technical terrain and a once-in-a-lifetime pursuit.",
  bison: "The original American giant. Limited tags, massive animals, and a deeply historic hunt.",
  caribou: "Tundra migration herds and vast open country. Alaska's iconic backcountry adventure.",
  mountain_lion: "Hound hunting in winter snow. A predator pursuit unlike anything else in the West.",
  muskox: "Arctic Alaska's prehistoric survivor. A rare, remote, and truly once-in-a-lifetime pursuit.",
  wolf: "Track and hunt the West's apex predator. Available in Idaho, Montana, and Wyoming.",
};
