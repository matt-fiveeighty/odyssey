import { Species } from "@/lib/types";

export const SPECIES: Species[] = [
  { id: "elk", name: "Elk", icon: "🦌" },
  { id: "mule_deer", name: "Mule Deer", icon: "🫎" },
  { id: "whitetail", name: "Whitetail", icon: "🦌" },
  { id: "bear", name: "Black Bear", icon: "🐻" },
  { id: "moose", name: "Moose", icon: "🫎" },
  { id: "pronghorn", name: "Pronghorn", icon: "🦌" },
  { id: "bighorn_sheep", name: "Bighorn Sheep", icon: "🐏" },
  { id: "mountain_goat", name: "Mountain Goat", icon: "🐐" },
  { id: "bison", name: "Bison", icon: "🦬" },
  { id: "mountain_lion", name: "Mountain Lion", icon: "🦁" },
];

export const SPECIES_MAP = Object.fromEntries(SPECIES.map((s) => [s.id, s]));
