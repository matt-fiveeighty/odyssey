"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Share2, UserPlus, X, Mail, Eye, Edit } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export type ShareRole = "view" | "edit";

interface SharedUser {
  id: string;
  email: string;
  role: ShareRole;
  sharedAt: string;
}

interface SharePlanDialogProps {
  planId: string;
  isOpen: boolean;
  onClose: () => void;
}

// ============================================================================
// SharePlanDialog
// ============================================================================

export function SharePlanDialog({ planId, isOpen, onClose }: SharePlanDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ShareRole>("view");
  const [shares, setShares] = useState<SharedUser[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleShare = useCallback(async () => {
    if (!email.trim()) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    // Check for duplicate
    if (shares.some((s) => s.email.toLowerCase() === email.toLowerCase())) {
      setError("This user already has access.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/planner/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, email, role }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to share plan.");
      }

      // Add to local state
      setShares((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          email,
          role,
          sharedAt: new Date().toISOString(),
        },
      ]);
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to share plan.");
    } finally {
      setIsSubmitting(false);
    }
  }, [email, role, planId, shares]);

  const handleRemove = useCallback(
    async (shareId: string) => {
      try {
        await fetch("/api/planner/share", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId, shareId }),
        });

        setShares((prev) => prev.filter((s) => s.id !== shareId));
      } catch {
        // Silent fail for removal -- user can retry
      }
    },
    [planId]
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            Share Plan
          </DialogTitle>
          <DialogDescription>
            Invite others to view or edit this plan.
          </DialogDescription>
        </DialogHeader>

        {/* Invite form */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="Email address..."
                className="pl-9"
                onKeyDown={(e) => e.key === "Enter" && handleShare()}
              />
            </div>
            <Select value={role} onValueChange={(v) => setRole(v as ShareRole)}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-3 h-3" />
                    View
                  </span>
                </SelectItem>
                <SelectItem value="edit">
                  <span className="flex items-center gap-1.5">
                    <Edit className="w-3 h-3" />
                    Edit
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handleShare}
              disabled={!email.trim() || isSubmitting}
            >
              <UserPlus className="w-4 h-4" />
            </Button>
          </div>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </div>

        {/* Current shares */}
        {shares.length > 0 && (
          <div className="space-y-2 mt-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Shared with
            </p>
            <div className="space-y-1.5">
              {shares.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-secondary/50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-medium text-primary">
                        {share.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm truncate">{share.email}</span>
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {share.role === "edit" ? "Can edit" : "Can view"}
                    </Badge>
                  </div>
                  <button
                    onClick={() => handleRemove(share.id)}
                    className="text-muted-foreground hover:text-destructive shrink-0 ml-2"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {shares.length === 0 && (
          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground">
              No one has access yet. Add an email above to share.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
