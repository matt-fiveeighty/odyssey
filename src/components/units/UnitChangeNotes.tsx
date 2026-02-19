"use client";

import { AlertTriangle, Info, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface UnitChangeNote {
  type: string;
  title: string;
  body: string;
  effectiveYear: number;
}

interface UnitChangeNotesProps {
  notes: UnitChangeNote[];
}

const typeConfig: Record<
  string,
  { icon: React.ReactNode; accent: string; bg: string; border: string }
> = {
  regulation: {
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    accent: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/20",
  },
  positive: {
    icon: <TrendingUp className="w-3.5 h-3.5" />,
    accent: "text-success",
    bg: "bg-success/10",
    border: "border-success/20",
  },
  negative: {
    icon: <TrendingDown className="w-3.5 h-3.5" />,
    accent: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/20",
  },
  info: {
    icon: <Info className="w-3.5 h-3.5" />,
    accent: "text-info",
    bg: "bg-info/10",
    border: "border-info/20",
  },
};

const defaultConfig = typeConfig.info;

export default function UnitChangeNotes({ notes }: UnitChangeNotesProps) {
  if (!notes || notes.length === 0) return null;

  // Sort by effectiveYear descending (most recent first)
  const sorted = [...notes].sort(
    (a, b) => b.effectiveYear - a.effectiveYear
  );

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-primary" />
          What&apos;s Changing
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          {sorted.length > 1 && (
            <div className="absolute left-[19px] top-6 bottom-6 w-px bg-border" />
          )}

          <div className="space-y-4">
            {sorted.map((note, i) => {
              const config = typeConfig[note.type] ?? defaultConfig;
              return (
                <div key={`${note.effectiveYear}-${note.title}-${i}`} className="flex gap-3">
                  {/* Year badge + timeline dot */}
                  <div className="flex flex-col items-center shrink-0">
                    <span
                      className={`inline-flex items-center justify-center w-10 h-6 rounded-md text-[10px] font-bold border ${config.bg} ${config.accent} ${config.border}`}
                    >
                      {note.effectiveYear}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={config.accent}>{config.icon}</span>
                      <span className="text-sm font-medium text-foreground">
                        {note.title}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {note.body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
