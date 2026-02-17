import { Species } from "@/lib/types";

export const SPECIES: Species[] = [
  { id: "elk", name: "Elk", icon: "🦌" },
  { id: "mule_deer", name: "Mule Deer", icon: "🦌" },
  { id: "whitetail", name: "Whitetail", icon: "🦌" },
  { id: "coues_deer", name: "Coues Deer", icon: "🦌" },
  { id: "blacktail", name: "Columbia Blacktail", icon: "🦌" },
  { id: "sitka_blacktail", name: "Sitka Blacktail", icon: "🦌" },
  { id: "black_bear", name: "Black Bear", icon: "🐻" },
  { id: "grizzly", name: "Grizzly", icon: "🐻" },
  { id: "moose", name: "Moose", icon: "🫎" },
  { id: "pronghorn", name: "Pronghorn", icon: "🦌" },
  { id: "bighorn_sheep", name: "Bighorn Sheep", icon: "🐏" },
  { id: "dall_sheep", name: "Dall Sheep", icon: "🐏" },
  { id: "mountain_goat", name: "Mountain Goat", icon: "🐐" },
  { id: "bison", name: "Bison", icon: "🦬" },
  { id: "caribou", name: "Caribou", icon: "🦌" },
  { id: "mountain_lion", name: "Mountain Lion", icon: "🦁" },
  { id: "muskox", name: "Muskox", icon: "🦬" },
  { id: "wolf", name: "Wolf", icon: "🐺" },
];

export const SPECIES_MAP = Object.fromEntries(SPECIES.map((s) => [s.id, s]));
