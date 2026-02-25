"use client";

import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface QueueEntry {
  id: string;
  state_id: string;
  scrape_batch_id: string;
  status: string;
  diffs_json?: unknown[] | null;
  block_count: number;
  warn_count: number;
  pass_count: number;
  summary: string;
  evaluated_at: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes?: string | null;
}

interface QuarantineQueueProps {
  entries: QueueEntry[];
  selectedId: string | null;
  onSelect: (entry: QueueEntry) => void;
}

const STATUS_CONFIG: Record<string, { color: string; icon: typeof Clock; label: string }> = {
  quarantined: { color: "text-amber-400", icon: AlertTriangle, label: "Quarantined" },
  auto_approved: { color: "text-emerald-400", icon: CheckCircle2, label: "Auto-approved" },
  approved: { color: "text-emerald-400", icon: CheckCircle2, label: "Approved" },
  rejected: { color: "text-red-400", icon: ShieldAlert, label: "Rejected" },
  pending: { color: "text-blue-400", icon: Clock, label: "Pending" },
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function QuarantineQueue({ entries, selectedId, onSelect }: QuarantineQueueProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-8 text-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
        <p className="text-sm font-medium">Airlock clear</p>
        <p className="text-xs text-muted-foreground mt-1">
          No quarantined batches. All scraped data is either approved or pending evaluation.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
      <div className="px-4 py-2.5 border-b border-border/40">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Quarantine Queue
        </p>
      </div>
      <div className="divide-y divide-border/30">
        {entries.map((entry) => {
          const cfg = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.pending;
          const StatusIcon = cfg.icon;
          const isSelected = selectedId === entry.id;

          return (
            <button
              key={entry.id}
              onClick={() => onSelect(entry)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/30 transition-colors cursor-pointer",
                isSelected && "bg-secondary/50"
              )}
            >
              <StatusIcon className={cn("w-4 h-4 shrink-0", cfg.color)} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">{entry.state_id}</span>
                  <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-medium",
                    entry.status === "quarantined" ? "bg-amber-500/15 text-amber-400" :
                    entry.status === "auto_approved" || entry.status === "approved" ? "bg-emerald-500/15 text-emerald-400" :
                    entry.status === "rejected" ? "bg-red-500/15 text-red-400" :
                    "bg-blue-500/15 text-blue-400"
                  )}>
                    {cfg.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {entry.block_count > 0 && (
                    <span className="text-[9px] text-red-400">{entry.block_count} blocked</span>
                  )}
                  {entry.warn_count > 0 && (
                    <span className="text-[9px] text-amber-400">{entry.warn_count} warn</span>
                  )}
                  {entry.pass_count > 0 && (
                    <span className="text-[9px] text-emerald-400">{entry.pass_count} pass</span>
                  )}
                  <span className="text-[9px] text-muted-foreground/40 ml-auto">
                    {timeAgo(entry.evaluated_at || entry.created_at)}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
