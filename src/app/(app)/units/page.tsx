"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  MapPin,
  TrendingUp,
  Award,
  Mountain,
  Users,
} from "lucide-react";
import Link from "next/link";
import { STATES } from "@/lib/constants/states";
import { SPECIES } from "@/lib/constants/species";
import { SAMPLE_UNITS } from "@/lib/constants/sample-units";
import UnitTagBadges from "@/components/units/UnitTagBadges";

type SortOption = "success" | "trophy" | "points" | "pressure";

export default function UnitsPage() {
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [speciesFilter, setSpeciesFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("trophy");

  const filteredUnits = useMemo(() => {
    let units = [...SAMPLE_UNITS];

    if (search) {
      const q = search.toLowerCase();
      units = units.filter(
        (u) =>
          u.unitCode.toLowerCase().includes(q) ||
          u.unitName?.toLowerCase().includes(q) ||
          u.stateId.toLowerCase().includes(q)
      );
    }

    if (stateFilter !== "all") {
      units = units.filter((u) => u.stateId === stateFilter);
    }

    if (speciesFilter !== "all") {
      units = units.filter((u) => u.speciesId === speciesFilter);
    }

    switch (sortBy) {
      case "success":
        units.sort((a, b) => b.successRate - a.successRate);
        break;
      case "trophy":
        units.sort((a, b) => b.trophyRating - a.trophyRating);
        break;
      case "points":
        units.sort(
          (a, b) =>
            a.pointsRequiredNonresident - b.pointsRequiredNonresident
        );
        break;
      case "pressure":
        const pressureOrder = { Low: 0, Moderate: 1, High: 2 };
        units.sort(
          (a, b) =>
            pressureOrder[a.pressureLevel] - pressureOrder[b.pressureLevel]
        );
        break;
    }

    return units;
  }, [search, stateFilter, speciesFilter, sortBy]);

  return (
    <div className="p-6 space-y-6 fade-in-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <MapPin className="w-6 h-6 text-primary" />
          Unit Database
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse and compare hunting units across all western states
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by unit code or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary border-0"
          />
        </div>
        <div className="flex gap-2">
          <select
            aria-label="Filter by state"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="h-10 px-3 rounded-md bg-secondary border-0 text-sm text-foreground"
          >
            <option value="all">All States</option>
            {STATES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by species"
            value={speciesFilter}
            onChange={(e) => setSpeciesFilter(e.target.value)}
            className="h-10 px-3 rounded-md bg-secondary border-0 text-sm text-foreground"
          >
            <option value="all">All Species</option>
            {SPECIES.map((sp) => (
              <option key={sp.id} value={sp.id}>
                {sp.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Sort by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="h-10 px-3 rounded-md bg-secondary border-0 text-sm text-foreground"
          >
            <option value="trophy">Trophy Rating</option>
            <option value="success">Success Rate</option>
            <option value="points">Points Needed</option>
            <option value="pressure">Pressure Level</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filteredUnits.length} units found
      </p>

      {/* Unit Cards Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUnits.map((unit) => {
          const state = STATES.find((s) => s.id === unit.stateId);
          const species = SPECIES.find((s) => s.id === unit.speciesId);
          return (
            <Link key={unit.id} href={`/units/${unit.id}`} className="block">
              <Card
                className="bg-card border-border hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:scale-[1.01] transition-all duration-200 group cursor-pointer h-full"
              >
                <CardContent className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: state?.color }}
                      >
                        {state?.abbreviation}
                      </div>
                      <div>
                        <p className="text-sm font-semibold group-hover:text-primary transition-colors">
                          {species?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Unit {unit.unitCode}
                          {unit.unitName ? ` - ${unit.unitName}` : ""}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-2.5 rounded-lg bg-secondary/50">
                      <div className="flex items-center gap-1.5 mb-1">
                        <TrendingUp className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[10px] text-muted-foreground uppercase">
                          Success
                        </span>
                      </div>
                      <p className="text-lg font-bold">
                        {(unit.successRate * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-secondary/50">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Award className="w-3.5 h-3.5 text-chart-2" />
                        <span className="text-[10px] text-muted-foreground uppercase">
                          Trophy
                        </span>
                      </div>
                      <p className="text-lg font-bold">
                        {unit.trophyRating}
                        <span className="text-xs text-muted-foreground">
                          /10
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Points Needed */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-primary/5 border border-primary/10 mb-4">
                    <span className="text-xs text-muted-foreground">
                      Points Needed (NR)
                    </span>
                    <span className="text-sm font-bold text-primary">
                      {unit.pointsRequiredNonresident}
                    </span>
                  </div>

                  {/* Unit Tag Badges */}
                  <div className="mb-3">
                    <UnitTagBadges unit={unit} />
                  </div>

                  {/* Terrain & Pressure Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {unit.terrainType.map((t) => (
                      <Badge
                        key={t}
                        variant="secondary"
                        className="text-[10px] px-2 py-0.5"
                      >
                        <Mountain className="w-3 h-3 mr-1" />
                        {t}
                      </Badge>
                    ))}
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-2 py-0.5 ${
                        unit.pressureLevel === "Low"
                          ? "bg-success/10 text-success border-success/20"
                          : unit.pressureLevel === "Moderate"
                          ? "bg-warning/10 text-warning border-warning/20"
                          : "bg-destructive/10 text-destructive border-destructive/20"
                      }`}
                    >
                      <Users className="w-3 h-3 mr-1" />
                      {unit.pressureLevel}
                    </Badge>
                  </div>

                  {/* Notes */}
                  {unit.notes && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {unit.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
