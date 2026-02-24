"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Send, Download, Copy, Check } from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { DateProposal } from "@/lib/store";
import { STATES, STATES_MAP } from "@/lib/constants/states";
import { formatSpeciesName } from "@/lib/utils";
import { exportDeadline } from "@/lib/calendar-export";

// ── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ── Props ────────────────────────────────────────────────────────────────────

interface DateProposalModalProps {
  open: boolean;
  onClose: () => void;
  /** Pre-fill year from current planner view */
  defaultYear?: number;
}

// ── Component ────────────────────────────────────────────────────────────────

export function DateProposalModal({ open, onClose, defaultYear }: DateProposalModalProps) {
  const addDateProposal = useAppStore((s) => s.addDateProposal);

  const [stateId, setStateId] = useState("");
  const [speciesId, setSpeciesId] = useState("");
  const [startMonth, setStartMonth] = useState(9); // Sep default
  const [startDay, setStartDay] = useState(15);
  const [endMonth, setEndMonth] = useState(10);
  const [endDay, setEndDay] = useState(5);
  const [year, setYear] = useState(defaultYear ?? new Date().getFullYear());
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState(false);
  const [created, setCreated] = useState(false);

  if (!open) return null;

  const selectedState = stateId ? STATES_MAP[stateId] : null;
  const availableSpecies = selectedState?.availableSpecies ?? [];

  const daysInStartMonth = new Date(year, startMonth, 0).getDate();
  const daysInEndMonth = new Date(year, endMonth, 0).getDate();

  function handleCreate() {
    if (!stateId || !speciesId) return;

    const proposal: DateProposal = {
      id: `proposal-${Date.now()}`,
      stateId,
      speciesId,
      startMonth,
      startDay,
      endMonth,
      endDay,
      year,
      notes,
      createdAt: new Date().toISOString(),
    };

    addDateProposal(proposal);
    setCreated(true);
  }

  function handleExportICS() {
    if (!stateId || !speciesId) return;
    const state = STATES_MAP[stateId];
    const startDate = new Date(year, startMonth - 1, startDay);
    const endDate = new Date(year, endMonth - 1, endDay);

    exportDeadline({
      stateName: state?.name ?? stateId,
      species: formatSpeciesName(speciesId),
      openDate: startDate.toISOString().split("T")[0],
      closeDate: endDate.toISOString().split("T")[0],
    });
  }

  function handleCopyText() {
    const state = STATES_MAP[stateId];
    const text = [
      `Hunt Proposal: ${state?.name ?? stateId} ${formatSpeciesName(speciesId)} ${year}`,
      `Dates: ${MONTH_NAMES[startMonth - 1]} ${startDay} – ${MONTH_NAMES[endMonth - 1]} ${endDay}, ${year}`,
      notes ? `Notes: ${notes}` : "",
      "",
      "Sent from Odyssey Outdoors",
    ].filter(Boolean).join("\n");

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function resetAndClose() {
    setStateId("");
    setSpeciesId("");
    setStartMonth(9);
    setStartDay(15);
    setEndMonth(10);
    setEndDay(5);
    setNotes("");
    setCreated(false);
    setCopied(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={resetAndClose}
        role="presentation"
      />
      <Card className="relative z-10 w-full max-w-md bg-card border-border shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            Propose Hunt Dates
          </CardTitle>
          <button onClick={resetAndClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          {!created ? (
            <>
              <p className="text-xs text-muted-foreground">
                Select a date range and send it to your hunting partners for coordination.
              </p>

              {/* State + Species */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1 block">State</label>
                  <select
                    value={stateId}
                    onChange={(e) => { setStateId(e.target.value); setSpeciesId(""); }}
                    className="w-full px-2 py-1.5 rounded-lg bg-secondary border border-border text-sm focus:border-primary focus:outline-none"
                  >
                    <option value="">Select...</option>
                    {STATES.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1 block">Species</label>
                  <select
                    value={speciesId}
                    onChange={(e) => setSpeciesId(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-secondary border border-border text-sm focus:border-primary focus:outline-none"
                    disabled={!stateId}
                  >
                    <option value="">Select...</option>
                    {availableSpecies.map((sp) => (
                      <option key={sp} value={sp}>{formatSpeciesName(sp)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Year */}
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1 block">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded-lg bg-secondary border border-border text-sm focus:border-primary focus:outline-none"
                />
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1 block">Start Date</label>
                  <div className="flex gap-1">
                    <select
                      value={startMonth}
                      onChange={(e) => setStartMonth(Number(e.target.value))}
                      className="flex-1 px-1 py-1.5 rounded bg-secondary border border-border text-xs focus:border-primary focus:outline-none"
                    >
                      {MONTH_NAMES.map((m, i) => (
                        <option key={i} value={i + 1}>{m.slice(0, 3)}</option>
                      ))}
                    </select>
                    <select
                      value={startDay}
                      onChange={(e) => setStartDay(Number(e.target.value))}
                      className="w-14 px-1 py-1.5 rounded bg-secondary border border-border text-xs focus:border-primary focus:outline-none"
                    >
                      {Array.from({ length: daysInStartMonth }).map((_, i) => (
                        <option key={i} value={i + 1}>{i + 1}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1 block">End Date</label>
                  <div className="flex gap-1">
                    <select
                      value={endMonth}
                      onChange={(e) => setEndMonth(Number(e.target.value))}
                      className="flex-1 px-1 py-1.5 rounded bg-secondary border border-border text-xs focus:border-primary focus:outline-none"
                    >
                      {MONTH_NAMES.map((m, i) => (
                        <option key={i} value={i + 1}>{m.slice(0, 3)}</option>
                      ))}
                    </select>
                    <select
                      value={endDay}
                      onChange={(e) => setEndDay(Number(e.target.value))}
                      className="w-14 px-1 py-1.5 rounded bg-secondary border border-border text-xs focus:border-primary focus:outline-none"
                    >
                      {Array.from({ length: daysInEndMonth }).map((_, i) => (
                        <option key={i} value={i + 1}>{i + 1}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1 block">Notes for the crew</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. I'm flexible on start date, need to be back by the 8th..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-xs focus:border-primary focus:outline-none resize-none"
                />
              </div>

              <Button
                onClick={handleCreate}
                className="w-full gap-2"
                disabled={!stateId || !speciesId}
              >
                <Send className="w-4 h-4" />
                Create Proposal
              </Button>
            </>
          ) : (
            /* Post-creation: share options */
            <div className="space-y-4 py-2">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-6 h-6 text-success" />
                </div>
                <p className="text-sm font-semibold">Proposal Created!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {STATES_MAP[stateId]?.name} · {formatSpeciesName(speciesId)} · {MONTH_NAMES[startMonth - 1]} {startDay}–{MONTH_NAMES[endMonth - 1]} {endDay}, {year}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 text-xs"
                  onClick={handleCopyText}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Text
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 text-xs"
                  onClick={handleExportICS}
                >
                  <Download className="w-3.5 h-3.5" />
                  Export .ics
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={resetAndClose}
              >
                Done
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
