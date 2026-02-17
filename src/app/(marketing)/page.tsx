import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GuestEntryButton } from "@/components/auth/GuestEntryButton";
import { TestimonialCarousel } from "@/components/marketing/TestimonialCarousel";
import { StateOutline } from "@/components/shared/StateOutline";
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
  CheckCircle2,
  MapPin,
  Trophy,
  Users,
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
      "Our scoring engine evaluates every western state across weighted factors and builds a personalized multi-year roadmap with phased milestones.",
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
      "Preference, bonus, hybrid — understand every state's draw system and build points where they matter most.",
  },
  {
    icon: Map,
    title: "State Scoring",
    description:
      "Every western state scored against your specific profile. Not generic advice — strategy tuned to you.",
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
      "Browse units across every state with success rates, point requirements, and tactical hunt notes.",
  },
  {
    icon: Shield,
    title: "Goal Tracking",
    description:
      "Set species goals, track milestones, and watch your western hunting portfolio grow over time.",
  },
];

const rtbs = [
  {
    value: "Western States",
    detail: "CO, WY, MT, NV, AZ, UT, NM, OR, ID, KS, AK — and expanding. Every major western draw state covered.",
    icon: MapPin,
  },
  {
    value: "10+ Species",
    detail: "Elk, mule deer, moose, sheep, goat, bison, bear, pronghorn, mountain lion, and more.",
    icon: Trophy,
  },
  {
    value: "10-Year Plan",
    detail: "Phased build-burn-trophy roadmap with point projections, cost forecasts, and hunt scheduling.",
    icon: Calendar,
  },
  {
    value: "5 Min Setup",
    detail: "Answer a few questions. Get a scored state portfolio, unit picks, and a full action timeline.",
    icon: Users,
  },
];

