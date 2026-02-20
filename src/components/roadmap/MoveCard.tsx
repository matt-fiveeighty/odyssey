"use client";

import { Badge } from "@/components/ui/badge";
import { MoveTagBadge } from "./MoveTagBadge";
import { ExternalLink, Calendar, Download } from "lucide-react";
import type { RoadmapAction } from "@/lib/types";
import { STATES_MAP } from "@/lib/constants/states";
import { formatSpeciesName } from "@/lib/utils";
import { exportDeadline } from "@/lib/calendar-export";

/** Format YYYY-MM-DD → "April 7, 2026" (NAM) */
function formatNAM(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

interface MoveCardProps {
  action: RoadmapAction;
}

export function MoveCard({ action }: MoveCardProps) {
  const state = STATES_MAP[action.stateId];

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
      {/* State badge */}
      <Badge
        className="shrink-0 text-[10px] font-bold mt-0.5"
        style={{ backgroundColor: state?.color ?? "#666", color: "white" }}
      >
        {state?.abbreviation ?? action.stateId}
      </Badge>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-xs font-medium">
            {formatSpeciesName(action.speciesId)}
          </span>
          {action.moveTag && (
            <MoveTagBadge tag={action.moveTag} locked={action.locked} />
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {action.description}
        </p>
        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
          {action.cost > 0 && (
            <span className="font-medium">${Math.round(action.cost).toLocaleString()}</span>
          )}
          {action.dueDate && (
            <span className="flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5" />
              {formatNAM(action.dueDate)}
            </span>
          )}
          {action.dueDate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                exportDeadline({
                  stateName: state?.name ?? action.stateId,
                  species: formatSpeciesName(action.speciesId),
                  openDate: action.dueDate!,
                  closeDate: action.dueDate!,
                  url: action.url,
                });
              }}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              title="Export to calendar (.ics)"
            >
              <Download className="w-2.5 h-2.5" />
              .ics
            </button>
          )}
        </div>
      </div>

      {/* External link */}
      {action.url && (
        <a
          href={action.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
          aria-label="Open in Fish & Game"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  );
}
