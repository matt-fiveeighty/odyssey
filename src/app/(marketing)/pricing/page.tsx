import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Check,
  X,
  ArrowRight,
  Mountain,
  Compass,
  Binoculars,
  Crown,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing | Odyssey Outdoors",
  description:
    "Simple, transparent pricing for western big game hunt planning. Start free with the full strategy engine.",
};

const plans = [
  {
    name: "Basecamp",
    monthly: "Free",
    annual: "Free",
    period: "forever",
    description:
      "The full strategy engine. All 11 states, unlimited runs, personalized 10-year roadmaps.",
    icon: Compass,
    featured: true,
    features: [
      { name: "Species & state explorer", included: true },
      { name: "All 11 states scored & ranked", included: true },
      { name: "Unlimited strategy engine runs", included: true },
      { name: "Full 10-year roadmap", included: true },
      { name: "Budget projections & cost breakdowns", included: true },
      { name: "Goal tracking & point portfolio", included: true },
      { name: "Deadline calendar", included: true },
      { name: "Data export", included: true },
    ],
    cta: "Get Started Free",
    href: "/auth/sign-up",
  },
  {
    name: "Scout",
    monthly: "$9.99",
    annual: "$79.99",
    annualSavings: "Save 33%",
    period: "/year",
    badge: "Coming Soon",
    description:
      "Enhanced analytics, unit-level recommendations, and deadline alerts. Launching soon.",
    icon: Binoculars,
    featured: false,
    features: [
      { name: "Everything in Basecamp", included: true },
      { name: "Unit-level scoring & recommendations", included: true },
      { name: "Deadline email reminders", included: true },
      { name: "Draw odds deep dives", included: true },
      { name: "Historical point creep data", included: true },
      { name: "Auto-fill applications helper", included: true },
      { name: "Priority support", included: false },
      { name: "Advanced analytics", included: false },
    ],
    cta: "Join Waitlist",
    href: "/auth/sign-up",
  },
  {
    name: "Outfitter",
    monthly: "$14.99",
    annual: "$129.99",
    annualSavings: "Save 28%",
    period: "/year",
    badge: "Coming Soon",
    description:
      "For the serious multi-state hunter. Advanced analytics, historical trends, and collaboration tools.",
    icon: Crown,
    featured: false,
    features: [
      { name: "Everything in Scout", included: true },
      { name: "Historical draw trends", included: true },
      { name: "Multi-year comparison", included: true },
      { name: "Advanced analytics dashboard", included: true },
      { name: "Group application planning", included: true },
      { name: "Data export (JSON/CSV)", included: true },
      { name: "Priority support", included: true },
    ],
    cta: "Join Waitlist",
    href: "/auth/sign-up",
  },
];

export default function PricingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/images/hero/pricing-elk.jpg"
            alt=""
            fill
            className="object-cover opacity-50 pointer-events-none"
            sizes="100vw"
            priority
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background pointer-events-none" />
        <div className="absolute inset-0 aurora-bg pointer-events-none opacity-30" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-6 py-20 md:py-28 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Mountain className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">
              Simple, transparent pricing
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
            Plan Smarter,{" "}
            <span className="text-primary">Hunt Better</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Start free with a snapshot. Upgrade for the full strategy engine,
            draw odds, and multi-year planning.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col p-6 rounded-2xl border transition-all duration-200 ${
                  plan.featured
                    ? "border-primary/50 bg-gradient-to-b from-primary/5 to-card shadow-[0_0_30px_hsl(var(--primary)/0.1)]"
                    : "border-border bg-card hover:border-primary/20"
                }`}
              >
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
                      Full Access
                    </span>
                  </div>
                )}
                {!plan.featured && "badge" in plan && plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 rounded-full bg-secondary text-muted-foreground text-[10px] font-bold uppercase tracking-wider border border-border">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      plan.featured ? "bg-primary/15" : "bg-secondary"
                    }`}
                  >
                    <plan.icon
                      className={`w-5 h-5 ${
                        plan.featured
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    />
                  </div>
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                </div>

                <div className="mb-1">
                  <span className="text-3xl font-bold">{plan.annual}</span>
                  {plan.period !== "forever" && (
                    <span className="text-sm text-muted-foreground ml-1">
                      {plan.period}
                    </span>
                  )}
                </div>
                {plan.annualSavings && (
                  <p className="text-xs text-primary font-medium mb-4">
                    {plan.annualSavings} vs. monthly
                  </p>
                )}
                {!plan.annualSavings && <div className="mb-4" />}

                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  {plan.description}
                </p>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li
                      key={feature.name}
                      className="flex items-start gap-2.5 text-sm"
                    >
                      {feature.included ? (
                        <Check
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            plan.featured
                              ? "text-primary"
                              : "text-muted-foreground"
                          }`}
                        />
                      ) : (
                        <X className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground/40" />
                      )}
                      <span
                        className={
                          feature.included
                            ? "text-muted-foreground"
                            : "text-muted-foreground/40"
                        }
                      >
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link href={plan.href}>
                  <Button
                    className={`w-full gap-2 ${
                      plan.featured ? "glow-pulse" : ""
                    }`}
                    variant={plan.featured ? "default" : "outline"}
                  >
                    {plan.cta}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>

          {/* Trust signals */}
          <div className="mt-16 grid sm:grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-sm font-semibold mb-1">No tracking</p>
              <p className="text-xs text-muted-foreground">
                Zero third-party trackers. No Google Analytics, no Facebook
                Pixel.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold mb-1">Your data is yours</p>
              <p className="text-xs text-muted-foreground">
                Export anytime. Delete anytime. 30-day deletion guarantee.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold mb-1">Cancel anytime</p>
              <p className="text-xs text-muted-foreground">
                No contracts. No hidden fees. One-click cancel in settings.
              </p>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-16 max-w-2xl mx-auto text-center">
            <h3 className="text-lg font-bold mb-3">
              Why is Odyssey free?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every hunter deserves a real strategy &mdash; not a paywall. The full
              engine, all 11 states, unlimited runs, and your complete 10-year
              roadmap are free forever. When we launch Scout and Outfitter,
              they&apos;ll add unit-level analytics, deadline alerts, and
              advanced tools for hunters who want to go deeper.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
