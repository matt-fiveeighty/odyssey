import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { GuestEntryButton } from "@/components/auth/GuestEntryButton";
import { TestimonialCarousel } from "@/components/marketing/TestimonialCarousel";
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
  Mountain,
  Compass,
  Shield,
  CheckCircle2,
  MapPin,
  Trophy,
  Users,
} from "lucide-react";

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
    value: "18 Species",
    detail: "Elk, mule deer, moose, grizzly, sheep, goat, bison, pronghorn, wolf, caribou, and more.",
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
    image: "/images/how-it-works/tell-us-about-you.png",
    imageAlt: "Hunt consultation species selection interface",
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
    image: "/images/how-it-works/receive-your-strategy.png",
    imageAlt: "Bull elk at golden hour on a mountain ridgeline",
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
    image: "/images/how-it-works/track-and-execute.png",
    imageAlt: "Hunter packing out an elk through mountain terrain",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* ================================================================ */}
      {/* HERO */}
      {/* ================================================================ */}
      <section className="relative overflow-hidden">
        <ParallaxImage
          src="/images/hero/tactical-map.jpg"
          alt=""
          className="opacity-45 pointer-events-none"
          speed={0.3}
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background pointer-events-none" />
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
                    fillColor="hsl(var(--primary) / 0.35)"
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
      {/* REASONS TO BELIEVE */}
      {/* ================================================================ */}
      <section className="border-t border-border bg-card/30">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <ScrollReveal animation="blur-in" once={false} className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Built for the Western Draw Game
            </h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
              One platform. Every state, species, and draw system — mapped to your strategy.
            </p>
          </ScrollReveal>

          <ScrollReveal animation="fade-up" stagger={100} once={false} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {rtbs.map((rtb) => (
              <div key={rtb.value} className="relative flex flex-col p-4 rounded-xl bg-background/50 border border-border transition-all duration-300 hover:scale-[1.06] hover:-translate-y-2 hover:z-10 hover:shadow-[0_16px_50px_oklch(0_0_0/0.4),0_0_25px_oklch(0.65_0.18_145/0.1)] hover:border-primary/30 h-full">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <rtb.icon className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <p className="text-sm font-bold text-foreground">
                    {rtb.value}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed flex-1">
                  {rtb.detail}
                </p>
              </div>
            ))}
          </ScrollReveal>
        </div>
      </section>

      {/* ================================================================ */}
      {/* APP SHOWCASE — Alternating layout */}
      {/* ================================================================ */}
      <section className="border-t border-border bg-card/50">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <ScrollReveal animation="blur-in" once={false} className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              See It In Action
            </h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
              From consultation to execution — here&apos;s what your experience
              looks like.
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
                {/* Text side — copy builds in, bullets stagger */}
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

                {/* Image side — slides in from the opposite direction */}
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
      {/* FEATURES */}
      {/* ================================================================ */}
      <section id="features" className="border-t border-border scroll-mt-20">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <ScrollReveal animation="blur-in" once={false} className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Everything You Need
            </h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
              Built for serious western hunters who treat their hunting like an
              investment portfolio.
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
      {/* TESTIMONIALS */}
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
      {/* BOTTOM CTA */}
      {/* ================================================================ */}
      <section className="border-t border-border relative overflow-hidden">
        <ParallaxImage
          src="/images/species/moose.png"
          alt=""
          className="opacity-20 pointer-events-none"
          speed={0.2}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/80 to-background pointer-events-none" />
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
              Your 10-Year Strategy Starts Now
            </h2>
          </ScrollReveal>
          <ScrollReveal animation="fade-up" delay={200} once={false}>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
              Run the strategic consultation in under 5 minutes. Get a
              personalized multi-year roadmap with state rankings, unit picks, cost
              breakdowns, and an action timeline.
            </p>
          </ScrollReveal>
          <ScrollReveal animation="fade-up" delay={300} once={false}>
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
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
