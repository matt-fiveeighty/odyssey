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
  TrendingUp,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing | Odyssey Outdoors",
  description:
    "Simple, transparent pricing for western big game hunt planning. Start free, upgrade when you are ready.",
};

const plans = [
  {
    name: "Basecamp",
    monthly: "Free",
    annual: "Free",
    period: "forever",
    description:
      "Get started with your first strategy. Explore species, see how the engine works, and plan your next move.",
    icon: Compass,
    featured: false,
    features: [
      { name: "Browse all 18 species and 15 states", included: true },
      { name: "One full strategy engine run", included: true },
      { name: "3-year roadmap with cost estimates", included: true },
      { name: "See what you will spend in year one", included: true },
      { name: "View application deadlines by state", included: true },
      { name: "Unit-level recommendations", included: false },
      { name: "Track your points across states", included: false },
      { name: "Export your plan", included: false },
    ],
    kpis: [
      { label: "Strategy Runs", value: "1" },
      { label: "Roadmap Horizon", value: "3 yr" },
    ],
  },
  {
    name: "Scout",
    monthly: "$9.99",
    annual: "$79.99",
    monthlyEquiv: "$6.67",
    annualSavings: "Save 33%",
    period: "/year",
    badge: "Coming Soon",
    description:
      "Run unlimited strategies, get full 25-year roadmaps, and never miss a deadline with email reminders.",
    icon: Binoculars,
    featured: false,
    features: [
      { name: "Everything in Basecamp", included: true },
      { name: "Unlimited strategy engine runs", included: true },
      { name: "Full 25-year roadmap with phased plan", included: true },
      { name: "Year-by-year budget projections", included: true },
      { name: "Track points and goals across every state", included: true },
      { name: "Email reminders before deadlines", included: true },
      { name: "Export your plan as PDF or CSV", included: true },
      { name: "Advanced analytics dashboard", included: false },
    ],
    kpis: [
      { label: "Strategy Runs", value: "Unlimited" },
      { label: "Roadmap Horizon", value: "25 yr" },
    ],
  },
  {
    name: "Outfitter",
    monthly: "$14.99",
    annual: "$129.99",
    monthlyEquiv: "$10.83",
    annualSavings: "Save $50/yr vs. monthly",
    period: "/year",
    description:
      "The full platform. Unit scoring, draw odds analysis, point creep trends, group planning, and priority support.",
    icon: Crown,
    featured: true,
    features: [
      { name: "Everything in Scout", included: true },
      { name: "See which units match your profile best", included: true },
      { name: "Draw odds breakdowns by unit and species", included: true },
      { name: "See how point requirements change over time", included: true },
      { name: "Full analytics: trends, projections, what-ifs", included: true },
      { name: "Plan group applications with hunting partners", included: true },
      { name: "Export everything as JSON or CSV", included: true },
      { name: "Priority support from real hunters", included: true },
    ],
    kpis: [
      { label: "Strategy Runs", value: "Unlimited" },
      { label: "Roadmap Horizon", value: "25 yr" },
      { label: "Analytics", value: "Full" },
    ],
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
            Start free and explore. Upgrade when you are ready for the full
            strategy engine, deep analytics, and collaboration tools.
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
                      Most Popular
                    </span>
                  </div>
                )}
                {"badge" in plan && plan.badge && !plan.featured && (
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
                {"annualSavings" in plan && plan.annualSavings && (
                  <p className="text-xs text-primary font-medium">
                    {plan.annualSavings}
                  </p>
                )}
                {"monthlyEquiv" in plan && plan.monthlyEquiv && (
                  <p className="text-[11px] text-muted-foreground mb-4">
                    Just {plan.monthlyEquiv}/mo billed annually
                  </p>
                )}
                {!("annualSavings" in plan && plan.annualSavings) && (
                  <div className="mb-4" />
                )}

                {/* KPI badges */}
                {"kpis" in plan && plan.kpis && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {plan.kpis.map((kpi: { label: string; value: string }) => (
                      <div
                        key={kpi.label}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider ${
                          plan.featured
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "bg-secondary text-muted-foreground border border-border"
                        }`}
                      >
                        <TrendingUp className="w-3 h-3" />
                        <span>{kpi.label}:</span>
                        <span className="font-bold">{kpi.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  {plan.description}
                </p>

                <ul className="space-y-3 flex-1">
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
                Export anytime. Delete anytime. 30 day deletion guarantee.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold mb-1">Cancel anytime</p>
              <p className="text-xs text-muted-foreground">
                No contracts. No hidden fees. One click cancel in settings.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 text-center">
            <Link href="/auth/sign-up">
              <Button size="lg" className="gap-2 text-base px-8 glow-pulse">
                Get Started Now <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              Free forever. No credit card required.
            </p>
          </div>

          {/* FAQ */}
          <div className="mt-16 max-w-2xl mx-auto text-center">
            <h3 className="text-lg font-bold mb-3">
              Why is Basecamp free?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every hunter deserves a real strategy, not a paywall. Basecamp
              gives you a taste of what Odyssey can do. When you are ready to
              commit to the full engine with unlimited runs, deep analytics,
              and collaboration, Scout and Outfitter are there for you.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
