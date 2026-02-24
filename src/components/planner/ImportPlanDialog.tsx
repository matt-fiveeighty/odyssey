"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Upload, Clipboard, Users, AlertCircle } from "lucide-react";
import { useAppStore, PLAN_PALETTE } from "@/lib/store";
import type { FriendPlan } from "@/lib/store";

// ── Props ────────────────────────────────────────────────────────────────────

interface ImportPlanDialogProps {
  open: boolean;
  onClose: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function ImportPlanDialog({ open, onClose }: ImportPlanDialogProps) {
  const addFriendPlan = useAppStore((s) => s.addFriendPlan);
  const friendPlans = useAppStore((s) => s.friendPlans);

  const [friendName, setFriendName] = useState("");
  const [jsonInput, setJsonInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  if (!open) return null;

  // Pick the next color from the palette based on how many friends already exist
  const nextColorIndex = friendPlans.length;
  const nextColor = PLAN_PALETTE[nextColorIndex % PLAN_PALETTE.length];

  function handlePaste() {
    navigator.clipboard.readText().then((text) => {
      setJsonInput(text);
      validateJson(text);
    }).catch(() => {
      setError("Could not read from clipboard. Paste manually instead.");
    });
  }

  function validateJson(text: string) {
    setError(null);
    setPreviewCount(null);

    if (!text.trim()) return;

    try {
      const data = JSON.parse(text);

      // Support multiple formats:
      // 1. Array of PlanItems directly
      // 2. { items: PlanItem[] }
      // 3. { planItems: PlanItem[] }
      // 4. Full shared plan object from SharePlanDialog

      let items: unknown[] = [];
      if (Array.isArray(data)) {
        items = data;
      } else if (data?.items && Array.isArray(data.items)) {
        items = data.items;
      } else if (data?.planItems && Array.isArray(data.planItems)) {
        items = data.planItems;
      } else {
        setError("Invalid format. Expected an array of plan items or an object with an 'items' array.");
        return;
      }

      // Basic validation: each item needs at least month and type
      const valid = items.filter(
        (item: unknown) =>
          typeof item === "object" &&
          item !== null &&
          "month" in item &&
          "type" in item
      );

      if (valid.length === 0) {
        setError("No valid plan items found. Each item needs at least 'month' and 'type' fields.");
        return;
      }

      setPreviewCount(valid.length);
    } catch {
      setError("Invalid JSON. Check the format and try again.");
    }
  }

  function handleImport() {
    if (!friendName.trim()) {
      setError("Enter your friend's name.");
      return;
    }

    try {
      const data = JSON.parse(jsonInput);
      let items: Array<Record<string, unknown>> = [];

      if (Array.isArray(data)) {
        items = data;
      } else if (data?.items && Array.isArray(data.items)) {
        items = data.items;
      } else if (data?.planItems && Array.isArray(data.planItems)) {
        items = data.planItems;
      }

      const validItems = items
        .filter((item) => item.month && item.type)
        .map((item) => ({
          id: `friend-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: String(item.type),
          title: String(item.title ?? "Untitled"),
          description: item.description ? String(item.description) : undefined,
          stateId: item.stateId ? String(item.stateId) : undefined,
          speciesId: item.speciesId ? String(item.speciesId) : undefined,
          month: Number(item.month),
          day: item.day ? Number(item.day) : undefined,
          endDay: item.endDay ? Number(item.endDay) : undefined,
          endMonth: item.endMonth ? Number(item.endMonth) : undefined,
          estimatedCost: item.estimatedCost ? Number(item.estimatedCost) : undefined,
        }));

      if (validItems.length === 0) {
        setError("No valid items found.");
        return;
      }

      const plan: FriendPlan = {
        id: `friend-plan-${Date.now()}`,
        name: friendName.trim(),
        color: nextColor.dot,
        items: validItems,
        importedAt: new Date().toISOString(),
      };

      addFriendPlan(plan);
      resetAndClose();
    } catch {
      setError("Failed to parse plan data.");
    }
  }

  function resetAndClose() {
    setFriendName("");
    setJsonInput("");
    setError(null);
    setPreviewCount(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={resetAndClose}
        role="presentation"
      />
      <Card className="relative z-10 w-full max-w-lg bg-card border-border shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Import Friend&apos;s Plan
          </CardTitle>
          <button
            onClick={resetAndClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Import a hunting buddy&apos;s plan to view their calendar alongside yours.
            Ask them to share their plan JSON from the Planner&apos;s Share button.
          </p>

          {/* Friend Name */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
              Friend&apos;s Name
            </label>
            <input
              type="text"
              value={friendName}
              onChange={(e) => setFriendName(e.target.value)}
              placeholder="e.g. Jake, Dad, Mike"
              className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:border-primary focus:outline-none"
            />
          </div>

          {/* Color Preview */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Calendar color:</span>
            <div
              className="w-4 h-4 rounded-full border border-white/20"
              style={{ backgroundColor: nextColor.dot }}
            />
            <span className="text-xs" style={{ color: nextColor.text }}>
              {nextColor.label}
            </span>
          </div>

          {/* JSON Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                Plan Data (JSON)
              </label>
              <button
                onClick={handlePaste}
                className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors"
              >
                <Clipboard className="w-3 h-3" />
                Paste from clipboard
              </button>
            </div>
            <textarea
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value);
                validateJson(e.target.value);
              }}
              placeholder='Paste plan JSON here (e.g. [{"type": "hunt", "month": 10, ...}])'
              rows={6}
              className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-xs font-mono focus:border-primary focus:outline-none resize-none"
            />
          </div>

          {/* Preview / Error */}
          {previewCount !== null && !error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 border border-success/20 text-xs text-success">
              <Upload className="w-3.5 h-3.5 shrink-0" />
              Found {previewCount} plan items ready to import
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Import Button */}
          <Button
            onClick={handleImport}
            className="w-full gap-2"
            disabled={!friendName.trim() || !previewCount}
          >
            <Upload className="w-4 h-4" />
            Import {previewCount ?? 0} Items
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
