"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  RefreshCw,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QuarantineQueue, type QueueEntry } from "@/components/admin/QuarantineQueue";
import { DiffViewer } from "@/components/admin/DiffViewer";

// ─── Types ──────────────────────────────────────────────────────────────────

interface StateStatus {
  stateId: string;
  lastRunAt: string | null;
  rowsImported: number;
  errors: string[];
  daysSinceLastRun: number | null;
  isStale: boolean;
  tagCostsLastSynced: string | null;
}

interface ScraperStatusResponse {
  summary: {
    totalStates: number;
    statesWithData: number;
    statesWithErrors: number;
    staleStates: number;
    totalRowsImported: number;
    lastFullRun: string | null;
    dataFreshnessScore: number;
    checkedAt: string;
  };
  states: StateStatus[];
}

interface AuditEntry {
  id: string;
  queue_id: string;
  state_id: string;
  action: string;
  promoted_at: string;
  promoted_by: string;
}

// ─── Admin Key Hook ─────────────────────────────────────────────────────────

function useAdminKey(): string {
  // In production, this would come from a secure session/token.
  // For now, read from env (exposed via NEXT_PUBLIC for the admin page).
  return typeof window !== "undefined"
    ? (localStorage.getItem("admin-key") ?? "")
    : "";
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AdminPage() {
  const adminKey = useAdminKey();
  const [keyInput, setKeyInput] = useState("");
  const [authed, setAuthed] = useState(false);

  const [scraperStatus, setScraperStatus] = useState<ScraperStatusResponse | null>(null);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<QueueEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"queue" | "history">("queue");

  const effectiveKey = authed ? (adminKey || keyInput) : "";

  // Auth gate
  useEffect(() => {
    if (adminKey) setAuthed(true);
  }, [adminKey]);

  const handleAuth = () => {
    if (keyInput) {
      localStorage.setItem("admin-key", keyInput);
      setAuthed(true);
    }
  };

  // Fetch data
  const fetchAll = useCallback(async () => {
    if (!effectiveKey) return;
    setLoading(true);

    try {
      const headers = { "x-admin-key": effectiveKey };

      const [statusRes, queueRes] = await Promise.all([
        fetch("/api/admin/scraper-status", { headers }),
        fetch("/api/admin/airlock/queue", { headers }),
      ]);

      if (statusRes.ok) {
        setScraperStatus(await statusRes.json());
      }
      if (queueRes.ok) {
        const data = await queueRes.json();
        setQueue(data.queue ?? []);
        setAuditLog(data.auditLog ?? []);
      }
    } catch (err) {
      console.error("[admin] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [effectiveKey]);

  useEffect(() => {
    if (authed) fetchAll();
  }, [authed, fetchAll]);

  // Actions
  const handleApprove = async (queueId: string, notes: string) => {
    await fetch("/api/admin/airlock/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": effectiveKey },
      body: JSON.stringify({ queueId, notes }),
    });
    setSelectedEntry(null);
    fetchAll();
  };

  const handleReject = async (queueId: string, notes: string) => {
    await fetch("/api/admin/airlock/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": effectiveKey },
      body: JSON.stringify({ queueId, notes }),
    });
    setSelectedEntry(null);
    fetchAll();
  };

  // ─── Auth Gate ────────────────────────────────────────────────────────────

  if (!authed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <div className="text-center max-w-md">
          <h1 className="text-xl font-semibold mb-2">Data Airlock</h1>
          <p className="text-sm text-muted-foreground">Enter your admin key to access the quarantine dashboard.</p>
        </div>
        <div className="flex gap-2 w-full max-w-sm">
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAuth()}
            placeholder="Service role key..."
            className="flex-1 text-sm rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <Button onClick={handleAuth} size="sm" className="h-9">
            Unlock
          </Button>
        </div>
      </div>
    );
  }

  // ─── Dashboard ────────────────────────────────────────────────────────────

  const quarantined = queue.filter((q) => q.status === "quarantined");
  const resolved = queue.filter((q) => q.status !== "quarantined" && q.status !== "pending");

  return (
    <div className="p-4 md:p-6 space-y-4 fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Data Airlock</h1>
            <p className="text-xs text-muted-foreground">
              Scraper health, quarantine queue, and data promotion
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchAll}
          disabled={loading}
          className="gap-1.5 text-xs h-8"
        >
          <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* ── Scraper Health Grid ── */}
      {scraperStatus && (
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
          {/* Health summary bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40">
            <div className="flex items-center gap-3">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Scraper Health
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                scraperStatus.summary.dataFreshnessScore >= 70 ? "bg-emerald-500/15 text-emerald-400" :
                scraperStatus.summary.dataFreshnessScore >= 40 ? "bg-amber-500/15 text-amber-400" :
                "bg-red-500/15 text-red-400"
              )}>
                Freshness: {scraperStatus.summary.dataFreshnessScore}%
              </span>
              <span className="text-[10px] text-muted-foreground">
                {scraperStatus.summary.statesWithData}/{scraperStatus.summary.totalStates} states active
              </span>
            </div>
          </div>

          {/* State grid */}
          <div className="p-3 grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-2">
            {scraperStatus.states.map((state) => (
              <div
                key={state.stateId}
                className={cn(
                  "rounded-lg border p-2.5 text-center",
                  state.isStale
                    ? "border-red-500/20 bg-red-500/5"
                    : state.errors.length > 0
                    ? "border-amber-500/20 bg-amber-500/5"
                    : state.lastRunAt
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : "border-border/40 bg-secondary/20"
                )}
              >
                <p className="text-xs font-bold">{state.stateId}</p>
                <p className={cn(
                  "text-[9px] mt-0.5",
                  state.isStale ? "text-red-400" :
                  state.errors.length > 0 ? "text-amber-400" :
                  state.lastRunAt ? "text-emerald-400" : "text-muted-foreground"
                )}>
                  {state.daysSinceLastRun != null
                    ? `${state.daysSinceLastRun}d ago`
                    : "Never"}
                </p>
                <p className="text-[8px] text-muted-foreground/50 mt-0.5">
                  {state.rowsImported} rows
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border/60 bg-card p-3 text-center">
          <AlertTriangle className="w-5 h-5 text-amber-400 mx-auto mb-1" />
          <p className="text-xl font-bold font-financial">{quarantined.length}</p>
          <p className="text-[10px] text-muted-foreground">Quarantined</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-3 text-center">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
          <p className="text-xl font-bold font-financial">
            {queue.filter((q) => q.status === "auto_approved").length}
          </p>
          <p className="text-[10px] text-muted-foreground">Auto-approved</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-3 text-center">
          <Zap className="w-5 h-5 text-blue-400 mx-auto mb-1" />
          <p className="text-xl font-bold font-financial">
            {queue.filter((q) => q.status === "approved").length}
          </p>
          <p className="text-[10px] text-muted-foreground">Manually Approved</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-3 text-center">
          <XCircle className="w-5 h-5 text-red-400 mx-auto mb-1" />
          <p className="text-xl font-bold font-financial">
            {queue.filter((q) => q.status === "rejected").length}
          </p>
          <p className="text-[10px] text-muted-foreground">Rejected</p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 bg-secondary/30 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("queue")}
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
            tab === "queue" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Queue ({quarantined.length})
        </button>
        <button
          onClick={() => setTab("history")}
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
            tab === "history" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          History ({resolved.length})
        </button>
      </div>

      {/* ── Content ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-4">
        {/* Left: Queue / History list */}
        <QuarantineQueue
          entries={tab === "queue" ? quarantined : resolved}
          selectedId={selectedEntry?.id ?? null}
          onSelect={(entry) => setSelectedEntry(entry)}
        />

        {/* Right: Diff Viewer */}
        {selectedEntry ? (
          <DiffViewer
            entry={selectedEntry as Parameters<typeof DiffViewer>[0]["entry"]}
            onApprove={handleApprove}
            onReject={handleReject}
            onClose={() => setSelectedEntry(null)}
          />
        ) : (
          <div className="rounded-xl border border-border/60 bg-card p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
            <Clock className="w-8 h-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              Select a batch to review its diffs
            </p>
          </div>
        )}
      </div>

      {/* ── Audit Log (compact) ── */}
      {auditLog.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 border-b border-border/40">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Recent Audit Log
            </p>
          </div>
          <div className="divide-y divide-border/30 max-h-[200px] overflow-y-auto">
            {auditLog.slice(0, 20).map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-2">
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  entry.action === "auto_promote" ? "bg-emerald-400" :
                  entry.action === "manual_approve" ? "bg-blue-400" :
                  "bg-red-400"
                )} />
                <span className="text-xs font-medium">{entry.state_id}</span>
                <span className="text-[10px] text-muted-foreground">{entry.action.replace("_", " ")}</span>
                <span className="text-[10px] text-muted-foreground/40 ml-auto">
                  {new Date(entry.promoted_at).toLocaleString()}
                </span>
                <span className="text-[9px] text-muted-foreground/30">{entry.promoted_by}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
