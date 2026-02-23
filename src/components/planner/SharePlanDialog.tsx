"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Share2, Copy, Check, Loader2, AlertCircle, Calendar } from "lucide-react";
import type { PlanItem } from "./PlanItemCard";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SharePlanDialogProps {
  items: PlanItem[];
  year: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SharePlanDialog({ items, year }: SharePlanDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const generateShareLink = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/planner/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, year }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error ?? `Failed to create share link (${res.status})`,
        );
      }

      const data = await res.json();
      setShareUrl(data.url);
      setExpiresAt(data.expiresAt);
      setToken(data.token);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create share link",
      );
    } finally {
      setLoading(false);
    }
  }, [items, year]);

  const handleOpen = useCallback(() => {
    // Reset state on each open
    setShareUrl(null);
    setExpiresAt(null);
    setError(null);
    setCopied(false);
    setToken(null);
    setOpen(true);
    // Immediately generate share link
    void generateShareLink();
  }, [generateShareLink]);

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareUrl]);

  const calendarUrl = token ? `/api/planner/cal/${token}` : null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={handleOpen}
        disabled={items.length === 0}
      >
        <Share2 className="w-4 h-4" />
        Share
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Your Hunt Plan</DialogTitle>
            <DialogDescription>
              Anyone with this link can view a read-only snapshot of your{" "}
              {year} planner ({items.length} items).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {loading && (
              <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Generating share link...</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {shareUrl && !loading && (
              <>
                {/* Share URL */}
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={shareUrl}
                    className="flex-1 rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm font-mono text-foreground truncate"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <Button
                    size="sm"
                    variant={copied ? "default" : "outline"}
                    onClick={handleCopy}
                    className="gap-1.5 shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>

                {/* Calendar subscription link */}
                {calendarUrl && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30 border border-border/50">
                    <Calendar className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">iCal Subscription</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        Recipients can subscribe to this plan in their calendar app
                      </p>
                    </div>
                  </div>
                )}

                {/* Expiration note */}
                {expiresAt && (
                  <p className="text-xs text-muted-foreground text-center">
                    This link expires on{" "}
                    {new Date(expiresAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                )}
              </>
            )}

            {error && !loading && (
              <div className="flex justify-center">
                <Button variant="outline" size="sm" onClick={generateShareLink}>
                  Try Again
                </Button>
              </div>
            )}
          </div>

          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </>
  );
}
