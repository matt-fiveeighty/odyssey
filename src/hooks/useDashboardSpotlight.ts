"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

const SPOTLIGHT_SIZE = 800;
const SPOTLIGHT_RADIUS = 300;
const DEFAULT_GLOW_RGB = "34, 197, 94"; // fallback green

/**
 * Attaches a global cursor-tracking spotlight to a container.
 * Creates a per-card border-glow overlay (real DOM element, not pseudo)
 * that lights up as the cursor approaches each `.magic-card` child.
 *
 * Each card can set `data-glow-color="R, G, B"` to control its glow color.
 * The ambient spotlight blends to match the nearest card's color.
 */
export function useDashboardSpotlight(
  containerRef: React.RefObject<HTMLDivElement | null>,
  enabled = true,
) {
  const spotlightRef = useRef<HTMLDivElement | null>(null);
  const glowEls = useRef<Map<HTMLElement, HTMLDivElement>>(new Map());
  const currentSpotlightRGB = useRef<[number, number, number]>([34, 197, 94]);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    // Respect reduced-motion preference
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Skip on touch-only devices
    if (window.matchMedia("(hover: none)").matches) return;

    // Create the ambient spotlight element
    const spotlight = document.createElement("div");
    spotlight.setAttribute("aria-hidden", "true");
    spotlight.style.cssText = `
      position: fixed;
      width: ${SPOTLIGHT_SIZE}px;
      height: ${SPOTLIGHT_SIZE}px;
      border-radius: 50%;
      pointer-events: none;
      background: radial-gradient(circle,
        rgba(${DEFAULT_GLOW_RGB}, 0.12) 0%,
        rgba(${DEFAULT_GLOW_RGB}, 0.06) 15%,
        rgba(${DEFAULT_GLOW_RGB}, 0.03) 25%,
        rgba(${DEFAULT_GLOW_RGB}, 0.015) 40%,
        rgba(${DEFAULT_GLOW_RGB}, 0.008) 65%,
        transparent 70%
      );
      z-index: 50;
      opacity: 0;
      transform: translate(-50%, -50%);
      mix-blend-mode: screen;
      will-change: transform, opacity;
    `;
    document.body.appendChild(spotlight);
    spotlightRef.current = spotlight;

    const proximity = SPOTLIGHT_RADIUS * 0.5;
    const fadeDistance = SPOTLIGHT_RADIUS * 0.75;

    /** Parse "R, G, B" → [R, G, B] */
    function parseRGB(str: string): [number, number, number] {
      const parts = str.split(",").map((s) => parseInt(s.trim(), 10));
      if (parts.length >= 3 && parts.every((n) => !isNaN(n))) {
        return [parts[0], parts[1], parts[2]];
      }
      return [34, 197, 94]; // fallback
    }

    /** Lerp a single channel */
    function lerp(a: number, b: number, t: number): number {
      return a + (b - a) * t;
    }

    /** Update the ambient spotlight gradient with an RGB color */
    function setSpotlightColor(rgb: string) {
      if (!spotlightRef.current) return;
      spotlightRef.current.style.background = `radial-gradient(circle,
        rgba(${rgb}, 0.12) 0%,
        rgba(${rgb}, 0.06) 15%,
        rgba(${rgb}, 0.03) 25%,
        rgba(${rgb}, 0.015) 40%,
        rgba(${rgb}, 0.008) 65%,
        transparent 70%
      )`;
    }

    /** Ensure a glow border element exists for a card */
    function ensureGlow(card: HTMLElement): HTMLDivElement {
      let el = glowEls.current.get(card);
      if (el) return el;

      el = document.createElement("div");
      el.setAttribute("aria-hidden", "true");
      el.style.cssText = `
        position: absolute;
        inset: 0;
        padding: 4px;
        border-radius: inherit;
        pointer-events: none;
        z-index: 1;
        opacity: 0;
        transition: opacity 0.15s ease;
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        mask-composite: exclude;
      `;
      card.appendChild(el);
      glowEls.current.set(card, el);
      return el;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container || !spotlightRef.current) return;

      const rect = container.getBoundingClientRect();
      const inside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      const cards = container.querySelectorAll<HTMLElement>(".magic-card");

      if (!inside) {
        gsap.to(spotlightRef.current, { opacity: 0, duration: 0.3, ease: "power2.out" });
        glowEls.current.forEach((el) => { el.style.opacity = "0"; });
        return;
      }

      let minDistance = Infinity;
      let closestRGB: [number, number, number] = [34, 197, 94];

      cards.forEach((card) => {
        const cr = card.getBoundingClientRect();
        const cx = cr.left + cr.width / 2;
        const cy = cr.top + cr.height / 2;
        const dist =
          Math.hypot(e.clientX - cx, e.clientY - cy) -
          Math.max(cr.width, cr.height) / 2;
        const eff = Math.max(0, dist);

        // Track closest card for spotlight color
        if (eff < minDistance) {
          minDistance = eff;
          closestRGB = parseRGB(card.dataset.glowColor || DEFAULT_GLOW_RGB);
        }

        let intensity = 0;
        if (eff <= proximity) intensity = 1;
        else if (eff <= fadeDistance)
          intensity = (fadeDistance - eff) / (fadeDistance - proximity);

        // Use this card's own color for its glow border
        const cardColor = card.dataset.glowColor || DEFAULT_GLOW_RGB;
        const glowEl = ensureGlow(card);
        const relX = ((e.clientX - cr.left) / cr.width) * 100;
        const relY = ((e.clientY - cr.top) / cr.height) * 100;
        glowEl.style.background = `radial-gradient(${SPOTLIGHT_RADIUS}px circle at ${relX}% ${relY}%, rgba(${cardColor}, 0.6) 0%, rgba(${cardColor}, 0.3) 30%, transparent 60%)`;
        glowEl.style.opacity = intensity.toString();
      });

      // Smoothly interpolate the spotlight color toward the closest card
      const lerpSpeed = 0.15;
      const cur = currentSpotlightRGB.current;
      const newR = Math.round(lerp(cur[0], closestRGB[0], lerpSpeed));
      const newG = Math.round(lerp(cur[1], closestRGB[1], lerpSpeed));
      const newB = Math.round(lerp(cur[2], closestRGB[2], lerpSpeed));
      currentSpotlightRGB.current = [newR, newG, newB];
      setSpotlightColor(`${newR}, ${newG}, ${newB}`);

      // Position the spotlight circle
      gsap.to(spotlightRef.current, {
        left: e.clientX,
        top: e.clientY,
        duration: 0.1,
        ease: "power2.out",
      });

      const targetOpacity =
        minDistance <= proximity
          ? 0.7
          : minDistance <= fadeDistance
            ? ((fadeDistance - minDistance) / (fadeDistance - proximity)) * 0.7
            : 0;

      gsap.to(spotlightRef.current, {
        opacity: targetOpacity,
        duration: targetOpacity > 0 ? 0.2 : 0.5,
        ease: "power2.out",
      });
    };

    const handleMouseLeave = () => {
      glowEls.current.forEach((el) => { el.style.opacity = "0"; });
      if (spotlightRef.current) {
        gsap.to(spotlightRef.current, { opacity: 0, duration: 0.3, ease: "power2.out" });
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      spotlightRef.current?.remove();
      spotlightRef.current = null;
      // Clean up glow elements
      glowEls.current.forEach((el) => el.remove());
      glowEls.current.clear();
    };
  }, [containerRef, enabled]);
}
