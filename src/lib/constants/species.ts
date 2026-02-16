import { Species } from "@/lib/types";

export const SPECIES: Species[] = [
  { id: "elk", name: "Elk", icon: "🦌" },
  { id: "mule_deer", name: "Mule Deer", icon: "🫎" },
  { id: "whitetail", name: "Whitetail", icon: "🦌" },
  { id: "bear", name: "Black Bear", icon: "🐻" },
  { id: "moose", name: "Moose", icon: "🫎" },
];

export const SPECIES_MAP = Object.fromEntries(SPECIES.map((s) => [s.id, s]));
