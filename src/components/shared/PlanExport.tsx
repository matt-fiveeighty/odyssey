"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Download, Printer, X } from "lucide-react";
import { STATES_MAP } from "@/lib/constants/states";
import { SPECIES_MAP } from "@/lib/constants/species";
import type { StrategicAssessment, Milestone } from "@/lib/types";

interface PlanExportProps {
  assessment: StrategicAssessment;
  milestones: Milestone[];
  /** Trigger element — if not provided, renders a default button */
  trigger?: React.ReactNode;
}

export function PlanExport({ assessment, milestones }: PlanExportProps) {
  const [showPreview, setShowPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(() => {
    if (!printRef.current) return;
    const printContent = printRef.current.innerHTML;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Odyssey Outdoors — Hunt Strategy</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; padding: 40px; max-width: 800px; margin: 0 auto; font-size: 12px; line-height: 1.5; }
          h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
          h2 { font-size: 16px; font-weight: 700; margin: 24px 0 12px; padding-bottom: 4px; border-bottom: 2px solid #e5e5e5; }
          h3 { font-size: 13px; font-weight: 600; margin: 12px 0 6px; }
          .subtitle { color: #666; font-size: 11px; margin-bottom: 20px; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
          .summary-card { padding: 12px; background: #f9f9f9; border-radius: 6px; text-align: center; }
          .summary-card .value { font-size: 20px; font-weight: 700; }
          .summary-card .label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
          .state-card { padding: 10px; border: 1px solid #e5e5e5; border-radius: 6px; margin: 8px 0; }
          .state-badge { display: inline-block; padding: 2px 6px; border-radius: 4px; color: white; font-size: 9px; font-weight: 700; margin-right: 6px; }
          .milestone-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0; }
          .milestone-row:last-child { border-bottom: none; }
          .cost { font-family: monospace; font-weight: 600; }
          .tag { display: inline-block; padding: 1px 5px; border-radius: 3px; font-size: 9px; font-weight: 600; background: #f0f0f0; }
          .year-row { display: flex; align-items: center; gap: 12px; padding: 4px 0; }
          .year-label { font-family: monospace; font-weight: 600; width: 40px; }
          .phase-badge { padding: 1px 6px; border-radius: 3px; color: white; font-size: 9px; font-weight: 600; }
          .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e5e5; font-size: 9px; color: #999; text-align: center; }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        ${printContent}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }, []);

  const currentYear = new Date().getFullYear();

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setShowPreview(true)} className="gap-1.5 text-xs">
        <FileText className="w-3.5 h-3.5" />
        Export Plan
      </Button>

      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowPreview(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-3xl max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Toolbar */}
            <div className="flex items-center justify-between p-3 border-b bg-gray-50">
              <p className="text-sm font-semibold text-gray-800">Plan Export Preview</p>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handlePrint} className="gap-1.5 text-xs">
                  <Printer className="w-3.5 h-3.5" />
                  Print / Save as PDF
                </Button>
                <button onClick={() => setShowPreview(false)} className="w-7 h-7 rounded bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors">
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Print content */}
            <div className="overflow-y-auto p-6" ref={printRef}>
              <div style={{ color: "#1a1a1a", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", fontSize: "12px", lineHeight: "1.5" }}>
                {/* Header */}
                <h1 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "4px" }}>
                  Odyssey Outdoors — Hunt Strategy
                </h1>
                <p style={{ color: "#666", fontSize: "11px", marginBottom: "20px" }}>
                  Generated {new Date(assessment.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>

                {/* Profile Summary */}
                <p style={{ fontSize: "12px", color: "#444", marginBottom: "16px" }}>
                  {assessment.profileSummary}
                </p>

                {/* Summary Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", margin: "16px 0" }}>
                  {[
                    { label: "States", value: assessment.stateRecommendations.length },
                    { label: "Year 1 Cost", value: `$${assessment.financialSummary.yearOneInvestment.toLocaleString()}` },
                    { label: "10-Year Total", value: `$${assessment.financialSummary.tenYearTotal.toLocaleString()}` },
                    { label: "Planned Hunts", value: assessment.macroSummary.plannedHunts },
                  ].map((s) => (
                    <div key={s.label} style={{ padding: "12px", background: "#f9f9f9", borderRadius: "6px", textAlign: "center" }}>
                      <div style={{ fontSize: "20px", fontWeight: 700 }}>{s.value}</div>
                      <div style={{ fontSize: "9px", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* State Recommendations */}
                <h2 style={{ fontSize: "16px", fontWeight: 700, margin: "24px 0 12px", paddingBottom: "4px", borderBottom: "2px solid #e5e5e5" }}>
                  State Portfolio
                </h2>
                {assessment.stateRecommendations.map((rec) => {
                  const state = STATES_MAP[rec.stateId];
                  return (
                    <div key={rec.stateId} style={{ padding: "10px", border: "1px solid #e5e5e5", borderRadius: "6px", margin: "8px 0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{ display: "inline-block", padding: "2px 6px", borderRadius: "4px", color: "white", fontSize: "9px", fontWeight: 700, background: state?.color ?? "#666" }}>
                          {state?.abbreviation ?? rec.stateId}
                        </span>
                        <strong>{state?.name ?? rec.stateId}</strong>
                        <span style={{ display: "inline-block", padding: "1px 5px", borderRadius: "3px", fontSize: "9px", fontWeight: 600, background: "#f0f0f0" }}>
                          {rec.role}
                        </span>
                      </div>
                      <p style={{ fontSize: "11px", color: "#555" }}>{rec.reason}</p>
                      <p style={{ fontSize: "10px", color: "#888", marginTop: "4px" }}>
                        Annual cost: <span style={{ fontFamily: "monospace", fontWeight: 600 }}>${rec.annualCost}</span> · Score: {rec.scoreBreakdown.totalScore}/{rec.scoreBreakdown.maxPossibleScore}
                      </p>
                    </div>
                  );
                })}

                {/* 10-Year Roadmap */}
                <h2 style={{ fontSize: "16px", fontWeight: 700, margin: "24px 0 12px", paddingBottom: "4px", borderBottom: "2px solid #e5e5e5" }}>
                  10-Year Roadmap
                </h2>
                {assessment.roadmap.map((yr) => (
                  <div key={yr.year} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "4px 0" }}>
                    <span style={{ fontFamily: "monospace", fontWeight: 600, width: "40px" }}>{yr.year}</span>
                    <span style={{
                      padding: "1px 6px", borderRadius: "3px", color: "white", fontSize: "9px", fontWeight: 600,
                      background: yr.phase === "building" ? "#2563eb" : yr.phase === "burn" ? "#16a34a" : yr.phase === "gap" ? "#9333ea" : "#dc2626",
                    }}>
                      {yr.phase}
                    </span>
                    <span style={{ flex: 1, fontSize: "11px", color: "#555" }}>
                      {yr.actions.map((a) => `${STATES_MAP[a.stateId]?.abbreviation ?? a.stateId} ${SPECIES_MAP[a.speciesId]?.name ?? a.speciesId} (${a.type})`).join(" · ")}
                    </span>
                    <span style={{ fontFamily: "monospace", fontWeight: 600, fontSize: "11px" }}>
                      ${yr.estimatedCost.toLocaleString()}
                    </span>
                  </div>
                ))}

                {/* Milestones — Year 1 */}
                {milestones.filter((m) => m.year === currentYear).length > 0 && (
                  <>
                    <h2 style={{ fontSize: "16px", fontWeight: 700, margin: "24px 0 12px", paddingBottom: "4px", borderBottom: "2px solid #e5e5e5" }}>
                      {currentYear} Action Items
                    </h2>
                    {milestones.filter((m) => m.year === currentYear).map((ms) => {
                      const state = STATES_MAP[ms.stateId];
                      return (
                        <div key={ms.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f0f0f0" }}>
                          <div>
                            <span style={{ display: "inline-block", padding: "2px 6px", borderRadius: "4px", color: "white", fontSize: "9px", fontWeight: 700, background: state?.color ?? "#666", marginRight: "6px" }}>
                              {state?.abbreviation ?? ms.stateId}
                            </span>
                            <span style={{ fontSize: "11px" }}>{ms.title}</span>
                            {ms.dueDate && (
                              <span style={{ fontSize: "10px", color: "#888", marginLeft: "8px" }}>
                                Due: {new Date(ms.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            )}
                          </div>
                          <span style={{ fontFamily: "monospace", fontWeight: 600, fontSize: "11px" }}>${ms.totalCost}</span>
                        </div>
                      );
                    })}
                  </>
                )}

                {/* Footer */}
                <div style={{ marginTop: "32px", paddingTop: "12px", borderTop: "1px solid #e5e5e5", fontSize: "9px", color: "#999", textAlign: "center" }}>
                  Odyssey Outdoors · odysseyoutdoors.com · Data sourced from state Fish & Game agencies · {new Date().getFullYear()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
