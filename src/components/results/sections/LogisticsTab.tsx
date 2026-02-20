"use client";

import type { StrategicAssessment, PointOnlyGuideEntry } from "@/lib/types";
import { CollapsibleSection } from "../shared/CollapsibleSection";
import { STATES_MAP } from "@/lib/constants/states";
import { STATE_VISUALS } from "@/lib/constants/state-images";
import { SpeciesAvatar } from "@/components/shared/SpeciesAvatar";
import { Plane, Calendar, Wallet, Heart, ExternalLink, Car, Package, Clock, DollarSign, AlertCircle } from "lucide-react";
import { DataSourceInline } from "@/components/shared/DataSourceBadge";
import { formatSpeciesName, formatDate } from "@/lib/utils";

interface LogisticsTabProps {
  assessment: StrategicAssessment;
}

function PointOnlyRow({ entry, dimmed }: { entry: PointOnlyGuideEntry; dimmed?: boolean }) {
  return (
    <div className={`grid md:grid-cols-[1fr_120px_80px_60px] gap-3 px-3 py-3 items-start rounded-lg hover:bg-secondary/10 transition-colors border-b border-border/10 last:border-0 ${dimmed ? "opacity-60" : ""}`}>
      <div>
        <p className="text-sm font-semibold mb-0.5">{entry.stateName}</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{entry.instructions}</p>
        {entry.huntCode && (
          <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded bg-secondary font-mono text-muted-foreground">Code: {entry.huntCode}</span>
        )}
        {entry.secondChoiceTactic && (
          <p className="text-[10px] text-primary/80 italic mt-1">{entry.secondChoiceTactic}</p>
        )}
      </div>
      <div>
        <span className="text-xs font-medium text-destructive/80 md:text-foreground">{entry.deadline}</span>
        <span className="md:hidden text-[10px] text-muted-foreground ml-1">deadline</span>
      </div>
      <div className="text-right">
        <span className="text-xs font-mono font-semibold">${entry.annualCost}</span>
        <span className="md:hidden text-[10px] text-muted-foreground ml-1">/yr</span>
        <div className="mt-0.5"><DataSourceInline stateId={entry.stateId} /></div>
      </div>
      <div className="text-right">
        {entry.url && (
          <a href={entry.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary flex items-center justify-end gap-0.5 hover:underline">
            Apply <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
      </div>
    </div>
  );
}

export function LogisticsTab({ assessment }: LogisticsTabProps) {
  const { travelLogistics, seasonCalendar, pointOnlyGuide, dreamHuntRecommendations } = assessment;

  return (
    <div className="space-y-4">
      {/* ── Travel Logistics ── */}
      {travelLogistics && (
        <CollapsibleSection title="Travel Logistics" icon={Plane} defaultOpen badge={`From ${travelLogistics.homeAirport}`}>
          <div className="space-y-4">
            {/* Column header (hidden on mobile) */}
            <div className="hidden md:grid md:grid-cols-[1fr_100px_90px_40px_1fr_1fr] gap-3 px-3 text-[10px] text-muted-foreground uppercase tracking-wider font-medium border-b border-border/30 pb-2">
              <span>Airport</span>
              <span>Flight</span>
              <span>Travel</span>
              <span className="text-center">Car</span>
              <span>Meat Shipping</span>
              <span>Considerations</span>
            </div>

            {/* State rows */}
            {travelLogistics.stateRoutes.map((route) => {
              const state = STATES_MAP[route.stateId];
              const vis = STATE_VISUALS[route.stateId];
              if (!state) return null;

              return (
                <div key={route.stateId}>
                  {/* Desktop: columnar layout */}
                  <div className="hidden md:grid md:grid-cols-[1fr_100px_90px_40px_1fr_1fr] gap-3 items-start px-3 py-2 rounded-lg hover:bg-secondary/10 transition-colors">
                    {/* Airport */}
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center text-[9px] font-bold text-white shrink-0 bg-gradient-to-br ${vis?.gradient ?? "from-slate-700 to-slate-900"}`}>
                        {state.abbreviation}
                      </div>
                      <div>
                        <p className="text-xs font-semibold">{route.airport}</p>
                        <p className="text-[10px] text-muted-foreground">{state.name}</p>
                      </div>
                    </div>

                    {/* Flight cost + type */}
                    <div>
                      <p className="text-xs font-bold text-primary">${route.flightCost}</p>
                      <p className="text-[10px] text-muted-foreground">{route.direct ? "Direct" : "Connecting"}</p>
                    </div>

                    {/* Travel time */}
                    <div>
                      <p className="text-xs">{route.flightTime}</p>
                      <p className="text-[10px] text-muted-foreground">{route.driveToHuntArea}</p>
                    </div>

                    {/* Rental car icon */}
                    <div className="flex justify-center pt-0.5">
                      {route.rentalCarNeeded ? (
                        <Car className="w-4 h-4 text-chart-2" />
                      ) : (
                        <span className="text-[10px] text-muted-foreground/50">—</span>
                      )}
                    </div>

                    {/* Meat shipping */}
                    <div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{route.meatShipping}</p>
                    </div>

                    {/* Considerations */}
                    <div>
                      <p className="text-[10px] text-muted-foreground/80 leading-relaxed">{route.rentalNotes}</p>
                    </div>
                  </div>

                  {/* Mobile: stacked card layout */}
                  <div className="md:hidden p-3 rounded-lg bg-secondary/20 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0 bg-gradient-to-br ${vis?.gradient ?? "from-slate-700 to-slate-900"}`}>
                        {state.abbreviation}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{state.name}</p>
                        <p className="text-[10px] text-muted-foreground">{route.airport}</p>
                      </div>
                      <span className="text-xs font-bold text-primary ml-auto">${route.flightCost} RT</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>{route.flightTime} · {route.direct ? "Direct" : "Connecting"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Car className="w-3 h-3 shrink-0" />
                        <span>{route.rentalCarNeeded ? "Rental needed" : "No rental"} · {route.driveToHuntArea}</span>
                      </div>
                      <div className="col-span-2 flex items-start gap-1.5 text-muted-foreground">
                        <Package className="w-3 h-3 shrink-0 mt-0.5" />
                        <span>{route.meatShipping}</span>
                      </div>
                      {route.rentalNotes && (
                        <div className="col-span-2 flex items-start gap-1.5 text-muted-foreground/70">
                          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                          <span>{route.rentalNotes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Itemized Travel Budget */}
            <div className="border-t border-border/30 pt-3 space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-2">Estimated Travel Budget</p>
              <div className="grid gap-1.5">
                {travelLogistics.stateRoutes.map((route) => {
                  const state = STATES_MAP[route.stateId];
                  const rentalEst = 500; // estimated rental per trip
                  const totalForState = route.flightCost + rentalEst;
                  return (
                    <div key={route.stateId} className="grid grid-cols-[1fr_80px_80px_80px] gap-2 text-xs items-center">
                      <span className="text-muted-foreground">{state?.name ?? route.stateId}</span>
                      <span className="text-right font-mono text-muted-foreground">${route.flightCost}</span>
                      <span className="text-right font-mono text-muted-foreground">~$500</span>
                      <span className="text-right font-mono font-semibold">${totalForState.toLocaleString()}</span>
                    </div>
                  );
                })}
                {/* Column labels */}
                <div className="grid grid-cols-[1fr_80px_80px_80px] gap-2 text-[9px] text-muted-foreground/50 border-t border-border/20 pt-1">
                  <span />
                  <span className="text-right">Flights</span>
                  <span className="text-right">Rental</span>
                  <span className="text-right">Total</span>
                </div>
                {/* Grand total */}
                <div className="grid grid-cols-[1fr_80px_80px_80px] gap-2 text-sm items-center pt-1 border-t border-border/30">
                  <span className="font-semibold">Total</span>
                  <span className="text-right font-mono text-muted-foreground">
                    ${travelLogistics.stateRoutes.reduce((s, r) => s + r.flightCost, 0).toLocaleString()}
                  </span>
                  <span className="text-right font-mono text-muted-foreground">
                    ~${(travelLogistics.stateRoutes.length * 500).toLocaleString()}
                  </span>
                  <span className="text-right font-mono font-bold text-primary">
                    ${travelLogistics.totalTravelBudget.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {travelLogistics.tip && (
              <p className="text-[10px] text-muted-foreground/70 italic mt-2">{travelLogistics.tip}</p>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* ── Season Calendar (Grid) ── */}
      {seasonCalendar && seasonCalendar.length > 0 && (
        <CollapsibleSection title="Season Calendar" icon={Calendar} defaultOpen badge={`${seasonCalendar.length} species`}>
          <div className="space-y-0.5">
            {/* Grid header */}
            <div className="hidden md:grid md:grid-cols-[180px_100px_1fr_1fr] gap-3 px-3 pb-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium border-b border-border/30">
              <span>State / Species</span>
              <span>Season</span>
              <span>Dates</span>
              <span>Notes</span>
            </div>

            {seasonCalendar.map((entry, i) => {
              const state = STATES_MAP[entry.stateId];
              const vis = STATE_VISUALS[entry.stateId];
              // Look up application deadline for this species in this state
              const appDeadline = state?.applicationDeadlines?.[entry.species];

              return (
                <div key={i} className="rounded-lg overflow-hidden">
                  {/* Entry header with state + species */}
                  <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                    <div className={`w-6 h-6 rounded flex items-center justify-center text-[8px] font-bold text-white shrink-0 bg-gradient-to-br ${vis?.gradient ?? "from-slate-700 to-slate-900"}`}>
                      {state?.abbreviation}
                    </div>
                    <SpeciesAvatar speciesId={entry.species} size={20} />
                    <span className="text-sm font-semibold">{state?.name} — {formatSpeciesName(entry.species)}</span>
                    {appDeadline && (
                      <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
                        Apply by {formatDate(appDeadline.close)}
                      </span>
                    )}
                  </div>

                  {/* Season tiers as grid rows */}
                  {entry.tiers.map((tier, ti) => (
                    <div
                      key={ti}
                      className={`grid grid-cols-[180px_100px_1fr_1fr] gap-3 px-3 py-1.5 text-[11px] items-start ${
                        ti % 2 === 0 ? "bg-secondary/10" : ""
                      }`}
                    >
                      <span className="font-medium text-foreground/80 pl-8">{tier.name}</span>
                      <span className="text-muted-foreground font-mono text-[10px]">{tier.dates}</span>
                      <span className="text-muted-foreground/80">{tier.recommendation}</span>
                      <span className="text-[10px] text-muted-foreground/60 italic">{tier.arrivalDate}</span>
                    </div>
                  ))}

                  {/* Application season row */}
                  {appDeadline && (
                    <div className="grid grid-cols-[180px_100px_1fr_1fr] gap-3 px-3 py-1.5 text-[10px] bg-primary/5 border-t border-primary/10">
                      <span className="font-medium text-primary/80 pl-8">Application Window</span>
                      <span className="text-primary/70 font-mono">{formatDate(appDeadline.open)} — {formatDate(appDeadline.close)}</span>
                      <span className="text-primary/60 col-span-2">Submit your application before the deadline to be included in the draw</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* ── Point-Only Application Guide ── */}
      {pointOnlyGuide && pointOnlyGuide.length > 0 && (() => {
        const inPlanGuide = pointOnlyGuide.filter((e) => e.inPlan !== false);
        const additionalGuide = pointOnlyGuide.filter((e) => e.inPlan === false);

        return (
          <CollapsibleSection title="Point-Only Application Guide" icon={Wallet} defaultOpen badge={`${pointOnlyGuide.length} states`}>
            <div className="space-y-0.5">
              {/* Table header */}
              <div className="hidden md:grid md:grid-cols-[1fr_120px_80px_60px] gap-3 px-3 pb-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium border-b border-border/30">
                <span>State &amp; Instructions</span>
                <span>Deadline</span>
                <span className="text-right">Annual Cost</span>
                <span className="text-right">Link</span>
              </div>

              {/* In-plan states */}
              {inPlanGuide.length > 0 && (
                <div className="mb-1">
                  <p className="text-[9px] text-primary/60 uppercase tracking-wider font-medium px-3 pt-2 pb-1">In Your Plan</p>
                  {inPlanGuide.map((entry) => (
                    <PointOnlyRow key={entry.stateId} entry={entry} />
                  ))}
                </div>
              )}

              {/* Additional states */}
              {additionalGuide.length > 0 && (
                <div className="border-t border-dashed border-border/30 mt-2 pt-1">
                  <p className="text-[9px] text-muted-foreground/60 uppercase tracking-wider font-medium px-3 pt-2 pb-1">Additional States Worth Tracking</p>
                  {additionalGuide.map((entry) => (
                    <PointOnlyRow key={entry.stateId} entry={entry} dimmed />
                  ))}
                </div>
              )}

              {/* Total annual point cost (in-plan only) */}
              <div className="grid md:grid-cols-[1fr_120px_80px_60px] gap-3 px-3 pt-2 border-t border-border/30">
                <span className="text-sm font-semibold">Your Plan Total</span>
                <span />
                <span className="text-right text-sm font-bold text-primary">
                  ${inPlanGuide.reduce((s, e) => s + e.annualCost, 0).toLocaleString()}
                </span>
                <span />
              </div>
              {additionalGuide.length > 0 && (
                <div className="grid md:grid-cols-[1fr_120px_80px_60px] gap-3 px-3 pt-1">
                  <span className="text-xs text-muted-foreground">+ All states if tracking</span>
                  <span />
                  <span className="text-right text-xs font-mono text-muted-foreground">
                    ${pointOnlyGuide.reduce((s, e) => s + e.annualCost, 0).toLocaleString()}
                  </span>
                  <span />
                </div>
              )}
            </div>
          </CollapsibleSection>
        );
      })()}

      {/* ── Dream Hunt Investments ── */}
      {dreamHuntRecommendations.length > 0 && (
        <CollapsibleSection title="Long-Term Hunt Investments" icon={Heart} badge={`${dreamHuntRecommendations.length} targets`}>
          <div className="space-y-3">
            {dreamHuntRecommendations.map((dream) => (
              <div key={dream.id} className="p-4 rounded-xl bg-gradient-to-br from-secondary/30 to-secondary/10 border border-border/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-bold">{dream.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{dream.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-chart-4">~{dream.estimatedTimelineYears}yr</p>
                    <p className="text-[10px] text-muted-foreground">timeline</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 pt-2 border-t border-border/20">
                  {dream.annualPointCost != null && dream.annualPointCost > 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <DollarSign className="w-3 h-3" />
                      <span>${dream.annualPointCost}/yr investment</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{dream.estimatedTimelineYears === 1 ? "Achievable this year" : `${dream.estimatedTimelineYears}-year commitment`}</span>
                  </div>
                </div>
                {dream.notes && (
                  <p className="text-[10px] text-muted-foreground/70 mt-2 italic">{dream.notes}</p>
                )}
              </div>
            ))}

            {/* Dream hunt total */}
            {dreamHuntRecommendations.some((d) => d.annualPointCost != null && d.annualPointCost > 0) && (
              <div className="flex justify-between px-1 pt-2 border-t border-border/30">
                <span className="text-xs font-semibold">Annual Long-Term Investment</span>
                <span className="text-xs font-bold text-chart-4">
                  ${dreamHuntRecommendations.reduce((s, d) => s + (d.annualPointCost ?? 0), 0).toLocaleString()}/yr
                </span>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}
