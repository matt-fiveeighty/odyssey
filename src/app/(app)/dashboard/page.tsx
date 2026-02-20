"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Target,
  Wallet,
  TrendingUp,
  Calendar,
  ArrowRight,
  Plus,
  MapPin,
  Clock,
  Crosshair,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { STATES, STATES_MAP } from "@/lib/constants/states";
import { STATE_VISUALS } from "@/lib/constants/state-images";
import { useAppStore, useWizardStore } from "@/lib/store";
import { resolveFees } from "@/lib/engine/fee-resolver";
import { HuntingTerm } from "@/components/shared/HuntingTerm";
import { AnimatedCounter } from "@/components/shared/AnimatedCounter";
import { BeginnerGuide } from "@/components/shared/BeginnerGuide";
import { formatSpeciesName } from "@/lib/utils";

export default function DashboardPage() {
  const { milestones, confirmedAssessment, userPoints, userGoals } = useAppStore();
  const homeState = useWizardStore((s) => s.homeState);
  const router = useRouter();

  const hasPlan = confirmedAssessment !== null;
  const completedMilestones = milestones.filter(m => m.completed).length;
  const pendingMilestones = milestones.filter(m => !m.completed);
  const totalPoints = userPoints.reduce((s, p) => s + p.points, 0);
  const activeStates = new Set(userPoints.map(p => p.stateId)).size;
  const totalInvested = confirmedAssessment?.financialSummary.yearOneInvestment ?? 0;

  const now = new Date();

  // Sort upcoming deadlines from states
  const upcomingDeadlines = STATES
    .flatMap(s => {
      const deadlines: { stateId: string; species: string; date: string }[] = [];
      Object.entries(s.applicationDeadlines).forEach(([species, dates]) => {
        if (dates?.close) deadlines.push({ stateId: s.id, species, date: dates.close });
      });
      return deadlines;
    })
    .filter(d => new Date(d.date) > now)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  return (
    <div className="p-6 space-y-6 fade-in-up">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {hasPlan ? "Your hunting investment portfolio at a glance" : "Start building your western big game strategy"}
          </p>
        </div>
        <Link href="/plan-builder">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            {hasPlan ? "Adjust Plan" : "New Plan"}
          </Button>
        </Link>
      </div>

      {/* Deadline Warning Banner */}
      {(() => {
        const criticalDeadlines = upcomingDeadlines.filter(d => {
          const daysLeft = Math.ceil((new Date(d.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return daysLeft <= 14 && daysLeft > 0;
        });
        if (criticalDeadlines.length === 0) return null;
        return (
          <div className="p-3 rounded-xl border border-chart-4/30 bg-chart-4/5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-chart-4 shrink-0" />
              <span className="text-sm font-semibold text-chart-4">
                {criticalDeadlines.length} deadline{criticalDeadlines.length > 1 ? "s" : ""} closing soon
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {criticalDeadlines.map((d, i) => {
                const state = STATES_MAP[d.stateId];
                const daysLeft = Math.ceil((new Date(d.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-chart-4/10 text-xs">
                    {state && (
                      <span className="w-5 h-5 rounded flex items-center justify-center text-[7px] font-bold text-white" style={{ backgroundColor: state.color }}>
                        {state.abbreviation}
                      </span>
                    )}
                    <span className="font-medium">{formatSpeciesName(d.species)}</span>
                    <span className={`font-bold ${daysLeft <= 3 ? "text-destructive" : daysLeft <= 7 ? "text-chart-4" : "text-chart-4/70"}`}>
                      {daysLeft}d
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border count-up card-lift hover:glow-primary">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold"><AnimatedCounter value={totalPoints} /></p>
                <p className="text-xs text-muted-foreground"><HuntingTerm term="preference points">Total Points</HuntingTerm></p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border count-up-delay-1 card-lift hover:glow-amber">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-chart-2/15 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold"><AnimatedCounter value={totalInvested} prefix="$" /></p>
                <p className="text-xs text-muted-foreground">Year 1 Cost</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border count-up-delay-2 card-lift hover:glow-orange">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-chart-4/15 flex items-center justify-center">
                <Target className="w-5 h-5 text-chart-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  <AnimatedCounter value={completedMilestones} />/{milestones.length}
                </p>
                <p className="text-xs text-muted-foreground">Milestones</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border count-up-delay-3 card-lift hover:glow-blue">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-chart-5/15 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-chart-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  <AnimatedCounter value={hasPlan ? confirmedAssessment.stateRecommendations.length : activeStates} />
                </p>
                <p className="text-xs text-muted-foreground">States Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Active Plan Card or Next Actions */}
        <div className="md:col-span-2">
          {hasPlan ? (
            <Card className="bg-card border-border overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-primary via-chart-2 to-chart-4" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Your Action Plan</CardTitle>
                  <Badge variant="secondary" className="bg-chart-2/15 text-chart-2 border-0">
                    {completedMilestones}/{milestones.length} Complete
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress */}
                <div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-chart-2 transition-all" style={{ width: `${milestones.length > 0 ? (completedMilestones / milestones.length) * 100 : 0}%` }} />
                  </div>
                </div>

                {/* Next milestones */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Next Up</p>
                  {pendingMilestones.slice(0, 4).map((ms) => {
                    const state = STATES_MAP[ms.stateId];
                    return (
                      <div key={ms.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                        {state && (
                          <div className="w-7 h-7 rounded flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ backgroundColor: state.color }}>
                            {state.abbreviation}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{ms.title}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            {ms.dueDate && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(ms.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            )}
                            <span className="text-[10px] text-primary font-medium">${ms.totalCost}</span>
                          </div>
                        </div>
                        {ms.url && (
                          <a href={ms.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${ms.title}`} className="text-muted-foreground hover:text-primary transition-colors">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-3 pt-2">
                  <Link href="/goals" className="flex-1">
                    <Button variant="outline" className="w-full gap-2">
                      View All Milestones <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-primary via-chart-2 to-chart-4" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Getting Started</CardTitle>
                  <Badge variant="secondary" className="bg-primary/15 text-primary border-0">New Here?</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Welcome to Odyssey Outdoors. Here&apos;s how to get the most out of your hunt planning:
                </p>
                <div className="space-y-3">
                  {(() => {
                    const hasGoals = userGoals.length > 0;
                    const speciesFromGoals = [...new Set(userGoals.map(g => g.speciesId))];
                    const items = [
                      {
                        step: 1,
                        title: hasGoals
                          ? `Build Strategy from ${userGoals.length} Goal${userGoals.length > 1 ? "s" : ""}`
                          : "Run the Strategic Consultation",
                        description: hasGoals
                          ? `We'll pre-fill the consultation with your ${speciesFromGoals.length} species and build a custom multi-year roadmap.`
                          : "Answer a few questions about your experience, budget, and goals. We'll build a custom multi-year strategy.",
                        href: "/plan-builder",
                        done: false,
                        prefill: hasGoals,
                      },
                      {
                        step: 2,
                        title: "Set Your Hunt Goals",
                        description: "Define what you're chasing — species, state, weapon, season, and your dream trophy.",
                        href: "/goals",
                        done: hasGoals,
                        prefill: false,
                      },
                      {
                        step: 3,
                        title: "Track Your Points",
                        description: "Enter your current preference and bonus points across states to get accurate draw timelines.",
                        href: "/points",
                        done: userPoints.length > 0,
                        prefill: false,
                      },
                      {
                        step: 4,
                        title: "Explore Units",
                        description: "Browse the unit database to research success rates, trophy quality, and points required.",
                        href: "/units",
                        done: false,
                        prefill: false,
                      },
                    ];
                    return items.map((item) => (
                      <div
                        key={item.step}
                        onClick={() => {
                          if (item.prefill) {
                            useWizardStore.getState().prefillFromGoals(userGoals);
                          }
                          router.push(item.href);
                        }}
                        className={`flex items-start gap-3 p-3 rounded-lg transition-all duration-200 hover:bg-secondary/50 cursor-pointer ${item.done ? "opacity-60" : ""}`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${item.done ? "bg-chart-2/15 text-chart-2" : item.prefill ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary"}`}>
                          {item.done ? "✓" : item.step}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{item.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground mt-0.5 ml-auto shrink-0" />
                      </div>
                    ));
                  })()}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Upcoming Deadlines — Visual Timeline */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Deadline Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              // Group deadlines by month
              const byMonth: Record<string, typeof upcomingDeadlines> = {};
              upcomingDeadlines.forEach(d => {
                const key = new Date(d.date).toLocaleDateString("en-US", { month: "short", year: "numeric" });
                if (!byMonth[key]) byMonth[key] = [];
                byMonth[key].push(d);
              });
              return (
                <div className="relative space-y-4">
                  {/* Vertical timeline line */}
                  <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />
                  {Object.entries(byMonth).map(([month, deadlines]) => {
                    const isCurrentMonth = month === now.toLocaleDateString("en-US", { month: "short", year: "numeric" });
                    return (
                      <div key={month} className="relative">
                        {/* Month marker */}
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-[23px] h-[23px] rounded-full border-2 border-background z-10 flex items-center justify-center ${isCurrentMonth ? "bg-primary" : "bg-muted"}`}>
                            <Calendar className={`w-2.5 h-2.5 ${isCurrentMonth ? "text-primary-foreground" : "text-muted-foreground"}`} />
                          </div>
                          <span className={`text-xs font-semibold uppercase tracking-wider ${isCurrentMonth ? "text-primary" : "text-muted-foreground"}`}>
                            {month}
                          </span>
                        </div>
                        {/* Deadline items */}
                        <div className="ml-9 space-y-2">
                          {deadlines.map((d, idx) => {
                            const state = STATES_MAP[d.stateId];
                            if (!state) return null;
                            const daysLeft = Math.ceil((new Date(d.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                            return (
                              <div key={idx} className={`flex items-center justify-between p-2 rounded-lg transition-all ${daysLeft <= 14 ? "bg-chart-4/5 border border-chart-4/15" : "bg-secondary/30"}`}>
                                <div className="flex items-center gap-2.5">
                                  <div className="w-6 h-6 rounded flex items-center justify-center text-[8px] font-bold text-white" style={{ backgroundColor: state.color }}>
                                    {state.abbreviation}
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium">{formatSpeciesName(d.species)}</p>
                                    <p className="text-[10px] text-muted-foreground">{new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                                  </div>
                                </div>
                                {daysLeft <= 14 ? (
                                  <span className="text-[10px] font-bold text-chart-4">{daysLeft}d left</span>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground">{daysLeft}d</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* ================================================================ */}
      {/* APPLY THIS YEAR — smart view based on goals + points + deadlines */}
      {/* ================================================================ */}
      {(userGoals.length > 0 || userPoints.length > 0) && (() => {
        const currentYear = new Date().getFullYear();
        const relevantStates = new Set([
          ...userGoals.map(g => g.stateId),
          ...userPoints.map(p => p.stateId),
        ]);
        const applyItems = STATES
          .filter(s => relevantStates.has(s.id))
          .flatMap(s => {
            const items: { stateId: string; species: string; deadline: string; action: string; cost: number; url: string }[] = [];
            Object.entries(s.applicationDeadlines).forEach(([species, dates]) => {
              if (!dates?.close) return;
              const closeDate = new Date(dates.close);
              if (closeDate < now) return;
              // Check if user has goals or points for this species+state combo
              const hasGoal = userGoals.some(g => g.stateId === s.id && g.speciesId === species);
              const hasPoints = userPoints.some(p => p.stateId === s.id && p.speciesId === species);
              if (hasGoal || hasPoints) {
                const pts = userPoints.find(p => p.stateId === s.id && p.speciesId === species)?.points ?? 0;
                const dlFees = resolveFees(s, homeState);
                const cost = (dlFees.pointCost[species] ?? 0) + dlFees.appFee;
                items.push({
                  stateId: s.id,
                  species,
                  deadline: dates.close,
                  action: hasGoal ? (pts > 0 ? "Apply" : "Buy Point or Apply") : "Buy Point",
                  cost,
                  url: s.buyPointsUrl,
                });
              }
            });
            return items;
          })
          .sort((a, b) => a.deadline.localeCompare(b.deadline));

        if (applyItems.length === 0) return null;

        return (
          <Card className="bg-card border-border overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-chart-2 to-primary" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Crosshair className="w-5 h-5 text-chart-2" />
                  Apply This Year ({currentYear})
                </CardTitle>
                <Badge variant="secondary" className="bg-chart-2/15 text-chart-2 border-0">
                  {applyItems.length} action{applyItems.length > 1 ? "s" : ""}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Based on your goals and points, here&apos;s what needs attention</p>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {applyItems.map((item, idx) => {
                  const state = STATES_MAP[item.stateId];
                  if (!state) return null;
                  const daysLeft = Math.ceil((new Date(item.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  const urgent = daysLeft <= 30;
                  return (
                    <a key={idx} href={item.url} target="_blank" rel="noopener noreferrer" className={`p-3 rounded-lg border transition-all hover:border-primary/30 hover:bg-secondary/30 ${urgent ? "border-chart-4/30 bg-chart-4/5" : "border-border"}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: state.color }}>
                          {state.abbreviation}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{formatSpeciesName(item.species)}</p>
                        </div>
                        {urgent && <span className="text-[9px] px-1.5 py-0.5 rounded bg-chart-4/15 text-chart-4 font-bold shrink-0">URGENT</span>}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(item.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        <span className="font-medium text-primary">${item.cost}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1.5">{item.action}</p>
                    </a>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Beginner Guide — show for new users without a plan */}
      {!hasPlan && userGoals.length === 0 && (
        <BeginnerGuide />
      )}

      {/* State Investment Overview */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">State Investment Overview</CardTitle>
          <p className="text-sm text-muted-foreground">Annual point costs and draw system types across all states</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {STATES.map((state) => {
              const isActive = hasPlan && confirmedAssessment.stateRecommendations.some(r => r.stateId === state.id);
              const visual = STATE_VISUALS[state.id];
              return (
                <a key={state.id} href={state.buyPointsUrl} target="_blank" rel="noopener noreferrer" className={`group relative p-4 rounded-xl border overflow-hidden transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:shadow-lg ${isActive ? "border-primary/30 ring-1 ring-primary/10" : "border-border hover:border-primary/30"}`}>
                  {/* Terrain gradient background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${visual?.gradient ?? "from-slate-800 to-slate-900"} opacity-40 group-hover:opacity-60 transition-opacity duration-300`} />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: state.color }}>
                          {state.abbreviation}
                        </div>
                        {visual && <span className="text-sm">{visual.emoji}</span>}
                      </div>
                      <span className="text-lg font-bold">${state.pointCost.elk ?? state.pointCost.mule_deer ?? 0}</span>
                    </div>
                    <p className="text-xs text-foreground/80 truncate">{state.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {state.pointSystem === "preference" ? "Preference" : state.pointSystem === "hybrid" ? "Hybrid 75/25" : state.pointSystem === "bonus_squared" ? "Bonus²" : state.pointSystem === "bonus" ? "Bonus" : state.pointSystem === "dual" ? "Dual System" : state.pointSystem === "random" ? "Random Draw" : "Pref (NR)"}
                    </p>
                    <p className="text-[9px] text-muted-foreground/50 mt-1 truncate">{state.availableSpecies.length} species</p>
                  </div>
                  {isActive && (
                    <div className="absolute top-2 right-2 z-10">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                  )}
                </a>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
