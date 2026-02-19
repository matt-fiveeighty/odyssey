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
  // Image variant: photo card with bottom gradient overlay
  if (imageSrc) {
    return (
      <button
        role="radio"
        aria-checked={selected}
        aria-label={title}
        onClick={onClick}
        className={`group relative overflow-hidden rounded-xl text-left transition-all duration-200 cursor-pointer border-2 ${
          selected
            ? "border-primary ring-1 ring-primary/30 glow-primary"
            : "border-border hover:border-primary/50 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 active:scale-[0.98]"
        }`}
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <Image
            src={imageSrc}
            alt={imageAlt || title}
            fill
            className={`object-cover transition-transform duration-300 ${
              selected ? "scale-105" : "group-hover:scale-105"
            }`}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          {/* Subtle bottom gradient for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          {/* Check indicator */}
          {selected && (
            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <Check className="w-3 h-3 text-primary-foreground" />
            </div>
          )}
          {/* Text overlay pinned to bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <span className="text-sm font-semibold text-white block leading-tight">
              {title}
            </span>
            {description && (
              <span className="text-[10px] text-white/70 block mt-0.5 line-clamp-2">
                {description}
              </span>
            )}
          </div>
        </div>
      </button>
    );
  }

  // Non-image variant: icon/text card
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
      {/* Gradient background (no image) */}
      {gradient && (
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-10`} />
      )}

      <div className="relative z-10">
        {selected && (
          <div className="absolute top-0 right-0">
            <Check className="w-4 h-4 text-primary" />
          </div>
        )}
        {Icon && <Icon className={`${compact ? "w-5 h-5" : "w-7 h-7"} text-primary/70 mb-2`} />}
        <h3 className={`font-semibold ${compact ? "text-sm" : ""}`}>
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </button>
  );
}
