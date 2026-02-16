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
} from "lucide-react";
import Link from "next/link";
import { STATES, STATES_MAP } from "@/lib/constants/states";
import { useAppStore } from "@/lib/store";
import { HuntingTerm } from "@/components/shared/HuntingTerm";

export default function DashboardPage() {
  const { milestones, confirmedAssessment, userPoints, userGoals } = useAppStore();

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

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalPoints}</p>
                <p className="text-xs text-muted-foreground"><HuntingTerm term="preference points">Total Points</HuntingTerm></p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-chart-2/15 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold">${totalInvested.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Year 1 Cost</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-chart-4/15 flex items-center justify-center">
                <Target className="w-5 h-5 text-chart-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {completedMilestones}/{milestones.length}
                </p>
                <p className="text-xs text-muted-foreground">Milestones</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-chart-5/15 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-chart-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {hasPlan ? confirmedAssessment.stateRecommendations.length : activeStates}
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
                  {[
                    {
                      step: 1,
                      title: "Run the Strategic Consultation",
                      description: "Answer a few questions about your experience, budget, and goals. We'll build a custom multi-year strategy.",
                      href: "/plan-builder",
                      done: false,
                    },
                    {
                      step: 2,
                      title: "Set Your Hunt Goals",
                      description: "Define what you're chasing — species, state, weapon, season, and your dream trophy.",
                      href: "/goals",
                      done: userGoals.length > 0,
                    },
                    {
                      step: 3,
                      title: "Track Your Points",
                      description: "Enter your current preference and bonus points across states to get accurate draw timelines.",
                      href: "/points",
                      done: userPoints.length > 0,
                    },
                    {
                      step: 4,
                      title: "Explore Units",
                      description: "Browse the unit database to research success rates, trophy quality, and points required.",
                      href: "/units",
                      done: false,
                    },
                  ].map((item) => (
                    <Link key={item.step} href={item.href}>
                      <div className={`flex items-start gap-3 p-3 rounded-lg transition-all duration-200 hover:bg-secondary/50 cursor-pointer ${item.done ? "opacity-60" : ""}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${item.done ? "bg-chart-2/15 text-chart-2" : "bg-primary/15 text-primary"}`}>
                          {item.done ? "✓" : item.step}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{item.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground mt-0.5 ml-auto shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Upcoming Deadlines */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingDeadlines.map((d, idx) => {
                const state = STATES_MAP[d.stateId];
                if (!state) return null;
                return (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: state.color }}>
                        {state.abbreviation}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{state.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{d.species.replace("_", " ")} Draw</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

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
              return (
                <a key={state.id} href={state.buyPointsUrl} target="_blank" rel="noopener noreferrer" className={`group relative p-4 rounded-xl bg-secondary/50 border transition-all duration-200 cursor-pointer ${isActive ? "border-primary/30 ring-1 ring-primary/10" : "border-border hover:border-primary/30"}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: state.color }}>
                      {state.abbreviation}
                    </div>
                    <span className="text-lg font-bold">${state.pointCost.elk ?? state.pointCost.mule_deer ?? 0}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{state.name}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {state.pointSystem === "preference" ? "Preference" : state.pointSystem === "hybrid" ? "Hybrid 75/25" : state.pointSystem === "bonus_squared" ? "Bonus²" : state.pointSystem === "bonus" ? "Bonus" : state.pointSystem === "dual" ? "Dual System" : state.pointSystem === "random" ? "Random Draw" : "Pref (NR)"}
                  </p>
                  {isActive && (
                    <div className="absolute top-2 right-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" style={{ background: `linear-gradient(135deg, ${state.color}10, transparent)` }} />
                </a>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