const showcaseSteps = [
  {
    step: "01",
    title: "Tell Us About You",
    description:
      "Species, budget, experience, style — a short consultation captures who you are as a hunter.",
    highlights: [
      "Elk, Deer, Moose, Bear, and more",
      "DIY Backpack to Guided trip styles",
      "Budget-aware recommendations",
    ],
    icon: Crosshair,
    label: "Strategic Consultation",
  },
  {
    step: "02",
    title: "Receive Your Strategy",
    description:
      "A personalized state portfolio with scoring breakdowns, unit recommendations, and a 10-year phased roadmap.",
    highlights: [
      "State-by-state scoring with visible reasoning",
      "Best units matched to your profile",
      "Itemized cost breakdowns per year",
    ],
    icon: BarChart3,
    label: "Strategy & Roadmap",
  },
  {
    step: "03",
    title: "Track & Execute",
    description:
      "Manage points, set goals, track milestones, and follow your timeline across every state you're applying in.",
    highlights: [
      "Points portfolio dashboard",
      "Application deadline tracking",
      "Goal-to-milestone conversion",
    ],
    icon: Target,
    label: "Dashboard & Tracking",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* ================================================================ */}
      {/* HERO */}
      {/* ================================================================ */}
      <section className="relative overflow-hidden">
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

          <div className="hero-stagger-4 mt-10">
            <Link href="/auth/sign-up">
              <Button
                size="lg"
                className="gap-2 text-base px-8 glow-pulse shimmer-sweep"
              >
                Start Planning <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="hero-stagger-5 mt-4">
            <GuestEntryButton />
          </div>

          {/* State badges */}
          <div className="hero-stagger-5 flex flex-wrap items-center justify-center gap-2 mt-12">
            {["CO", "WY", "MT", "AK", "NV", "AZ", "UT", "NM", "OR", "ID", "KS"].map(
              (state) => (
                <span
                  key={state}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary/60 border border-primary/30 text-xs font-semibold text-muted-foreground badge-shimmer shadow-[0_0_8px_hsl(var(--primary)/0.25),0_0_20px_hsl(var(--primary)/0.1)]"
                >
                  <StateOutline
                    stateId={state}
                    size={16}
                    className="drop-shadow-[0_0_4px_hsl(var(--primary)/0.6)]"
                    strokeColor="hsl(var(--primary))"
                    strokeWidth={3}
                    fillColor="hsl(var(--primary) / 0.15)"
                  />
                  {state}
                </span>
              )
            )}
          </div>

          {/* Species badges */}
          <div className="hero-stagger-5 flex flex-wrap items-center justify-center gap-2 mt-3">
            {[
              "Elk",
              "Mule Deer",
              "Whitetail",
              "Bear",
              "Moose",
              "Pronghorn",
              "Bighorn Sheep",
              "Mountain Goat",
              "Bison",
              "Mountain Lion",
            ].map((species) => (
              <span
                key={species}
                className="px-2.5 py-1 rounded-md bg-primary/5 border border-primary/10 text-[10px] font-medium text-primary/70 badge-shimmer"
              >
                {species}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* REASONS TO BELIEVE */}
      {/* ================================================================ */}
      <section className="border-t border-border bg-card/30">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {rtbs.map((rtb) => (
              <div key={rtb.value} className="p-4 rounded-xl bg-background/50 border border-border">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <rtb.icon className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <p className="text-sm font-bold text-foreground">
                    {rtb.value}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {rtb.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* HOW IT WORKS */}
      {/* ================================================================ */}
      <section id="how-it-works" className="border-t border-border scroll-mt-20">
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

      {/* ================================================================ */}
      {/* APP SHOWCASE — Alternating layout */}
      {/* ================================================================ */}
      <section className="border-t border-border bg-card/50">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              See It In Action
            </h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
              From consultation to execution — here&apos;s what your experience
              looks like.
            </p>
          </div>

          <div className="space-y-16">
            {showcaseSteps.map((item, i) => (
              <div
                key={item.step}
                className={`flex flex-col ${
                  i % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row"
                } gap-8 md:gap-12 items-center`}
              >
                <div className="flex-1 space-y-4">
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                    Step {item.step}
                  </span>
                  <h3 className="text-xl font-bold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                  <ul className="space-y-2 pt-2">
                    {item.highlights.map((h) => (
                      <li
                        key={h}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex-1 w-full">
                  <div className="aspect-[16/10] rounded-xl bg-gradient-to-br from-card to-secondary/30 border border-border flex items-center justify-center">
                    <div className="text-center px-6">
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                        <item.icon className="w-7 h-7 text-primary" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {item.label}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* FEATURES */}
      {/* ================================================================ */}
      <section id="features" className="border-t border-border scroll-mt-20">
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
                className="p-5 rounded-xl bg-card border border-border hover:border-primary/30 transition-all duration-200 card-lift"
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

      {/* ================================================================ */}
      {/* TESTIMONIALS */}
      {/* ================================================================ */}
      <section
        id="testimonials"
        className="border-t border-border bg-card/50 scroll-mt-20"
      >
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Hunters Like You
            </h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
              Hear from hunters who stopped guessing and started strategizing.
            </p>
          </div>

          <TestimonialCarousel />
        </div>
      </section>

      {/* ================================================================ */}
      {/* BOTTOM CTA */}
      {/* ================================================================ */}
      <section className="border-t border-border relative overflow-hidden">
        <div className="absolute inset-0 aurora-bg pointer-events-none opacity-50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/8 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative max-w-3xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Compass className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">
              Free forever — no credit card needed
            </span>
          </div>

          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Your 10-Year Strategy Starts Now
          </h2>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
            Run the strategic consultation in under 5 minutes. Get a
            personalized multi-year roadmap with state rankings, unit picks, cost
            breakdowns, and an action timeline.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            <Link href="/auth/sign-up">
              <Button
                size="lg"
                className="gap-2 text-base px-8 glow-pulse shimmer-sweep"
              >
                Start Planning <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <GuestEntryButton />
          </div>
        </div>
      </section>
    </div>
  );
}
