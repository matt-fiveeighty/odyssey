"use client";

import { useState } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Calendar,
  Layers,
  BookOpen,
  PawPrint,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Mirrors DiffEntry from data-airlock.ts
interface DiffEntry {
  id: string;
  category: "fee" | "deadline" | "quota" | "rule" | "species";
  field: string;
  label: string;
  severity: "pass" | "warn" | "block";
  oldValue: string | number | null;
  newValue: string | number | null;
  changeDescription: string;
  toleranceRule: string;
  pctChange?: number;
  daysDelta?: number;
  speciesId?: string;
}

interface QueueEntry {
  id: string;
  state_id: string;
  scrape_batch_id: string;
  status: string;
  diffs_json: DiffEntry[] | null;
  block_count: number;
  warn_count: number;
  pass_count: number;
  summary: string;
  evaluated_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
}

interface DiffViewerProps {
  entry: QueueEntry;
  onApprove: (queueId: string, notes: string) => Promise<void>;
  onReject: (queueId: string, notes: string) => Promise<void>;
  onClose: () => void;
}

const SEVERITY_CONFIG = {
  block: {
    icon: ShieldAlert,
    bg: "bg-red-500/8",
    border: "border-red-500/20",
    badge: "bg-red-500/15 text-red-400",
    text: "text-red-400",
    label: "BLOCKED",
  },
  warn: {
    icon: AlertTriangle,
    bg: "bg-amber-500/8",
    border: "border-amber-500/20",
    badge: "bg-amber-500/15 text-amber-400",
    text: "text-amber-400",
    label: "WARNING",
  },
  pass: {
    icon: CheckCircle2,
    bg: "bg-emerald-500/8",
    border: "border-emerald-500/20",
    badge: "bg-emerald-500/15 text-emerald-400",
    text: "text-emerald-400",
    label: "PASS",
  },
};

const CATEGORY_ICONS: Record<string, typeof DollarSign> = {
  fee: DollarSign,
  deadline: Calendar,
  quota: Layers,
  rule: BookOpen,
  species: PawPrint,
};

export function DiffViewer({ entry, onApprove, onReject, onClose }: DiffViewerProps) {
  const [notes, setNotes] = useState("");
  const [acting, setActing] = useState(false);

  const diffs = entry.diffs_json ?? [];
  const canAct = entry.status === "quarantined";

  const handleApprove = async () => {
    setActing(true);
    try {
      await onApprove(entry.id, notes);
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    setActing(true);
    try {
      await onReject(entry.id, notes);
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">{entry.state_id} Airlock Review</p>
            <p className="text-[10px] text-muted-foreground">
              Batch: {entry.scrape_batch_id} &middot;{" "}
              {entry.evaluated_at ? new Date(entry.evaluated_at).toLocaleString() : "—"}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Severity summary */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-secondary/30">
        {entry.block_count > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[10px] font-semibold">
            {entry.block_count} blocked
          </span>
        )}
        {entry.warn_count > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-semibold">
            {entry.warn_count} warnings
          </span>
        )}
        {entry.pass_count > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold">
            {entry.pass_count} passed
          </span>
        )}
        <span className="text-[10px] text-muted-foreground ml-auto">
          {entry.summary}
        </span>
      </div>

      {/* Diff table */}
      <div className="divide-y divide-border/30 max-h-[400px] overflow-y-auto">
        {diffs.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No diffs recorded for this batch.
          </div>
        ) : (
          diffs.map((diff) => {
            const cfg = SEVERITY_CONFIG[diff.severity];
            const Icon = cfg.icon;
            const CatIcon = CATEGORY_ICONS[diff.category] ?? Layers;

            return (
              <div key={diff.id} className={cn("px-4 py-3", cfg.bg)}>
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                    <CatIcon className="w-3.5 h-3.5 text-muted-foreground/60" />
                    <Icon className={cn("w-3.5 h-3.5", cfg.text)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-xs font-semibold">{diff.label}</p>
                      <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-medium", cfg.badge)}>
                        {cfg.label}
                      </span>
                    </div>
                    {/* Old → New */}
                    <div className="flex items-center gap-2 text-[11px] mb-1">
                      <span className="text-muted-foreground line-through">
                        {diff.oldValue ?? "—"}
                      </span>
                      <span className="text-muted-foreground/40">&rarr;</span>
                      <span className={cn("font-medium", cfg.text)}>
                        {diff.newValue ?? "—"}
                      </span>
                      {diff.pctChange != null && (
                        <span className="text-muted-foreground/50">
                          ({diff.pctChange > 0 ? "+" : ""}{diff.pctChange.toFixed(1)}%)
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      {diff.changeDescription}
                    </p>
                    <p className="text-[9px] text-muted-foreground/40 mt-0.5">
                      Rule: {diff.toleranceRule}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Actions */}
      {canAct && (
        <div className="px-4 py-3 border-t border-border/40 space-y-3">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Resolution notes (optional)..."
            className="w-full text-xs rounded-lg border border-border/60 bg-background p-2.5 resize-none h-16 focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReject}
              disabled={acting}
              className="gap-1.5 text-xs h-8 text-red-400 hover:text-red-300 hover:border-red-500/30"
            >
              <X className="w-3 h-3" />
              Reject
            </Button>
            <Button
              size="sm"
              onClick={handleApprove}
              disabled={acting}
              className="gap-1.5 text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="w-3 h-3" />
              {acting ? "Processing..." : "Approve & Deploy"}
            </Button>
          </div>
        </div>
      )}

      {/* Resolved state */}
      {!canAct && entry.resolved_at && (
        <div className="px-4 py-3 border-t border-border/40 bg-secondary/20">
          <p className="text-[11px] text-muted-foreground">
            <span className="font-medium">{entry.status === "approved" || entry.status === "auto_approved" ? "Approved" : "Rejected"}</span>
            {" "}by {entry.resolved_by ?? "system"} on{" "}
            {new Date(entry.resolved_at).toLocaleString()}
            {entry.resolution_notes && (
              <span className="block mt-1 italic">{entry.resolution_notes}</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
