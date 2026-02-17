"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Jake M.",
    location: "Texas",
    quote:
      "I was throwing $400/yr at random states hoping to draw. Odyssey showed me I was wasting money in two states and missing a golden opportunity in a third. First year following the roadmap, I drew my first elk tag.",
    species: "Elk",
    experience: "3 years applying",
  },
  {
    name: "Ryan T.",
    location: "Missouri",
    quote:
      "The state scoring blew my mind. I had no idea how much my budget and fitness level should actually affect where I apply. This isn't just a point tracker — it's a real strategy.",
    species: "Mule Deer",
    experience: "First-time western hunter",
  },
  {
    name: "Chris D.",
    location: "Ohio",
    quote:
      "I've been building points in Colorado and Wyoming for 6 years with no real plan. The consultation told me exactly which units to target and when I'd realistically draw. Game changer.",
    species: "Elk & Mule Deer",
    experience: "6 years of points",
  },
  {
    name: "Mike S.",
    location: "Georgia",
    quote:
      "As a DIY backpack hunter on a budget, I needed something that understood my constraints. The roadmap gave me a realistic 10-year plan that doesn't break the bank.",
    species: "Elk",
    experience: "DIY backpack hunter",
  },
  {
    name: "Brandon L.",
    location: "Minnesota",
    quote:
      "The cost breakdown per state was eye-opening. I was spending way more than I needed to on states that weren't going to pay off for another decade. Reshuffled my whole approach.",
    species: "Moose & Elk",
    experience: "5 years applying",
  },
];

export function TestimonialCarousel() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % testimonials.length);
  }, []);

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + testimonials.length) % testimonials.length);
  }, []);

  // Auto-advance every 5 seconds
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [isPaused, next]);

  const t = testimonials[current];

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Card */}
      <div className="max-w-2xl mx-auto">
        <div className="p-8 rounded-2xl bg-card border border-border relative overflow-hidden">
          <Quote className="w-8 h-8 text-primary/20 absolute top-6 left-6" />

          <div className="relative">
            <p className="text-base md:text-lg text-foreground leading-relaxed pl-6 border-l-2 border-primary/30">
              &ldquo;{t.quote}&rdquo;
            </p>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
              <div>
                <p className="font-semibold text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.location}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {t.species}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {t.experience}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mt-6">
        <button
          onClick={prev}
          aria-label="Previous testimonial"
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Dots */}
        <div className="flex items-center gap-2">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Go to testimonial ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current
                  ? "w-6 bg-primary"
                  : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
            />
          ))}
        </div>

        <button
          onClick={next}
          aria-label="Next testimonial"
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
