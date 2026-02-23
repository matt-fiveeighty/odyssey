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
          <div className="flex items-center gap-3">
            <StatusBadge status={boardState.status} />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Crosshair className="w-3.5 h-3.5" />
              <span>{boardState.primaryFocus}</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground/60">Portfolio overview for your active strategy</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCell
            icon={<TrendingUp className="w-4 h-4 text-primary" />}
            label="Cadence"
            sublabel="Build vs. burn rhythm"
            value={boardState.cadence}
          />
          <StatCell
            icon={<DollarSign className="w-4 h-4 text-success" />}
            label="Capital"
            sublabel="Deployed vs. budgeted"
            value={`$${Math.round(boardState.capitalDeployed).toLocaleString()} / $${Math.round(boardState.capitalBudgeted).toLocaleString()}`}
          />
          <StatCell
            icon={<MapPin className="w-4 h-4 text-info" />}
            label="Active States"
            sublabel="States in your portfolio"
            value={String(boardState.statesActive)}
          />
          <StatCell
            icon={<Crosshair className="w-4 h-4 text-warning" />}
            label="Active Species"
            sublabel="Species you are pursuing"
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
      </CardContent>
    </Card>
  );
}

function StatCell({
  icon,
  label,
  sublabel,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-muted/30">
      {icon}
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
        <p className="text-[9px] text-muted-foreground/50 mt-0.5">{sublabel}</p>
      </div>
    </div>
  );
}
