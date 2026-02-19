"use client";

import type { Unit } from "@/lib/types";
import {
  Trophy,
  Shield,
  Users,
  TreePine,
  Mountain,
  Target,
  Tent,
} from "lucide-react";

interface TagDef {
  id: string;
  label: string;
  icon: React.ReactNode;
  bg: string;
  text: string;
  border: string;
}

function computeTags(unit: Unit): TagDef[] {
  const tags: TagDef[] = [];

  if (unit.trophyRating >= 7) {
    tags.push({
      id: "trophy_potential",
      label: "Trophy Potential",
      icon: <Trophy className="w-3 h-3" />,
      bg: "bg-warning/10",
      text: "text-warning",
      border: "border-warning/20",
    });
  }

  if (unit.pressureLevel === "Low" && unit.successRate >= 0.2) {
    tags.push({
      id: "beginner_friendly",
      label: "Beginner Friendly",
      icon: <Target className="w-3 h-3" />,
      bg: "bg-success/10",
      text: "text-success",
      border: "border-success/20",
    });
  }

  if (unit.pressureLevel === "Low") {
    tags.push({
      id: "low_pressure",
      label: "Low Pressure",
      icon: <Users className="w-3 h-3" />,
      bg: "bg-info/10",
      text: "text-info",
      border: "border-info/20",
    });
  }

  if (unit.pointsRequiredNonresident === 0) {
    tags.push({
      id: "otc_available",
      label: "OTC Available",
      icon: <Shield className="w-3 h-3" />,
      bg: "bg-success/10",
      text: "text-success",
      border: "border-success/20",
    });
  }

  const accessMethod = unit.tacticalNotes?.accessMethod?.toLowerCase() ?? "";
  const notesLower = (unit.notes ?? "").toLowerCase();

  if (accessMethod.includes("truck") || notesLower.includes("truck")) {
    tags.push({
      id: "truck_accessible",
      label: "Truck Accessible",
      icon: <Tent className="w-3 h-3" />,
      bg: "bg-zinc-500/10",
      text: "text-zinc-400",
      border: "border-zinc-500/20",
    });
  }

  if (accessMethod.includes("backpack") || accessMethod.includes("backcountry")) {
    tags.push({
      id: "backpack_country",
      label: "Backpack Country",
      icon: <Mountain className="w-3 h-3" />,
      bg: "bg-premium/10",
      text: "text-premium",
      border: "border-premium/20",
    });
  }

  if (unit.publicLandPct >= 0.5) {
    tags.push({
      id: "high_public_land",
      label: `${Math.round(unit.publicLandPct * 100)}% Public`,
      icon: <TreePine className="w-3 h-3" />,
      bg: "bg-chart-5/10",
      text: "text-chart-5",
      border: "border-chart-5/20",
    });
  }

  return tags;
}

export default function UnitTagBadges({ unit }: { unit: Unit }) {
  const tags = computeTags(unit);

  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag.id}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${tag.bg} ${tag.text} ${tag.border}`}
        >
          {tag.icon}
          {tag.label}
        </span>
      ))}
    </div>
  );
}
