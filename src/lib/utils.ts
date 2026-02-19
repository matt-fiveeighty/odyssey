import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a species ID into its proper display name.
 * Uses the SPECIES_MAP lookup for accurate names (e.g., "Columbia Blacktail"),
 * falling back to Title Case conversion for unknown IDs.
 */
const SPECIES_DISPLAY: Record<string, string> = {
  elk: "Elk",
  mule_deer: "Mule Deer",
  whitetail: "Whitetail",
  coues_deer: "Coues Deer",
  blacktail: "Columbia Blacktail",
  sitka_blacktail: "Sitka Blacktail",
  black_bear: "Black Bear",
  grizzly: "Grizzly",
  moose: "Moose",
  pronghorn: "Pronghorn",
  bighorn_sheep: "Bighorn Sheep",
  dall_sheep: "Dall Sheep",
  mountain_goat: "Mountain Goat",
  bison: "Bison",
  caribou: "Caribou",
  mountain_lion: "Mountain Lion",
  muskox: "Muskox",
  wolf: "Wolf",
};

export function formatSpeciesName(id: string): string {
  return SPECIES_DISPLAY[id] ?? id.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
