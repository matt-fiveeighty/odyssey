"use client";

import { useState, useCallback } from "react";
import { Bug, CheckCircle2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildBugReport, submitBugReport } from "@/lib/engine/bug-report";
import { trackEvent } from "@/lib/engine/analytics";

type ReportState = "idle" | "open" | "submitting" | "success" | "error";

export function BugReportButton() {
  const [state, setState] = useState<ReportState>("idle");
  const [comment, setComment] = useState("");

  const handleOpen = useCallback(() => {
    setState("open");
    setComment("");
  }, []);

  const handleClose = useCallback(() => {
    setState("idle");
    setComment("");
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!comment.trim()) return;
    setState("submitting");

    const report = buildBugReport(
      comment.trim(),
      typeof window !== "undefined" ? window.location.href : "/unknown",
    );

    const success = await submitBugReport(report);
    setState(success ? "success" : "error");

    // Track the event
    trackEvent("bug_report_submitted", {
      report_id: report.report_id,
      page_url: report.system_state.page_url,
    });

    // Auto-close after success
    if (success) {
      setTimeout(() => {
        setState("idle");
        setComment("");
      }, 2000);
    }
  }, [comment]);

  // Idle state — just the floating button
  if (state === "idle") {
    return (
      <button
        onClick={handleOpen}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-zinc-900 border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors shadow-lg"
        title="Report a logic break"
      >
        <Bug className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Report Logic Break</span>
      </button>
    );
  }

  // Success state
  if (state === "success") {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-emerald-950 border border-emerald-800 px-4 py-3 text-xs text-emerald-300 shadow-lg">
        <CheckCircle2 className="h-4 w-4" />
        Report submitted. Thank you!
      </div>
    );
  }

  // Open / submitting / error states — the report form
  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded-lg bg-zinc-900 border border-zinc-700 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Bug className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-medium text-zinc-200">Report Logic Break</span>
        </div>
        <button
          onClick={handleClose}
          className="text-zinc-500 hover:text-zinc-300"
          disabled={state === "submitting"}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Describe what looks wrong. Your current system state will be
          automatically captured to help us reproduce the issue.
        </p>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="e.g. CO elk draw odds seem too high for 3 points..."
          className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 resize-none focus:outline-none focus:border-zinc-500"
          rows={3}
          disabled={state === "submitting"}
          autoFocus
        />

        {state === "error" && (
          <p className="text-[11px] text-red-400">
            Failed to submit. Your report was saved locally.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={state === "submitting"}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!comment.trim() || state === "submitting"}
            className="text-xs bg-amber-600 hover:bg-amber-500 text-white"
          >
            {state === "submitting" ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Sending...
              </>
            ) : (
              "Submit Report"
            )}
          </Button>
        </div>
      </div>

      {/* Footer: captured context preview */}
      <div className="border-t border-zinc-800 px-4 py-2 text-[10px] text-zinc-600">
        Auto-captures: roadmap state, alerts, points, engine versions
      </div>
    </div>
  );
}
