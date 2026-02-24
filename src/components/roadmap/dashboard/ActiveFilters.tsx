"use client";

import { Search } from "lucide-react";

export interface FilterState {
  species: string;
  state: string;
  year: string;
  status: string;
  search: string;
}

interface ActiveFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  speciesOptions: string[];
  stateOptions: string[];
  yearOptions: number[];
  statusOptions: { value: string; label: string }[];
}

export function ActiveFilters({
  filters,
  onChange,
  speciesOptions,
  stateOptions,
  yearOptions,
  statusOptions,
}: ActiveFiltersProps) {
  function update(key: keyof FilterState, value: string) {
    onChange({ ...filters, [key]: value });
  }

  const hasActiveFilters = filters.species || filters.state || filters.year || filters.status || filters.search;

  return (
    <div className="rounded-xl border border-border/40 bg-card/50 px-4 py-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 shrink-0">
          <Search className="w-3.5 h-3.5 text-muted-foreground/40" />
          <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium">
            Filters
          </span>
          {hasActiveFilters && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          )}
        </div>

        <div className="h-4 w-px bg-border/40 hidden sm:block" />

        <select
          value={filters.species}
          onChange={(e) => update("species", e.target.value)}
          className="h-8 px-3 rounded-lg bg-secondary/50 border border-border/40 text-xs text-foreground appearance-none cursor-pointer hover:bg-secondary/70 hover:border-border/60 transition-colors focus:outline-none focus:border-primary/50 min-w-[120px]"
        >
          <option value="">All Species</option>
          {speciesOptions.map((sp) => (
            <option key={sp} value={sp}>{sp}</option>
          ))}
        </select>

        <select
          value={filters.state}
          onChange={(e) => update("state", e.target.value)}
          className="h-8 px-3 rounded-lg bg-secondary/50 border border-border/40 text-xs text-foreground appearance-none cursor-pointer hover:bg-secondary/70 hover:border-border/60 transition-colors focus:outline-none focus:border-primary/50 min-w-[120px]"
        >
          <option value="">All States</option>
          {stateOptions.map((st) => (
            <option key={st} value={st}>{st}</option>
          ))}
        </select>

        <select
          value={filters.year}
          onChange={(e) => update("year", e.target.value)}
          className="h-8 px-3 rounded-lg bg-secondary/50 border border-border/40 text-xs text-foreground appearance-none cursor-pointer hover:bg-secondary/70 hover:border-border/60 transition-colors focus:outline-none focus:border-primary/50 min-w-[100px]"
        >
          <option value="">All Years</option>
          {yearOptions.map((yr) => (
            <option key={yr} value={String(yr)}>{yr}</option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) => update("status", e.target.value)}
          className="h-8 px-3 rounded-lg bg-secondary/50 border border-border/40 text-xs text-foreground appearance-none cursor-pointer hover:bg-secondary/70 hover:border-border/60 transition-colors focus:outline-none focus:border-primary/50 min-w-[120px]"
        >
          <option value="">Status</option>
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <div className="relative flex-1 min-w-[140px] max-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            placeholder="Search actions..."
            className="w-full h-8 pl-8 pr-3 rounded-lg bg-secondary/50 border border-border/40 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
