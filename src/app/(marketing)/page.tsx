import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GuestEntryButton } from "@/components/auth/GuestEntryButton";
import {
  Crosshair,
  Map,
  Calendar,
  Wallet,
  Target,
  BarChart3,
  ArrowRight,
  Mountain,
  Compass,
  Shield,
} from "lucide-react";

const steps = [
  {
    icon: Crosshair,
    title: "Profile Your Hunt",
    description:
      "Answer a few questions about your experience, species targets, budget, and hunting DNA. The consultation adapts to who you are as a hunter.",
  },
  {
    icon: BarChart3,
    title: "Get Your Strategy",
    description:
      "Our scoring engine evaluates every western state across multiple weighted factors and builds a personalized multi-year roadmap with phased milestones.",
  },
  {
    icon: Calendar,
    title: "Execute With Confidence",
    description:
      "Track deadlines, manage point portfolios, and follow your timeline. Every recommendation comes with cost breakdowns and unit details.",
  },
];

const features = [
  {
    icon: Target,
    title: "Point Strategy",
    description:
      "Preference, bonus, hybrid — understand every state's draw system and build points where they matter most. Track elk, deer, sheep, goat, bison, and more.",
  },
  {
    icon: Map,
    title: "State Scoring",
    description:
      "Every western state scored against your specific profile. Not generic advice — strategy tuned to your budget, fitness, and goals.",
  },
  {
    icon: Calendar,
    title: "Timeline Planning",
    description:
      "Phased roadmap with application deadlines, point-year vs hunt-year scheduling, and milestone tracking.",
  },
  {
    icon: Wallet,
    title: "Budget Intelligence",
    description:
      "Year-one costs, long-term projections, application fees, guided hunt estimates — all calculated per state.",
  },
  {
    icon: Compass,
    title: "Unit Database",
    description:
      "Browse units across every state with success rates, point requirements, and species breakdowns.",
  },
  {
    icon: Shield,
    title: "Goal Tracking",
    description:
      "Set species goals, track milestones, and watch your western hunting portfolio grow over time.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Layered background: aurora + topo grid + radial glow */}
        <div className="absolute inset-0 aurora-bg pointer-events-none" />
        <div className="absolute inset-0 topo-grid pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-6 py-24 md:py-32 text-center">
          <div className="hero-stagger-1 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-8 glow-primary">
            <Mountain className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">
              Every State. One Strategy. Your Roadmap.
            </span>
          </div>

          <h1 className="hero-stagger-2 text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
            Your Western Hunt Strategy,{" "}
            <span className="text-primary">Engineered</span>
          </h1>

          <p className="hero-stagger-3 mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Stop guessing where to apply. Odyssey Outdoors builds a personalized
            multi-year strategy across the top western states — optimized for
            your budget, experience, and goals.
          </p>

          <div className="hero-stagger-4 flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Link href="/auth/sign-up">
              <Button size="lg" className="gap-2 text-base px-8 glow-pulse shimmer-sweep">
                Start Planning <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/auth/sign-in">
              <Button variant="outline" size="lg" className="text-base px-8">
                Sign In
              </Button>
            </Link>
          </div>
          <div className="hero-stagger-5 mt-4">
            <GuestEntryButton />
          </div>

          {/* State badges */}
          <div className="hero-stagger-5 flex flex-wrap items-center justify-center gap-2 mt-12">
            {["CO", "WY", "MT", "NV", "AZ", "UT", "NM", "OR", "ID", "KS"].map(
              (state) => (
                <span
                  key={state}
                  className="px-3 py-1 rounded-md bg-secondary/60 border border-border text-xs font-semibold text-muted-foreground badge-shimmer"
                >
                  {state}
                </span>
              )
            )}
          </div>

          {/* Species badges */}
          <div className="hero-stagger-5 flex flex-wrap items-center justify-center gap-2 mt-3">
            {["Elk", "Mule Deer", "Whitetail", "Bear", "Moose", "Pronghorn", "Bighorn Sheep", "Mountain Goat", "Bison", "Mountain Lion"].map(
              (species) => (
                <span
                  key={species}
                  className="px-2.5 py-1 rounded-md bg-primary/5 border border-primary/10 text-[10px] font-medium text-primary/70 badge-shimmer"
                >
                  {species}
                </span>
              )
            )}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              How It Works
            </h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
              Three steps from first-time applicant to a fully mapped strategy.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div
                key={step.title}
                className="relative p-6 rounded-xl bg-card border border-border card-lift"
              >
                <div className="absolute -top-3 -left-3 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <step.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-card/50">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Everything You Need
            </h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
              Built for serious western hunters who treat their hunting like an
              investment portfolio.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-5 rounded-xl bg-background border border-border hover:border-primary/30 transition-all duration-200 card-lift"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <feature.icon className="w-4.5 h-4.5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold mb-1.5">
                  {feature.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Ready to Build Your Strategy?
          </h2>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
            Create your free account and run the strategic consultation. Your
            personalized multi-year roadmap is just a few questions away.
          </p>
          <Link href="/auth/sign-up">
            <Button size="lg" className="gap-2 text-base px-8 mt-8">
              Start Planning <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
