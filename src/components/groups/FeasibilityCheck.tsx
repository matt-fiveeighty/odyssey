"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  Users,
  Lightbulb,
} from "lucide-react";
import {
  checkGroupFeasibility,
  type GroupMember,
  type FeasibilityResult,
} from "@/lib/engine/group-feasibility";

// ============================================================================
// Types
// ============================================================================

interface FeasibilityCheckProps {
  members: GroupMember[];
  stateId: string;
  speciesId: string;
}

// ============================================================================
// Status display config
// ============================================================================

const STATUS_CONFIG: Record<
  FeasibilityResult["status"],
  {
    label: string;
    icon: typeof CheckCircle;
    color: string;
    bg: string;
    border: string;
  }
> = {
  green: {
    label: "Good to go",
    icon: CheckCircle,
    color: "text-green-400",
    bg: "bg-green-400/10",
    border: "border-green-400/20",
  },
  yellow: {
    label: "Possible issues",
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
  },
  red: {
    label: "Not feasible",
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/20",
  },
};

// ============================================================================
// FeasibilityCheck
// ============================================================================

export function FeasibilityCheck({
  members,
  stateId,
  speciesId,
}: FeasibilityCheckProps) {
  // Auto-recalculate when members change
  const result = useMemo(
    () => checkGroupFeasibility(stateId, members, speciesId),
    [stateId, members, speciesId]
  );

  const config = STATUS_CONFIG[result.status];
  const StatusIcon = config.icon;

  return (
    <Card className={`${config.bg} ${config.border} border`}>
      <CardContent className="p-4 space-y-3">
        {/* Status header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className={`w-5 h-5 ${config.color}`} />
            <div>
              <p className={`text-sm font-semibold ${config.color}`}>
                {config.label}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {result.stateName} Group Feasibility
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">
              <Users className="w-2.5 h-2.5 mr-0.5" />
              {members.length}/{result.maxGroupSize} max
            </Badge>
            {result.pointPooling && (
              <Badge variant="outline" className="text-[10px]">
                Points pooled
              </Badge>
            )}
          </div>
        </div>

        {/* Warnings */}
        {result.warnings.length > 0 && (
          <div className="space-y-1.5">
            {result.warnings.map((warning, i) => (
              <div key={i} className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">{warning}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tips */}
        {result.tips.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Lightbulb className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Tips
              </span>
            </div>
            {result.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2">
                <Info className="w-3 h-3 text-primary/60 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">{tip}</p>
              </div>
            ))}
          </div>
        )}

        {/* Group allows info */}
        {!result.allowsGroupApplication && (
          <p className="text-xs text-red-400 font-medium">
            This state does not support group applications.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
