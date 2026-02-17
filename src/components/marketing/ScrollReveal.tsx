"use client";

import { useEffect, useRef, useState } from "react";

type Animation = "fade-up" | "fade-left" | "fade-right" | "scale-in" | "blur-in";

interface ScrollRevealProps {
  children: React.ReactNode;
  animation?: Animation;
  delay?: number; // ms
  duration?: number; // ms
  threshold?: number; // 0-1
  className?: string;
  /** Stagger children — each child animates sequentially */
  stagger?: number; // ms between each child
  /** Once = true means it only animates once (default). false = re-animates when scrolled out and back. */
  once?: boolean;
}

const animationStyles: Record<Animation, { from: React.CSSProperties; to: React.CSSProperties }> = {
  "fade-up": {
    from: { opacity: 0, transform: "translateY(24px)" },
    to: { opacity: 1, transform: "translateY(0)" },
  },
  "fade-left": {
    from: { opacity: 0, transform: "translateX(-24px)" },
    to: { opacity: 1, transform: "translateX(0)" },
  },
  "fade-right": {
    from: { opacity: 0, transform: "translateX(24px)" },
    to: { opacity: 1, transform: "translateX(0)" },
  },
  "scale-in": {
    from: { opacity: 0, transform: "scale(0.92)" },
    to: { opacity: 1, transform: "scale(1)" },
  },
  "blur-in": {
    from: { opacity: 0, filter: "blur(8px)", transform: "translateY(8px)" },
    to: { opacity: 1, filter: "blur(0px)", transform: "translateY(0)" },
  },
};

export function ScrollReveal({
  children,
  animation = "fade-up",
  delay = 0,
  duration = 600,
  threshold = 0.15,
  className = "",
  stagger,
  once = true,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useRef(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const el = ref.current;
    if (!el) return;

    // For reduced motion users, use a zero-threshold observer so content
    // appears immediately when the element is first observed (no animation).
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once || reducedMotion.current) observer.unobserve(el);
        } else if (!once && !reducedMotion.current) {
          setIsVisible(false);
        }
      },
      reducedMotion.current
        ? { threshold: 0 }
        : { threshold, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, once]);

  const anim = animationStyles[animation];

  // Stagger mode — wrap each child with its own delay
  if (stagger !== undefined) {
    const childArray = Array.isArray(children) ? children : [children];
    return (
      <div ref={ref} className={className}>
        {childArray.map((child, i) => (
          <div
            key={i}
            style={{
              ...(isVisible ? anim.to : anim.from),
              transition: `all ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay + i * stagger}ms`,
              willChange: "transform, opacity",
            }}
          >
            {child}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...(isVisible ? anim.to : anim.from),
        transition: `all ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        willChange: "transform, opacity",
      }}
    >
      {children}
    </div>
  );
}
