"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

interface MagicCardOptions {
  /** 3D tilt on hover (default true) */
  tilt?: boolean;
  /** Click ripple effect (default true) */
  ripple?: boolean;
  /** Subtle pull toward cursor (default false) */
  magnetism?: boolean;
  /** Floating particle dots on hover (default false) */
  particles?: boolean;
  particleCount?: number;
  /** Master kill switch */
  disabled?: boolean;
}

const DEFAULT_PARTICLE_RGB = "34, 197, 94";

/** Read data-glow-color from the element, fallback to default green */
function getCardRGB(el: HTMLElement): string {
  return (el as HTMLElement).dataset?.glowColor || DEFAULT_PARTICLE_RGB;
}

/**
 * Adds interactive magic effects (tilt, ripple, magnetism, particles)
 * to a card element ref. Works with the .magic-card CSS class for
 * border glow, but the interactive JS effects are independent.
 *
 * Reads `data-glow-color="R, G, B"` from the element for color matching.
 */
export function useMagicCard(
  ref: React.RefObject<HTMLElement | null>,
  opts: MagicCardOptions = {},
) {
  const {
    tilt = true,
    ripple = true,
    magnetism = false,
    particles = false,
    particleCount = 8,
    disabled = false,
  } = opts;

  const liveParticles = useRef<HTMLElement[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hovered = useRef(false);
  const magnetTween = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    if (disabled || !ref.current) return;

    // Respect preferences
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(hover: none)").matches) return;

    const el = ref.current;

    /* ---------- particles ---------- */
    const spawnParticles = () => {
      const { width, height } = el.getBoundingClientRect();
      const rgb = getCardRGB(el);
      for (let i = 0; i < particleCount; i++) {
        const tid = setTimeout(() => {
          if (!hovered.current) return;
          const p = document.createElement("div");
          p.setAttribute("aria-hidden", "true");
          p.style.cssText = `
            position:absolute;width:3px;height:3px;border-radius:50%;
            background:rgba(${rgb},0.8);
            box-shadow:0 0 6px rgba(${rgb},0.4);
            pointer-events:none;z-index:100;
            left:${Math.random() * width}px;top:${Math.random() * height}px;
          `;
          el.appendChild(p);
          liveParticles.current.push(p);
          gsap.fromTo(p, { scale: 0, opacity: 0 }, { scale: 1, opacity: 0.8, duration: 0.3, ease: "back.out(1.7)" });
          gsap.to(p, {
            x: (Math.random() - 0.5) * 80,
            y: (Math.random() - 0.5) * 80,
            duration: 2 + Math.random() * 2,
            ease: "none",
            repeat: -1,
            yoyo: true,
          });
          gsap.to(p, { opacity: 0.2, duration: 1.5, ease: "power2.inOut", repeat: -1, yoyo: true });
        }, i * 80);
        timers.current.push(tid);
      }
    };

    const clearParticles = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      liveParticles.current.forEach((p) => {
        gsap.killTweensOf(p);
        gsap.to(p, { scale: 0, opacity: 0, duration: 0.25, ease: "back.in(1.7)", onComplete: () => p.remove() });
      });
      liveParticles.current = [];
    };

    /* ---------- event handlers ---------- */
    const onEnter = () => {
      hovered.current = true;
      if (particles) spawnParticles();
    };

    const onLeave = () => {
      hovered.current = false;
      clearParticles();
      if (tilt) gsap.to(el, { rotateX: 0, rotateY: 0, duration: 0.3, ease: "power2.out" });
      if (magnetism) {
        magnetTween.current?.kill();
        gsap.to(el, { x: 0, y: 0, duration: 0.3, ease: "power2.out" });
      }
    };

    const onMove = (e: MouseEvent) => {
      if (!tilt && !magnetism) return;
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const cx = r.width / 2;
      const cy = r.height / 2;

      if (tilt) {
        gsap.to(el, {
          rotateX: ((y - cy) / cy) * -8,
          rotateY: ((x - cx) / cx) * 8,
          duration: 0.1,
          ease: "power2.out",
          transformPerspective: 1000,
        });
      }
      if (magnetism) {
        magnetTween.current = gsap.to(el, {
          x: (x - cx) * 0.04,
          y: (y - cy) * 0.04,
          duration: 0.3,
          ease: "power2.out",
        });
      }
    };

    const onClick = (e: MouseEvent) => {
      if (!ripple) return;
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const maxD = Math.max(
        Math.hypot(x, y),
        Math.hypot(x - r.width, y),
        Math.hypot(x, y - r.height),
        Math.hypot(x - r.width, y - r.height),
      );

      const rgb = getCardRGB(el);
      const rip = document.createElement("div");
      rip.setAttribute("aria-hidden", "true");
      rip.style.cssText = `
        position:absolute;width:${maxD * 2}px;height:${maxD * 2}px;border-radius:50%;
        background:radial-gradient(circle,rgba(${rgb},0.25) 0%,rgba(${rgb},0.1) 30%,transparent 70%);
        left:${x - maxD}px;top:${y - maxD}px;pointer-events:none;z-index:100;
      `;
      el.appendChild(rip);
      gsap.fromTo(rip, { scale: 0, opacity: 1 }, { scale: 1, opacity: 0, duration: 0.8, ease: "power2.out", onComplete: () => rip.remove() });
    };

    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    el.addEventListener("mousemove", onMove);
    el.addEventListener("click", onClick);

    return () => {
      hovered.current = false;
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("click", onClick);
      clearParticles();
    };
  }, [ref, tilt, ripple, magnetism, particles, particleCount, disabled]);
}
