"use client";

import { useState } from "react";
import type { StrategicAssessment } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  CalendarPlus,
  Check,
  Loader2,
  AlertCircle,
  Copy,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type Status = "idle" | "loading" | "ready" | "error";

interface SubscriptionData {
  webcalURL: string;
  httpURL: string;
  token: string;
  expiresAt: string;
}

interface SubscribeCalendarProps {
  assessment: StrategicAssessment;
}

// ── Component ────────────────────────────────────────────────────────────────

export function SubscribeCalendar({ assessment }: SubscribeCalendarProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [subscription, setSubscription] = useState<SubscriptionData | null>(
    null,
  );
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");

  // ── Create subscription ──────────────────────────────────────────────────

  async function handleSubscribe() {
    setStatus("loading");

    try {
      const res = await fetch("/api/cal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessment }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          console.warn(
            "[SubscribeCalendar] Rate limited — try again later",
          );
        } else if (res.status === 503) {
          console.warn(
            "[SubscribeCalendar] Calendar service temporarily unavailable",
          );
        }
        setStatus("error");
        setTimeout(() => setStatus("idle"), 3000);
        return;
      }

      const data = (await res.json()) as SubscriptionData;
      setSubscription(data);
      setStatus("ready");
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  // ── Regenerate token (ICS-08) ────────────────────────────────────────────

  async function handleRegenerate() {
    setStatus("loading");

    try {
      const res = await fetch("/api/cal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessment }),
      });

      if (!res.ok) {
        setStatus("ready"); // Keep existing subscription visible
        return;
      }

      const data = (await res.json()) as SubscriptionData;
      setSubscription(data);
      setStatus("ready");
    } catch {
      setStatus("ready"); // Keep existing subscription visible
    }
  }

  // ── Copy URL to clipboard ────────────────────────────────────────────────

  async function handleCopyURL() {
    if (!subscription) return;

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(subscription.httpURL);
      } else {
        // Secure context fallback
        const textarea = document.createElement("textarea");
        textarea.value = subscription.httpURL;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 2500);
    } catch {
      // Silently fail — user can manually copy from the URL display
    }
  }

  // ── Open in native calendar app ──────────────────────────────────────────

  function handleOpenCalendar() {
    if (!subscription) return;
    // webcal:// triggers the OS calendar handler
    window.open(subscription.webcalURL, "_self");
  }

  // ── Render: idle ─────────────────────────────────────────────────────────

  if (status === "idle" && !subscription) {
    return (
      <Button
        variant="outline"
        className="gap-1.5"
        onClick={handleSubscribe}
      >
        <CalendarPlus className="w-4 h-4" />
        Subscribe to Calendar
      </Button>
    );
  }

  // ── Render: loading ──────────────────────────────────────────────────────

  if (status === "loading") {
    return (
      <Button variant="outline" className="gap-1.5" disabled>
        <Loader2 className="w-4 h-4 animate-spin" />
        Creating...
      </Button>
    );
  }

  // ── Render: error ────────────────────────────────────────────────────────

  if (status === "error") {
    return (
      <Button
        variant="outline"
        className="gap-1.5 text-destructive"
        disabled
      >
        <AlertCircle className="w-4 h-4" />
        Failed
      </Button>
    );
  }

  // ── Render: ready (expanded panel as popover) ──────────────────────────────

  if (status === "ready" && subscription) {
    return (
      <div className="relative">
        {/* Trigger button stays in flow */}
        <Button
          variant="outline"
          className="gap-1.5"
          onClick={() => setStatus("idle")}
        >
          <Check className="w-4 h-4 text-chart-2" />
          Subscribed
        </Button>

        {/* Floating panel above the button */}
        <div className="absolute bottom-full mb-2 right-0 w-[280px] bg-background border border-border rounded-xl p-4 space-y-3 shadow-lg z-50">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-chart-2" />
              <span className="text-xs font-medium">
                Calendar Subscription
              </span>
            </div>
            <button
              onClick={() => setStatus("idle")}
              className="text-muted-foreground hover:text-foreground text-xs cursor-pointer"
              aria-label="Close subscription panel"
            >
              &times;
            </button>
          </div>

          {/* Instruction */}
          <p className="text-xs text-muted-foreground">
            Add to your calendar app for automatic updates. Changes may take
            up to 24 hours to appear.
          </p>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="gap-1.5 flex-1"
              onClick={handleOpenCalendar}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open in Calendar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleCopyURL}
            >
              {copyStatus === "copied" ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copyStatus === "copied" ? "Copied" : "Copy URL"}
            </Button>
          </div>

          {/* URL display */}
          <div className="text-[10px] font-mono text-muted-foreground bg-secondary/50 rounded px-2 py-1 truncate">
            {subscription.httpURL}
          </div>

          {/* Regenerate + expiration */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleRegenerate}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              Generate new link
            </button>
            <span className="text-[10px] text-muted-foreground">
              Expires:{" "}
              {new Date(subscription.expiresAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Fallback: collapsed but with existing subscription (user closed the panel)
  return (
    <Button variant="outline" className="gap-1.5" onClick={() => setStatus("ready")}>
      <CalendarPlus className="w-4 h-4" />
      Calendar
    </Button>
  );
}
