"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

interface ParallaxImageProps {
  src: string;
  alt: string;
  className?: string;
  speed?: number; // Controls zoom intensity. 0.15 = subtle, 0.3 = noticeable.
  priority?: boolean;
}

export function ParallaxImage({
  src,
  alt,
  className = "",
  speed = 0.15,
  priority = false,
}: ParallaxImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    function handleScroll() {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const viewH = window.innerHeight;
      // progress: 0 when element enters viewport bottom, 1 when it exits top
      const progress = 1 - (rect.bottom / (viewH + rect.height));
      const clamped = Math.max(0, Math.min(1, progress));
      // Scale from 1.0 up to 1.0 + speed as user scrolls through
      setScale(1 + clamped * speed);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [speed]);

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      <Image
        src={src}
        alt={alt}
        fill
        className={`object-cover ${className}`}
        style={{
          transform: `scale(${scale})`,
          willChange: "transform",
        }}
        sizes="100vw"
        priority={priority}
      />
    </div>
  );
}
