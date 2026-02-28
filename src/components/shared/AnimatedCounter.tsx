"use client";

import { useEffect, useRef, useMemo } from "react";
import { gsap } from "gsap";
import { cn } from "@/lib/utils";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
// Three repetitions — column rolls through ~20 digits before landing
const STRIP = [...DIGITS, ...DIGITS, ...DIGITS];
const LAND_AT = 20; // Target digit in the third repetition

interface AnimatedCounterProps {
  value: number;
  /** Animation duration in ms (default: 800) */
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  /** Apply monospace tabular-nums financial styling (default: true) */
  financial?: boolean;
  /** Decimal places for formatting (default: 0) */
  decimals?: number;
  /** Zero-pad the formatted string to this length (e.g., 2 → "04") */
  padStart?: number;
  /** Use locale formatting with commas (default: true). Set false for years. */
  locale?: boolean;
}

export function AnimatedCounter({
  value,
  duration = 800,
  prefix = "",
  suffix = "",
  className,
  financial = true,
  decimals = 0,
  padStart,
  locale = true,
}: AnimatedCounterProps) {
  const containerRef = useRef<HTMLSpanElement>(null);

  // Format number to string
  const formatted = useMemo(() => {
    let str: string;
    if (!locale) {
      str = decimals > 0 ? value.toFixed(decimals) : value.toString();
    } else {
      str =
        decimals > 0
          ? value.toLocaleString("en-US", {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            })
          : value.toLocaleString();
    }
    if (padStart && str.length < padStart) {
      str = str.padStart(padStart, "0");
    }
    return str;
  }, [value, decimals, padStart, locale]);

  // Split into characters, classify digit vs separator
  const chars = useMemo(
    () =>
      formatted.split("").map((ch) => ({
        char: ch,
        isDigit: /^[0-9]$/.test(ch),
      })),
    [formatted],
  );

  // Animate digit columns on value change
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const strips = container.querySelectorAll<HTMLElement>(".sc-strip");
    const durationSec = duration / 1000;

    strips.forEach((strip, i) => {
      const target = parseInt(strip.dataset.target ?? "0");
      const firstChild = strip.children[0] as HTMLElement | undefined;
      if (!firstChild) return;
      const itemH = firstChild.offsetHeight;
      if (itemH === 0) return;

      const finalY = -(LAND_AT + target) * itemH;

      if (reducedMotion) {
        gsap.set(strip, { y: finalY });
        return;
      }

      // Start near the top with slight random variation
      const startY = -(Math.floor(Math.random() * 4)) * itemH;

      gsap.fromTo(
        strip,
        { y: startY },
        {
          y: finalY,
          duration: durationSec + i * 0.07,
          ease: "power3.out",
          delay: i * 0.05,
        },
      );
    });
  }, [formatted, duration]);

  return (
    <span
      ref={containerRef}
      className={cn(
        "sc-counter inline-flex items-baseline",
        financial && "font-financial",
        className,
      )}
    >
      {prefix && <span>{prefix}</span>}
      <span className="inline-flex" style={{ lineHeight: 1 }}>
        {chars.map((c, i) =>
          c.isDigit ? (
            <span
              key={`${i}-${formatted.length}`}
              className="sc-col"
            >
              <span
                className="sc-strip"
                data-target={c.char}
              >
                {STRIP.map((d, j) => (
                  <span key={j} className="sc-num">
                    {d}
                  </span>
                ))}
              </span>
            </span>
          ) : (
            <span
              key={`${i}-s`}
              className={c.char === "," ? "sc-comma" : undefined}
            >
              {c.char}
            </span>
          ),
        )}
      </span>
      {suffix && <span>{suffix}</span>}
    </span>
  );
}
