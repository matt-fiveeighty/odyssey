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

/**
 * Format a number as USD currency.
 * - Whole numbers: "$1,234"
 * - Decimals: "$1,234.50"
 * Uses toLocaleString for consistent comma-separated formatting.
 */
export function formatCurrency(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  if (Number.isInteger(rounded)) {
    return `$${rounded.toLocaleString("en-US")}`;
  }
  return `$${rounded.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Compact currency for large values: "$1.2k", "$12.5k"
 */
export function formatCurrencyCompact(amount: number): string {
  if (amount >= 1000) {
    const k = amount / 1000;
    return `$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return formatCurrency(amount);
}

/**
 * Format an ISO date string (YYYY-MM-DD) to American format (M/D/YYYY).
 * Returns the original string if parsing fails.
 */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Production-safe logger. Suppresses console output in production
 * unless NEXT_PUBLIC_DEBUG=true is set.
 */
const isDev = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_DEBUG === "true";

export const logger = {
  log: (...args: unknown[]) => { if (isDev) console.log(...args); },
  warn: (...args: unknown[]) => { if (isDev) console.warn(...args); },
  error: (...args: unknown[]) => { console.error(...args); }, // errors always log
  info: (...args: unknown[]) => { if (isDev) console.info(...args); },
};
