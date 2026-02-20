import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { GuestEntryButton } from "@/components/auth/GuestEntryButton";
import { TestimonialCarousel } from "@/components/marketing/TestimonialCarousel";
import { OutcomeComparison } from "@/components/marketing/OutcomeComparison";
import { ParallaxImage } from "@/components/marketing/ParallaxImage";
import { ScrollReveal } from "@/components/marketing/ScrollReveal";
import { StateOutline } from "@/components/shared/StateOutline";
import {
  Crosshair,
  Map,
  Calendar,
  Wallet,
  Target,
  BarChart3,
  ArrowRight,
  Compass,
  Shield,
  CheckCircle2,
  X,
  AlertTriangle,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Data                                                              */
/* ------------------------------------------------------------------ */

const problemBullets = [
  "15 states. 15 different draw systems.",
  "Preference vs bonus vs hybrid.",
  "Rising fees and point creep.",
  "Deadlines scattered across agency sites.",
  "No long-term visibility.",
];

const isItems = [
  "Long-term tag strategy",
  "Multi-state planning",
  "Budget-aware forecasting",
  "Draw timeline projection",
  "Application discipline",
];

const isntItems = [
  "A mapping app",
  "A unit research database",
  "A gear review site",
  "An outfitter marketplace",
];

const features = [
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
    icon: Shield,
    title: "Discipline Rules",
    description:
      "Seven built-in rules surface when your portfolio drifts — budget concentration, build fatigue, point abandonment, and more.",
  },
  {
    icon: Target,
    title: "Point Strategy",
    description:
      "Preference, bonus, hybrid — understand every state's draw system and build points where they matter most.",
  },
  {
    icon: Compass,
    title: "Unit Insights Aligned to Your Strategy",
    description:
      "Browse units across every state with success rates, point requirements, and tactical hunt notes.",
  },
];

