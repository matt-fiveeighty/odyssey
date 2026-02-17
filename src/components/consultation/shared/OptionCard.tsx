"use client";

import { Check } from "lucide-react";
import Image from "next/image";

interface OptionCardProps {
  selected: boolean;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  compact?: boolean;
  gradient?: string;
  imageSrc?: string;
  imageAlt?: string;
}

export function OptionCard({ selected, onClick, icon: Icon, title, description, compact, gradient, imageSrc, imageAlt }: OptionCardProps) {
  return (
    <button
      role="radio"
      aria-checked={selected}
      aria-label={title}
      onClick={onClick}
      className={`group relative text-left transition-all duration-200 cursor-pointer overflow-hidden ${
        compact ? "p-3 rounded-xl" : "p-5 rounded-xl"
      } border-2 ${
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/30 glow-primary"
          : "border-border hover:border-primary/30 hover:bg-secondary/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 active:scale-[0.98]"
      }`}
    >
      {/* Background image (fills entire card behind content) */}
      {imageSrc && (
        <>
          <Image
            src={imageSrc}
            alt={imageAlt || title}
            fill
            className={`object-cover transition-transform duration-500 ${
              selected ? "scale-105 brightness-50" : "brightness-[0.35] group-hover:scale-105 group-hover:brightness-[0.45]"
            }`}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        </>
      )}

      {/* Gradient background (no image) */}
      {!imageSrc && gradient && (
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-10`} />
      )}

      {/* Content — always rendered the same way */}
      <div className="relative z-10">
        {selected && (
          <div className="absolute top-0 right-0">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
              imageSrc ? "bg-primary" : ""
            }`}>
              <Check className={`w-4 h-4 ${imageSrc ? "text-primary-foreground w-3 h-3" : "text-primary"}`} />
            </div>
          </div>
        )}
        {Icon && !imageSrc && <Icon className={`${compact ? "w-5 h-5" : "w-7 h-7"} text-primary/70 mb-2`} />}
        <h3 className={`font-semibold ${compact ? "text-sm" : ""} ${imageSrc ? "text-white" : ""}`}>
          {title}
        </h3>
        {description && (
          <p className={`mt-1 text-xs ${imageSrc ? "text-white/70" : "text-muted-foreground"}`}>
            {description}
          </p>
        )}
      </div>
    </button>
  );
}
