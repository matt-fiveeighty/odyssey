"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Shield,
  UserPlus,
  X,
  Check,
  Clock,
  XCircle,
  Users,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export type MemberStatus = "confirmed" | "pending" | "declined";

export interface RosterMember {
  id: string;
  name: string;
  email?: string;
  points: number;
  status: MemberStatus;
  isLeader: boolean;
}

interface GroupRosterProps {
  members: RosterMember[];
  onInvite?: (email: string) => void;
  onRemove?: (memberId: string) => void;
  canEdit?: boolean;
}

// ============================================================================
// Status display config
// ============================================================================

const STATUS_CONFIG: Record<
  MemberStatus,
  { label: string; icon: typeof Check; variant: "default" | "secondary" | "destructive" }
> = {
  confirmed: { label: "Confirmed", icon: Check, variant: "default" },
  pending: { label: "Pending", icon: Clock, variant: "secondary" },
  declined: { label: "Declined", icon: XCircle, variant: "destructive" },
};

// ============================================================================
// GroupRoster
// ============================================================================

export function GroupRoster({
  members,
  onInvite,
  onRemove,
  canEdit = true,
}: GroupRosterProps) {
  const [inviteEmail, setInviteEmail] = useState("");

  const totalPoints = members.reduce((sum, m) => sum + m.points, 0);
  const confirmedMembers = members.filter((m) => m.status === "confirmed");
  const avgPoints =
    confirmedMembers.length > 0
      ? totalPoints / confirmedMembers.length
      : 0;

  const handleInvite = useCallback(() => {
    if (!inviteEmail.trim() || !onInvite) return;
    onInvite(inviteEmail.trim());
    setInviteEmail("");
  }, [inviteEmail, onInvite]);

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Party Members ({members.length})
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            Total: <span className="font-bold text-foreground">{totalPoints}</span> pts
          </span>
          <span>
            Avg: <span className="font-bold text-foreground">{avgPoints.toFixed(1)}</span> pts
          </span>
        </div>
      </div>

      {/* Member list */}
      <div className="space-y-2">
        {members.map((member) => {
          const statusCfg = STATUS_CONFIG[member.status];
          const StatusIcon = statusCfg.icon;

          return (
            <div
              key={member.id}
              className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/50"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Avatar placeholder */}
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-medium text-primary">
                    {member.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {member.isLeader && (
                      <Shield className="w-3 h-3 text-primary shrink-0" />
                    )}
                    <span className="text-sm font-medium truncate">
                      {member.name}
                    </span>
                  </div>
                  {member.email && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      {member.email}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                {/* Points */}
                <span className="text-sm font-bold tabular-nums">
                  {member.points} <span className="text-[10px] font-normal text-muted-foreground">pts</span>
                </span>

                {/* Status badge */}
                <Badge variant={statusCfg.variant} className="text-[10px] gap-0.5">
                  <StatusIcon className="w-2.5 h-2.5" />
                  {statusCfg.label}
                </Badge>

                {/* Remove button */}
                {canEdit && !member.isLeader && onRemove && (
                  <button
                    onClick={() => onRemove(member.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Invite form */}
      {canEdit && onInvite && (
        <div className="flex items-center gap-2">
          <Input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="Invite by email..."
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleInvite}
            disabled={!inviteEmail.trim()}
          >
            <UserPlus className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
