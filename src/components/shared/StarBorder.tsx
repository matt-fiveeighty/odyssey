"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface StarBorderProps {
  children: React.ReactNode;
  className?: string;
  /** CSS color for the border glow, e.g. "rgb(34, 197, 94)" */
  color?: string;
  /** Rotation speed in seconds */
  speed?: number;
}

/**
 * Wraps a button (or any element) with an animated gradient border
 * that rotates around the edges. Uses a conic-gradient on a real DOM
 * element with mask-composite to show only the border region.
 */
export function StarBorder({
  children,
  className,
  color = "rgb(34, 197, 94)",
  speed = 4,
}: StarBorderProps) {
  const borderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = borderRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let angle = 0;
    let raf: number;

    const tick = () => {
      angle = (angle + 360 / (speed * 60)) % 360;
      el.style.background = `conic-gradient(from ${angle}deg, transparent 0%, ${color} 10%, transparent 20%, transparent 50%, ${color} 60%, transparent 70%, transparent 100%)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [color, speed]);

  return (
    <div className={cn("star-border", className)}>
      <div ref={borderRef} className="star-border__ring" aria-hidden="true" />
      {children}
    </div>
  );
}
