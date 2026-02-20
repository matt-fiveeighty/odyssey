"use client";

/**
 * MapLegend — color-coded legend for the interactive journey map.
 * 4-color system matching InteractiveMap fills.
 */

export function MapLegend() {
  return (
    <div className="flex flex-wrap gap-4 text-[10px] text-muted-foreground uppercase tracking-wider">
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-sm bg-green-500" />
        <span>Planned Hunt</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-sm bg-orange-500" />
        <span>Apply w/ Points</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-sm bg-amber-500" />
        <span>OTC / Try Your Luck</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-sm bg-blue-500" />
        <span>Build Points</span>
      </div>
    </div>
  );
}