const showcaseSteps = [
  {
    step: "01",
    title: "Answer 9 Questions",
    description:
      "Species, budget, experience, style — a quick consultation captures who you are as a hunter.",
    highlights: [
      "Elk, Deer, Moose, Bear, and more",
      "DIY Backpack to Guided trip styles",
      "Budget-aware recommendations",
    ],
    icon: Crosshair,
    label: "Strategy Builder",
    image: "/images/how-it-works/tell-us-about-you.png",
    imageAlt: "Hunt strategy species selection interface",
  },
  {
    step: "02",
    title: "Receive Your Strategy",
    description:
      "A scored state portfolio with visible reasoning, unit recommendations, and a multi-year phased roadmap.",
    highlights: [
      "State-by-state scoring with visible reasoning",
      "Best units matched to your profile",
      "Itemized cost breakdowns per year",
    ],
    icon: BarChart3,
    label: "Strategy & Roadmap",
    image: "/images/how-it-works/receive-your-strategy.png",
    imageAlt: "Bull elk at golden hour on a mountain ridgeline",
  },
  {
    step: "03",
    title: "Execute the Plan",
    description:
      "Manage points, track deadlines, and follow your roadmap across every state you are applying in.",
    highlights: [
      "Points portfolio dashboard",
      "Application deadline tracking",
      "Goal-to-milestone conversion",
    ],
    icon: Target,
    label: "Dashboard & Tracking",
    image: "/images/how-it-works/track-and-execute.png",
    imageAlt: "Hunter packing out an elk through mountain terrain",
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* ================================================================ */}
      {/* HERO — "Stop Applying Blind."                                    */}
      {/* ================================================================ */}
      <section className="relative overflow-hidden">
        <ParallaxImage
          src="/images/hero/tactical-map.jpg"
          alt=""
          className="opacity-80 pointer-events-none"
          speed={0.3}
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/25 via-background/50 to-background pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-6 py-24 md:py-32 text-left">
          <h1 className="hero-stagger-1 text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight max-w-[680px]">
            Stop Applying Blind.
          </h1>

          <h2 className="hero-stagger-2 mt-4 text-2xl md:text-3xl lg:text-4xl font-semibold tracking-tight text-foreground/90 max-w-[680px]">
            The Strategic Planning Engine for Western Big Game.
          </h2>

          <p className="hero-stagger-3 mt-5 text-lg md:text-xl text-muted-foreground max-w-[680px] leading-relaxed font-light">
            Plan across 15 states. See your draw timelines. Map every point and
            dollar. Execute with discipline.
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
            <p className="mt-3 text-sm text-muted-foreground">
              Free forever. No credit card.
            </p>
          </div>

          {/* State badges */}
          <div className="hero-stagger-5 flex flex-wrap items-center justify-center gap-2 mt-12">
            {["CO", "WY", "MT", "AK", "NV", "AZ", "UT", "NM", "OR", "ID", "KS", "WA", "NE", "SD", "ND"].map(
              (state) => (
                <span
                  key={state}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary/60 border border-primary/30 text-xs font-semibold text-muted-foreground badge-shimmer shadow-[0_0_8px_hsl(var(--primary)/0.25),0_0_20px_hsl(var(--primary)/0.1)]"
                >
                  <StateOutline
                    stateId={state}
                    size={16}
                    className="drop-shadow-[0_0_4px_hsl(var(--primary)/0.4)]"
                    strokeColor="white"
                    strokeWidth={3}
                    fillColor="rgba(255,255,255,0.15)"
                  />
                  <span className="text-primary">{state}</span>
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
              "Coues Deer",
              "Columbia Blacktail",
              "Sitka Blacktail",
              "Black Bear",
              "Grizzly",
              "Moose",
              "Pronghorn",
              "Bighorn Sheep",
              "Dall Sheep",
              "Mountain Goat",
              "Bison",
              "Caribou",
              "Mountain Lion",
              "Muskox",
              "Wolf",
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
      {/* PROBLEM — "The System Is Designed to Confuse You."               */}
      {/* ================================================================ */}
      <section className="border-t border-border bg-card/30">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <ScrollReveal animation="blur-in" once={false}>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              The System Is Designed to Confuse You.
            </h2>
          </ScrollReveal>

          <ScrollReveal animation="fade-up" stagger={80} once={false} className="mt-8 space-y-3">
            {problemBullets.map((bullet) => (
              <div key={bullet} className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                <p className="text-sm text-muted-foreground">{bullet}</p>
              </div>
            ))}
          </ScrollReveal>

          <ScrollReveal animation="fade-up" delay={400} once={false}>
            <p className="mt-8 text-base font-medium text-foreground">
              Most hunters apply state by state. Odyssey plans across all of them.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ================================================================ */}
      {/* WHAT IT IS / ISN'T                                               */}
      {/* ================================================================ */}
      <section className="border-t border-border">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <ScrollReveal animation="blur-in" once={false} className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              What Odyssey Is (and Isn&apos;t)
            </h2>
          </ScrollReveal>

          <ScrollReveal animation="fade-up" stagger={80} once={false} className="grid md:grid-cols-2 gap-6">
            {/* IS */}
            <div className="p-6 rounded-xl bg-card border border-primary/20">
              <h3 className="text-sm font-bold text-primary mb-4">What Odyssey Is</h3>
              <ul className="space-y-3">
                {isItems.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary/70 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* ISN'T */}
            <div className="p-6 rounded-xl bg-card border border-border">
              <h3 className="text-sm font-bold text-muted-foreground mb-4">What Odyssey Isn&apos;t</h3>
              <ul className="space-y-3">
                {isntItems.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <X className="w-4 h-4 text-muted-foreground/50 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ================================================================ */}
      {/* OUTCOME COMPARISON — "Same budget. Different outcome."           */}
      {/* ================================================================ */}
      <section className="border-t border-border bg-card/30">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <ScrollReveal animation="blur-in" once={false} className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Same Budget. Different Outcome.
            </h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
              Two hunters spending the same money. One applies blind. The other follows a strategy.
            </p>
          </ScrollReveal>

          <ScrollReveal animation="scale-in" once={false}>
            <OutcomeComparison />
          </ScrollReveal>
        </div>
      </section>

      {/* ================================================================ */}
      {/* HOW IT WORKS — 3 steps                                           */}
      {/* ================================================================ */}
      <section className="border-t border-border bg-card/50">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <ScrollReveal animation="blur-in" once={false} className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              How It Works
            </h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto text-balance">
              From consultation to execution — here&apos;s what your experience looks like.
            </p>
          </ScrollReveal>

          <div className="space-y-16">
            {showcaseSteps.map((item, i) => (
              <div
                key={item.step}
                className={`flex flex-col ${
                  i % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row"
                } gap-8 md:gap-12 items-center`}
              >
                {/* Text side */}
                <div className="flex-1 space-y-4">
                  <ScrollReveal animation="fade-up" delay={0} once={false}>
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                      Step {item.step}
                    </span>
                  </ScrollReveal>
                  <ScrollReveal animation="fade-up" delay={80} once={false}>
                    <h3 className="text-xl font-bold">{item.title}</h3>
                  </ScrollReveal>
                  <ScrollReveal animation="fade-up" delay={160} once={false}>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </ScrollReveal>
                  <ScrollReveal animation="fade-up" stagger={120} delay={240} once={false} className="space-y-2 pt-2">
                    {item.highlights.map((h) => (
                      <li
                        key={h}
                        className="flex items-start gap-2 text-sm text-muted-foreground list-none"
                      >
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        {h}
                      </li>
                    ))}
                  </ScrollReveal>
                </div>

                {/* Image side */}
                <ScrollReveal
                  animation={i % 2 === 1 ? "fade-left" : "fade-right"}
                  delay={200}
                  once={false}
                  className="flex-1 w-full"
                >
                  <div className="relative aspect-[16/10] rounded-xl overflow-hidden border border-border group">
                    <Image
                      src={item.image}
                      alt={item.imageAlt}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
                    <div className="absolute bottom-4 left-4">
                      <span className="text-xs font-bold text-primary bg-primary/10 backdrop-blur-md px-2.5 py-1 rounded-full border border-primary/20">
                        {item.label}
                      </span>
                    </div>
                  </div>
                </ScrollReveal>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* FEATURES — "Built for the Long Game"                             */}
      {/* ================================================================ */}
      <section id="features" className="border-t border-border scroll-mt-20">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <ScrollReveal animation="blur-in" once={false} className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Built for the Long Game
            </h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
              Everything a western big game hunter needs to plan across states
              and execute with discipline.
            </p>
          </ScrollReveal>

          <ScrollReveal animation="fade-up" stagger={80} once={false} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="relative flex flex-col p-5 rounded-xl bg-card border border-border transition-all duration-300 hover:scale-[1.05] hover:-translate-y-2 hover:z-10 hover:border-primary/30 hover:shadow-[0_16px_50px_oklch(0_0_0/0.4),0_0_25px_oklch(0.65_0.18_145/0.1)] h-full"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <feature.icon className="w-4.5 h-4.5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold mb-1.5">
                  {feature.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed flex-1">
                  {feature.description}
                </p>
              </div>
            ))}
          </ScrollReveal>
        </div>
      </section>

      {/* ================================================================ */}
      {/* TESTIMONIALS                                                      */}
      {/* ================================================================ */}
      <section
        id="testimonials"
        className="border-t border-border bg-card/50 scroll-mt-20"
      >
        <div className="max-w-5xl mx-auto px-6 py-20">
          <ScrollReveal animation="blur-in" once={false} className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Hunters Like You
            </h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
              Hear from hunters who stopped guessing and started strategizing.
            </p>
          </ScrollReveal>

          <ScrollReveal animation="scale-in" delay={100} once={false}>
            <TestimonialCarousel />
          </ScrollReveal>
        </div>
      </section>

      {/* ================================================================ */}
      {/* BOTTOM CTA — "Build Your Strategy."                              */}
      {/* ================================================================ */}
      <section className="border-t border-border relative overflow-hidden">
        <ParallaxImage
          src="/images/species/moose.jpg"
          alt=""
          className="opacity-50 pointer-events-none"
          speed={0.3}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/55 to-background pointer-events-none" />
        <div className="absolute inset-0 aurora-bg pointer-events-none opacity-50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/8 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative max-w-3xl mx-auto px-6 py-20 text-center">
          <ScrollReveal animation="fade-up" once={false}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Compass className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">
                Free forever — no credit card needed
              </span>
            </div>
          </ScrollReveal>

          <ScrollReveal animation="blur-in" delay={100} once={false}>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Build Your Strategy.
            </h2>
          </ScrollReveal>
          <ScrollReveal animation="fade-up" delay={200} once={false}>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
              15 states. 18 species. Every point dollar mapped. A plan that
              adapts to who you are.
            </p>
          </ScrollReveal>
          <ScrollReveal animation="fade-up" delay={300} once={false}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              <Link href="/auth/sign-up">
                <Button
                  size="lg"
                  className="gap-2 text-base px-8 glow-pulse shimmer-sweep"
                >
                  Build Your Strategy <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <GuestEntryButton />
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
