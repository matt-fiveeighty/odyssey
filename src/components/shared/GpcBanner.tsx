"use client";

import { useGPC } from "@/lib/hooks/use-gpc";
import { ShieldCheck } from "lucide-react";

/**
 * If the browser sends a Global Privacy Control signal, show a
 * subtle confirmation banner so the user knows we honour it.
 *
 * Renders nothing when GPC is not active.
 */
export function GpcBanner() {
  const gpc = useGPC();

  if (!gpc) return null;

  return (
    <div className="flex items-center gap-2 bg-primary/5 border border-primary/10 rounded-lg px-3 py-2 text-xs text-primary">
      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
      <span>
        We detected your{" "}
        <strong className="font-medium">Global Privacy Control</strong> signal
        and honour it — your data will not be sold or shared for cross-context
        behavioural advertising.
      </span>
    </div>
  );
}
