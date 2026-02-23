"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Info, ChevronDown, ChevronUp } from "lucide-react";
import type { DisciplineViolation } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DisciplineAlertsProps {
  violations: DisciplineViolation[];
}

const SEVERITY_STYLES = {
  critical: {
    border: "border-l-destructive",
    icon: <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />,
    label: "text-destructive",
  },
  warning: {
    border: "border-l-warning",
    icon: <AlertTriangle className="w-4 h-4 text-warning shrink-0" />,
    label: "text-warning",
  },
  info: {
    border: "border-l-info",
    icon: <Info className="w-4 h-4 text-info shrink-0" />,
    label: "text-info",
  },
};

export function DisciplineAlerts({ violations }: DisciplineAlertsProps) {
  if (violations.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Discipline Check
      </p>
      {violations.map((v, i) => (
        <DisciplineAlertCard key={`${v.ruleId}-${i}`} violation={v} />
      ))}
    </div>
  );
}

function DisciplineAlertCard({ violation }: { violation: DisciplineViolation }) {
  const [expanded, setExpanded] = useState(violation.severity === "critical");
  const styles = SEVERITY_STYLES[violation.severity];

  return (
    <Card
      className={cn("border-l-4 cursor-pointer transition-colors hover:bg-muted/20", styles.border)}
      onClick={() => setExpanded(!expanded)}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          {styles.icon}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{violation.observation}</p>
            {expanded && (
              <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                <p>
                  <span className="font-semibold text-foreground/80">Implication.</span>{" "}
                  {violation.implication}
                </p>
                <p>
                  <span className="font-semibold text-primary">Recommendation.</span>{" "}
                  {violation.recommendation}
                </p>
              </div>
            )}
          </div>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
