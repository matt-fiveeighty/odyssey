"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Check,
  Target,
  DollarSign,
  Ticket,
  Clock,
  Shuffle,
  MapPin,
  Crosshair,
  HelpCircle,
  ArrowRight,
  Lightbulb,
} from "lucide-react";
import { HuntingTerm } from "@/components/shared/HuntingTerm";
import Link from "next/link";

interface LessonModule {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  duration: string;
  content: {
    heading: string;
    body: string;
    tip?: string;
  }[];
  actionLabel?: string;
  actionHref?: string;
}

const LESSONS: LessonModule[] = [
  {
    id: "what-are-points",
    title: "What Are Preference Points?",
    icon: Target,
    duration: "2 min",
    content: [
      {
        heading: "The basics",
        body: "Most western states use a point system to manage hunting demand. Each year you apply (or buy a point), you accumulate one preference or bonus point. The more points you have, the better your chances of drawing a tag.",
      },
      {
        heading: "Preference vs Bonus",
        body: "Preference points guarantee you'll draw before someone with fewer points. Bonus points improve your odds but don't guarantee anything — think of them like extra lottery tickets.",
        tip: "Colorado uses preference points (80% of tags go to highest point holders). Nevada uses bonus-squared points (your tickets are squared — 5 points = 25 entries).",
      },
      {
        heading: "Why it matters",
        body: "Premium hunt units in popular states can require 10-20+ years of points. Starting early means you're building towards those opportunities while other hunters wait.",
      },
    ],
  },
  {
    id: "otc-vs-draw",
    title: "OTC Tags vs Draw Tags",
    icon: Ticket,
    duration: "2 min",
    content: [
      {
        heading: "Over-the-counter (OTC) tags",
        body: "Some states sell tags directly — no draw needed. Colorado general elk tags are the most famous example. You buy one and go hunt. These are perfect for your first western hunt.",
        tip: "Colorado OTC elk tags for 2nd and 3rd rifle seasons are the most popular first western hunt. Available to anyone, any year.",
      },
      {
        heading: "Limited-draw tags",
        body: "Premium units with better animals require entering a draw. You apply in spring, results come in summer, and if drawn, you hunt that fall. Not drawn? You get a point for next year.",
      },
      {
        heading: "The beginner strategy",
        body: "Most beginners should hunt OTC the first year or two while building points in other states for later. This way you get field experience immediately while investing in future premium hunts.",
      },
    ],
    actionLabel: "Find OTC opportunities",
    actionHref: "/opportunity-finder",
  },
  {
    id: "how-draws-work",
    title: "How Draws Work",
    icon: Shuffle,
    duration: "3 min",
    content: [
      {
        heading: "The application cycle",
        body: "Each state has an application window (usually January–May). You apply for specific units, pay a small fee, and wait. Results come out in summer. If drawn, you pay for the tag. If not, you get a point.",
      },
      {
        heading: "Draw systems vary",
        body: "Pure random: everyone has equal odds (New Mexico, Idaho). Preference: highest points draw first (Colorado). Hybrid: mix of both (Wyoming 75/25). Bonus: more points = more lottery tickets (Arizona, Nevada).",
      },
      {
        heading: "Application strategy",
        body: "You don't need to apply in every state. Focus on 2-4 states based on your species goals and budget. Apply consistently every year — missed years mean lost progress.",
        tip: "Missing a single year in a preference state can set you back significantly. Set calendar reminders for every deadline.",
      },
    ],
  },
  {
    id: "budget-reality",
    title: "What Does It Actually Cost?",
    icon: DollarSign,
    duration: "2 min",
    content: [
      {
        heading: "Building points (non-hunting years)",
        body: "Most states charge $50-$150/year for a non-resident to buy a preference point. Some require a hunting license on top of that. Budget $200-$800/year for point building across 2-4 states.",
      },
      {
        heading: "Hunting years",
        body: "When you draw and actually hunt, costs jump: $500-$2,000 for the tag, $300-$600 for flights, $300-$700 for rental vehicle, plus food, fuel, and gear. Total: $2,000-$5,000 for a DIY elk hunt.",
        tip: "Your budget should account for BOTH point-building years (cheap) and hunting years (expensive). Most years you're just building points.",
      },
      {
        heading: "The real cost of waiting",
        body: "Every year you don't start building points is a year added to your timeline. The $100-$200 annual point investment now could mean the difference between drawing your dream tag at age 35 vs 45.",
      },
    ],
    actionLabel: "Set your budget",
    actionHref: "/plan-builder",
  },
  {
    id: "first-year-checklist",
    title: "Your First Year Checklist",
    icon: Check,
    duration: "3 min",
    content: [
      {
        heading: "January - February",
        body: "Research: Run the Strategic Consultation to identify your target states. Decide which species you're chasing. Create a hunter safety certificate if you don't have one.",
      },
      {
        heading: "March - May",
        body: "Apply: Submit applications in your target states. Buy preference points where you're not applying to hunt. This is the most critical window — don't miss deadlines.",
        tip: "Set phone reminders 2 weeks before each state's deadline. Missing an application deadline is the #1 beginner mistake.",
      },
      {
        heading: "June - August",
        body: "Prepare: Draw results come out. If drawn, book flights and accommodation. Start physical conditioning — western hunts at 8,000+ ft elevation are no joke. Buy or borrow gear.",
      },
      {
        heading: "September - November",
        body: "Hunt: Execute your plan. Even if you don't draw, consider an OTC Colorado elk hunt for the experience. Hunt season runs from September through November depending on state and weapon.",
      },
      {
        heading: "December",
        body: "Review: What worked? What didn't? Update your strategy for next year. Your Odyssey plan auto-adjusts based on draw results.",
      },
    ],
    actionLabel: "Build your first plan",
    actionHref: "/plan-builder",
  },
  {
    id: "common-mistakes",
    title: "5 Mistakes Beginners Make",
    icon: HelpCircle,
    duration: "2 min",
    content: [
      {
        heading: "1. Applying in too many states",
        body: "Spreading thin costs more and doesn't accelerate your timeline. Focus on 2-4 states max and apply consistently every year.",
      },
      {
        heading: "2. Waiting until they're 'ready'",
        body: "You don't need to hunt this year to start building points. The 25-year-old who buys a $50 point today has a massive advantage over the 35-year-old who starts then.",
      },
      {
        heading: "3. Ignoring physical fitness",
        body: "Western hunting at elevation is physically demanding. Start training 6 months before your hunt. Stair climbs with a weighted pack are the best prep.",
      },
      {
        heading: "4. Skipping OTC experience",
        body: "Don't wait 5 years for a premium draw tag as your first western hunt. Do an OTC Colorado elk hunt year 1. The field experience is invaluable.",
      },
      {
        heading: "5. Not tracking deadlines",
        body: "Each state has different application windows, many overlapping. One missed deadline = one lost year of points. Use Odyssey to track every deadline automatically.",
      },
    ],
  },
];

