"use client";

import { StatusBadge } from "./StatusBadge";
import { Crosshair, TrendingUp, DollarSign, MapPin } from "lucide-react";
import type { BoardState } from "@/lib/types";

interface BoardStateHeaderProps {
  boardState: BoardState;
}

export function BoardStateHeader({ boardState }: BoardStateHeaderProps) {
  return (
    <div className="space-y-1.5">
      {/* Compact single-row bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-border/50 bg-card flex-wrap">
        <StatusBadge status={boardState.status} />
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground border-r border-border/40 pr-3">
          <Crosshair className="w-3 h-3" />
          <span className="font-medium">{boardState.primaryFocus}</span>
        </div>

        <div className="hidden md:contents">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="w-3 h-3 text-primary" />
            <span>{boardState.cadence}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <DollarSign className="w-3 h-3 text-success" />
            <span>
              ${Math.round(boardState.capitalDeployed).toLocaleString()} / $
              {Math.round(boardState.capitalBudgeted).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3 text-info" />
            <span>{boardState.statesActive} states</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Crosshair className="w-3 h-3 text-warning" />
            <span>{boardState.speciesActive} species</span>
          </div>
        </div>
      </div>

      {/* Signals — compact pills below if any */}
      {boardState.signals.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {boardState.signals.map((signal, i) => (
            <span
              key={i}
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                signal.type === "critical"
                  ? "bg-destructive/10 text-destructive"
                  : signal.type === "warning"
                    ? "bg-warning/10 text-warning"
                    : "bg-success/10 text-success"
              }`}
            >
              {signal.message}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
