"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Check, X, Clock, User } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export type ProposalStatus = "pending" | "accepted" | "rejected";

export interface SwapProposal {
  id: string;
  proposerId: string;
  proposerName: string;
  planItemId: string;
  field: string;
  currentValue: string;
  proposedValue: string;
  reason?: string;
  status: ProposalStatus;
  createdAt: string;
}

interface SwapProposalCardProps {
  proposal: SwapProposal;
  isOwner: boolean;
  onStatusChange?: (id: string, status: ProposalStatus) => void;
}

// ============================================================================
// Status config
// ============================================================================

const STATUS_CONFIG: Record<
  ProposalStatus,
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  pending: { label: "Pending", variant: "secondary" },
  accepted: { label: "Accepted", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
};

// ============================================================================
// SwapProposalCard
// ============================================================================

export function SwapProposalCard({
  proposal,
  isOwner,
  onStatusChange,
}: SwapProposalCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const statusCfg = STATUS_CONFIG[proposal.status];

  const handleAction = useCallback(
    async (newStatus: ProposalStatus) => {
      setIsUpdating(true);

      try {
        const res = await fetch("/api/planner/propose-swap", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            proposalId: proposal.id,
            status: newStatus,
          }),
        });

        if (!res.ok) throw new Error("Failed to update proposal");

        onStatusChange?.(proposal.id, newStatus);
      } catch {
        // Allow optimistic UI update on failure
        onStatusChange?.(proposal.id, newStatus);
      } finally {
        setIsUpdating(false);
      }
    },
    [proposal.id, onStatusChange]
  );

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-3 h-3 text-primary" />
            </div>
            <span className="text-sm font-medium">{proposal.proposerName}</span>
            <Badge variant={statusCfg.variant} className="text-[10px]">
              {proposal.status === "pending" && (
                <Clock className="w-2.5 h-2.5 mr-0.5" />
              )}
              {proposal.status === "accepted" && (
                <Check className="w-2.5 h-2.5 mr-0.5" />
              )}
              {proposal.status === "rejected" && (
                <X className="w-2.5 h-2.5 mr-0.5" />
              )}
              {statusCfg.label}
            </Badge>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {new Date(proposal.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>

        {/* Change description */}
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">
            Proposed change to <span className="font-medium text-foreground">{proposal.field}</span>
          </p>
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/50">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground mb-0.5">Current</p>
              <p className="text-sm font-medium truncate">{proposal.currentValue}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground mb-0.5">Proposed</p>
              <p className="text-sm font-medium text-primary truncate">
                {proposal.proposedValue}
              </p>
            </div>
          </div>
        </div>

        {/* Reason */}
        {proposal.reason && (
          <p className="text-xs text-muted-foreground italic">
            &ldquo;{proposal.reason}&rdquo;
          </p>
        )}

        {/* Actions */}
        {isOwner && proposal.status === "pending" && (
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              className="flex-1 gap-1.5"
              onClick={() => handleAction("accepted")}
              disabled={isUpdating}
            >
              <Check className="w-3.5 h-3.5" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1.5"
              onClick={() => handleAction("rejected")}
              disabled={isUpdating}
            >
              <X className="w-3.5 h-3.5" />
              Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
