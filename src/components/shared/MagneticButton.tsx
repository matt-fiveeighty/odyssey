"use client";

import { useRef, useCallback, type ReactNode, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Magnetic Button — Premium CTA with cursor-tracking glow
//
// Desktop: When cursor enters within proximity, the button subtly
// shifts toward the cursor (max 3px) and a radial neon-green glow
// tracks the mouse position inside the button.
//
// Mobile: No magnetic effect. Standard press feedback.
// ============================================================================

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  /** Max pixel shift toward cursor (default: 3) */
  pull?: number;
  /** Disable magnetic effect entirely */
  disabled?: boolean;
  onClick?: () => void;
  href?: string;
  target?: string;
  rel?: string;
}

export function MagneticButton({
  children,
  className,
  pull = 3,
  disabled = false,
  onClick,
  href,
  target,
  rel,
}: MagneticButtonProps) {
  const ref = useRef<HTMLElement>(null);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (disabled || !ref.current) return;

      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Distance from cursor to button center
      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;

      // Normalize to pull amount (max 3px shift)
      const maxDist = Math.max(rect.width, rect.height) / 2;
      const magnetX = (deltaX / maxDist) * pull;
      const magnetY = (deltaY / maxDist) * pull;

      // Glow position as percentage within button
      const glowX = ((e.clientX - rect.left) / rect.width) * 100;
      const glowY = ((e.clientY - rect.top) / rect.height) * 100;

      ref.current.style.setProperty("--magnetic-x", `${magnetX}px`);
      ref.current.style.setProperty("--magnetic-y", `${magnetY}px`);
      ref.current.style.setProperty("--glow-x", `${glowX}%`);
      ref.current.style.setProperty("--glow-y", `${glowY}%`);
    },
    [pull, disabled],
  );

  const handleMouseLeave = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.setProperty("--magnetic-x", "0px");
    ref.current.style.setProperty("--magnetic-y", "0px");
    ref.current.style.setProperty("--glow-x", "50%");
    ref.current.style.setProperty("--glow-y", "50%");
  }, []);

  const Tag = href ? "a" : "button";
  const linkProps = href ? { href, target, rel } : {};

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={cn("magnetic-button relative overflow-hidden", className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      {...linkProps}
    >
      {/* Radial glow overlay — tracks cursor position */}
      <span className="magnetic-glow" aria-hidden="true" />
      {/* Button content */}
      <span className="relative z-10">{children}</span>
    </Tag>
  );
}
