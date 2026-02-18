"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Settings,
  CreditCard,
  Download,
  Trash2,
  Loader2,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { MfaEnrollment } from "@/components/settings/MfaEnrollment";

export default function SettingsPage() {
  const router = useRouter();
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function handleExport() {
    setExportLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/account/export", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setMessage({ type: "error", text: data.error });
        return;
      }
      // Trigger download
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `odyssey-outdoors-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ type: "success", text: "Data exported successfully." });
    } catch {
      setMessage({ type: "error", text: "Export failed. Please try again." });
    } finally {
      setExportLoading(false);
    }
  }

  async function handleDelete() {
    setDeleteLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: deleteReason || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error });
        return;
      }
      setMessage({
        type: "success",
        text: data.message,
      });
      setDeleteConfirm(false);
    } catch {
      setMessage({
        type: "error",
        text: "Deletion request failed. Please try again.",
      });
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleCancelDelete() {
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: data.message });
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch {
      setMessage({ type: "error", text: "Could not cancel request." });
    }
  }

  async function handlePortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setMessage({
          type: "error",
          text: data.error ?? "Could not open billing portal.",
        });
        setPortalLoading(false);
      }
    } catch {
      setMessage({ type: "error", text: "Could not open billing portal." });
      setPortalLoading(false);
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Settings className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Account Settings</h1>
          <p className="text-xs text-muted-foreground">
            Manage your subscription, data, and account
          </p>
        </div>
      </div>

      {/* Status message */}
      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-primary/10 text-primary"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Subscription */}
      <section className="rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold">Subscription</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage your billing, upgrade or downgrade your plan, and view payment
          history through the Stripe Customer Portal.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePortal}
          disabled={portalLoading}
        >
          {portalLoading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <ExternalLink className="w-4 h-4 mr-2" />
          )}
          Manage Billing
        </Button>
      </section>

      {/* Security */}
      <section className="rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold">Security</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Update your password or enable two-factor authentication to keep your
          account secure.
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/auth/reset-password")}
          >
            Change Password
          </Button>
        </div>

        {/* MFA */}
        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-medium mb-3">Two-Factor Authentication</h3>
          <MfaEnrollment />
        </div>
      </section>

      {/* Data Export */}
      <section className="rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold">Export Your Data</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Download all your data in machine-readable JSON format. Includes your
          profile, assessments, goals, and wizard state. One export per 24
          hours.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exportLoading}
        >
          {exportLoading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Export Data
        </Button>
      </section>

      {/* Danger Zone */}
      <section className="rounded-xl border border-destructive/30 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-destructive" />
          <h2 className="font-semibold text-destructive">Danger Zone</h2>
        </div>

        {!deleteConfirm ? (
          <>
            <p className="text-sm text-muted-foreground">
              Permanently delete your account and all associated data. This
              action cannot be undone after confirmation. Your data will be
              deleted within 30 days.
            </p>
            <div className="flex gap-3">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Account
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCancelDelete}>
                Cancel Pending Deletion
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-2 bg-destructive/10 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">
                This will permanently delete your account, assessments, goals,
                and all data. You will receive a confirmation email. Your data
                will be deleted within 30 days of confirmation.
              </p>
            </div>
            <textarea
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground resize-none"
              rows={2}
              placeholder="Reason for leaving (optional)"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
            />
            <div className="flex gap-3">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Confirm Deletion
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Sign out */}
      <div className="pt-4 border-t border-border">
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          Sign Out
        </Button>
      </div>
    </div>
  );
}
