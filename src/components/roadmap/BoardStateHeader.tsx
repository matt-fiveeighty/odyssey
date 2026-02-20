"use client";

import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";
import { Crosshair, TrendingUp, DollarSign, MapPin } from "lucide-react";
import type { BoardState } from "@/lib/types";

interface BoardStateHeaderProps {
  boardState: BoardState;
}

export function BoardStateHeader({ boardState }: BoardStateHeaderProps) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4 space-y-4">
        {/* Top row: status badge + primary focus */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <StatusBadge status={boardState.status} />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Crosshair className="w-3.5 h-3.5" />
            <span>{boardState.primaryFocus}</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCell
            icon={<TrendingUp className="w-4 h-4 text-primary" />}
            label="Cadence"
            value={boardState.cadence}
          />
          <StatCell
            icon={<DollarSign className="w-4 h-4 text-green-400" />}
            label="Capital"
            value={`$${boardState.capitalDeployed.toLocaleString()} / $${boardState.capitalBudgeted.toLocaleString()}`}
          />
          <StatCell
            icon={<MapPin className="w-4 h-4 text-blue-400" />}
            label="States"
            value={String(boardState.statesActive)}
          />
          <StatCell
            icon={<Crosshair className="w-4 h-4 text-amber-400" />}
            label="Species"
            value={String(boardState.speciesActive)}
          />
        </div>

        {/* Signals */}
        {boardState.signals.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {boardState.signals.map((signal, i) => (
              <span
                key={i}
                className={`text-[11px] px-2 py-0.5 rounded-full ${
                  signal.type === "critical"
                    ? "bg-red-500/10 text-red-400"
                    : signal.type === "warning"
                      ? "bg-amber-500/10 text-amber-400"
                      : "bg-green-500/10 text-green-400"
                }`}
              >
                {signal.message}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-muted/30">
      {icon}
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-xs font-medium">{value}</p>
      </div>
    </div>
  );
}
