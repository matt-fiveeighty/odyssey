"use client";

import { useState } from "react";
import type { StrategicAssessment } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Share2, Check, Loader2, AlertCircle } from "lucide-react";

type Status = "idle" | "loading" | "copied" | "error";

interface ShareButtonProps {
  assessment: StrategicAssessment;
}

export function ShareButton({ assessment }: ShareButtonProps) {
  const [status, setStatus] = useState<Status>("idle");

  async function handleShare() {
    setStatus("loading");

    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessment }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          console.warn("[ShareButton] Rate limited — try again later");
        } else if (res.status === 503) {
          console.warn("[ShareButton] Share service temporarily unavailable");
        }
        setStatus("error");
        setTimeout(() => setStatus("idle"), 3000);
        return;
      }

      const { url } = (await res.json()) as { url: string };

      // Copy to clipboard with secure context fallback
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setStatus("copied");
      setTimeout(() => setStatus("idle"), 2500);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  const icon = {
    idle: <Share2 className="w-4 h-4" />,
    loading: <Loader2 className="w-4 h-4 animate-spin" />,
    copied: <Check className="w-4 h-4" />,
    error: <AlertCircle className="w-4 h-4" />,
  }[status];

  const label = {
    idle: "Share Plan",
    loading: "Sharing...",
    copied: "Link Copied!",
    error: "Failed",
  }[status];

  return (
    <Button
      variant="outline"
      className="gap-1.5"
      disabled={status === "loading"}
      onClick={handleShare}
    >
      {icon}
      {label}
    </Button>
  );
}