export function BeginnerGuide() {
  const [expandedLesson, setExpandedLesson] = useState<string | null>("what-are-points");
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());

  function toggleLesson(id: string) {
    setExpandedLesson(expandedLesson === id ? null : id);
  }

  function markComplete(id: string) {
    setCompletedLessons((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    // Auto-expand next lesson
    const idx = LESSONS.findIndex((l) => l.id === id);
    if (idx < LESSONS.length - 1) {
      setExpandedLesson(LESSONS[idx + 1].id);
    }
  }

  const progress = (completedLessons.size / LESSONS.length) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Start Here</h2>
          <p className="text-sm text-muted-foreground">
            Everything you need to know about western big game hunting, in plain English.
          </p>
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>{completedLessons.size} of {LESSONS.length} lessons</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-chart-2 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Lessons */}
      <div className="space-y-2">
        {LESSONS.map((lesson, idx) => {
          const isExpanded = expandedLesson === lesson.id;
          const isDone = completedLessons.has(lesson.id);
          const Icon = lesson.icon;

          return (
            <Card key={lesson.id} className={`bg-card border-border transition-all ${isDone ? "opacity-70" : ""}`}>
              <button
                onClick={() => toggleLesson(lesson.id)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isDone ? "bg-chart-2/15" : "bg-primary/15"
                }`}>
                  {isDone ? (
                    <Check className="w-4 h-4 text-chart-2" />
                  ) : (
                    <Icon className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold text-sm ${isDone ? "line-through text-muted-foreground" : ""}`}>
                    {lesson.title}
                  </h3>
                  <p className="text-[10px] text-muted-foreground">{lesson.duration} read</p>
                </div>
                <span className="text-xs text-muted-foreground font-mono mr-2">
                  {idx + 1}/{LESSONS.length}
                </span>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </button>

              {isExpanded && (
                <CardContent className="px-4 pb-4 pt-0 space-y-4 fade-in-up">
                  {lesson.content.map((section, i) => (
                    <div key={i}>
                      <h4 className="font-semibold text-xs text-foreground mb-1">{section.heading}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{section.body}</p>
                      {section.tip && (
                        <div className="mt-2 p-2 rounded-lg bg-chart-1/5 border border-chart-1/10 flex gap-2">
                          <Lightbulb className="w-3.5 h-3.5 text-chart-1 shrink-0 mt-0.5" />
                          <p className="text-[10px] text-chart-1">{section.tip}</p>
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    {!isDone && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markComplete(lesson.id)}
                        className="gap-1.5 text-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Mark as read
                      </Button>
                    )}
                    {lesson.actionHref && (
                      <Link href={lesson.actionHref}>
                        <Button size="sm" className="gap-1.5 text-xs">
                          {lesson.actionLabel} <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* CTA when all done */}
      {completedLessons.size === LESSONS.length && (
        <Card className="bg-gradient-to-r from-primary/5 via-chart-2/5 to-chart-4/5 border-primary/20">
          <CardContent className="p-5 text-center">
            <Check className="w-10 h-10 text-chart-2 mx-auto mb-3" />
            <h3 className="font-bold text-lg mb-1">You&apos;re ready!</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You now understand the fundamentals. Time to build your first strategy.
            </p>
            <Link href="/plan-builder">
              <Button className="gap-2">
                <Crosshair className="w-4 h-4" />
                Start the Strategic Consultation
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
