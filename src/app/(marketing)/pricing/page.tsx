import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Check,
  ArrowRight,
  Mountain,
  Compass,
  Binoculars,
  Crown,
} from "lucide-react";

const plans = [
  {
    name: "Scout",
    price: "Free",
    period: "forever",
    description:
      "Run the strategic consultation and get your personalized state portfolio.",
    icon: Compass,
    featured: false,
    features: [
      "Full strategic consultation",
      "State scoring & rankings",
      "10-year phased roadmap",
      "Budget breakdown & cost projections",
      "Unit recommendations per state",
      "Investment calculator",
    ],
    cta: "Get Started",
    href: "/auth/sign-up",
  },
  {
    name: "Outfitter",
    price: "$12",
    period: "/month",
    description:
      "Everything in Scout plus portfolio tracking, alerts, and advanced analytics.",
    icon: Binoculars,
    featured: true,
    features: [
      "Everything in Scout",
      "Points portfolio dashboard",
      "Application deadline alerts",
      "Draw result notifications",
      "Multi-year strategy comparison",
      "Unit success rate trends",
      "Priority support",
    ],
    cta: "Coming Soon",
    href: "#",
  },
  {
    name: "Expedition",
    price: "$29",
    period: "/month",
    description:
      "For the serious multi-state hunter. Team features, API access, and 1-on-1 strategy calls.",
    icon: Crown,
    featured: false,
    features: [
      "Everything in Outfitter",
      "Unlimited strategy re-runs",
      "Hunt journal & harvest log",
      "Team portfolios (up to 5)",
      "CSV/PDF export",
      "1-on-1 strategy call (quarterly)",
      "Early access to new features",
    ],
    cta: "Coming Soon",
    href: "#",
  },
];

export default function PricingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden">
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
            Start free with the full strategic consultation. Upgrade when
            you&apos;re ready for tracking, alerts, and advanced analytics.
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

                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      plan.featured
                        ? "bg-primary/15"
                        : "bg-secondary"
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

                <div className="mb-4">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground ml-1">
                    {plan.period}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  {plan.description}
                </p>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 text-sm"
                    >
                      <Check
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          plan.featured
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`}
                      />
                      <span className="text-muted-foreground">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link href={plan.href}>
                  <Button
                    className={`w-full gap-2 ${
                      plan.featured
                        ? "glow-pulse"
                        : ""
                    }`}
                    variant={plan.featured ? "default" : "outline"}
                    disabled={plan.cta === "Coming Soon"}
                  >
                    {plan.cta}
                    {plan.cta !== "Coming Soon" && (
                      <ArrowRight className="w-4 h-4" />
                    )}
                  </Button>
                </Link>
              </div>
            ))}
          </div>

          {/* FAQ-style note */}
          <div className="mt-16 max-w-2xl mx-auto text-center">
            <h3 className="text-lg font-bold mb-3">
              Why is the consultation free?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We believe every hunter deserves a solid strategy. The core
              consultation &mdash; state scoring, roadmap generation, and cost
              analysis &mdash; will always be free. Paid plans add ongoing
              tracking, alerts, and advanced tools for hunters managing
              multi-state portfolios year over year.
            </p>
          </div>

          {/* FPO notice */}
          <div className="mt-8 text-center">
            <p className="text-[10px] text-muted-foreground/40 uppercase tracking-widest">
              Pricing shown is for placement only and subject to change
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
