"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  /** Apply monospace tabular-nums financial styling (default: true) */
  financial?: boolean;
  /** Decimal places for formatting (default: 0) */
  decimals?: number;
}

export function AnimatedCounter({
  value,
  duration = 800,
  prefix = "",
  suffix = "",
  className,
  financial = true,
  decimals = 0,
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(0);
  const [landed, setLanded] = useState(false);
  const prevValue = useRef(0);
  const rafId = useRef<number>(0);
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const start = prevValue.current;
    const end = value;
    const diff = end - start;
    if (diff === 0) return;

    setLanded(false);
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic — directive-specified bezier
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + diff * eased;
      setDisplay(decimals > 0 ? parseFloat(current.toFixed(decimals)) : Math.round(current));

      if (progress < 1) {
        rafId.current = requestAnimationFrame(tick);
      } else {
        prevValue.current = end;
        // Trigger the "tick-land" spring pulse when counter reaches final value
        setLanded(true);
      }
    }

    rafId.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId.current);
  }, [value, duration, decimals]);

  // Clear the landed class after the animation plays
  useEffect(() => {
    if (!landed) return;
    const timer = setTimeout(() => setLanded(false), 300);
    return () => clearTimeout(timer);
  }, [landed]);

  const formatted = decimals > 0
    ? display.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : display.toLocaleString();

  return (
    <span
      ref={spanRef}
      className={cn(
        financial && "font-financial",
        landed && "tick-land",
        className,
      )}
    >
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
