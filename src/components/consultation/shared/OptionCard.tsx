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
      className={`relative text-left transition-all duration-200 cursor-pointer overflow-hidden ${
        compact ? "p-3 rounded-xl" : imageSrc ? "rounded-xl" : "p-5 rounded-xl"
      } border-2 ${
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/30 glow-primary"
          : "border-border hover:border-primary/30 hover:bg-secondary/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 active:scale-[0.98]"
      }`}
    >
      {/* Background image */}
      {imageSrc && (
        <>
          <div className="relative w-full aspect-[16/9]">
            <Image
              src={imageSrc}
              alt={imageAlt || title}
              fill
              className={`object-cover transition-transform duration-500 ${
                selected ? "scale-105" : "group-hover:scale-105"
              }`}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          </div>
          {selected && (
            <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <Check className="w-3 h-3 text-primary-foreground" />
            </div>
          )}
          <div className="relative px-4 pb-4 -mt-8 z-10">
            <h3 className="font-semibold text-sm">{title}</h3>
            {description && (
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{description}</p>
            )}
          </div>
        </>
      )}

      {/* Gradient background (no image) */}
      {!imageSrc && gradient && (
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-10`} />
      )}

      {/* Standard content (no image) */}
      {!imageSrc && (
        <div className="relative">
          {selected && (
            <div className="absolute top-0 right-0">
              <Check className="w-4 h-4 text-primary" />
            </div>
          )}
          {Icon && <Icon className={`${compact ? "w-5 h-5" : "w-7 h-7"} text-primary/70 mb-2`} />}
          <h3 className={`font-semibold ${compact ? "text-sm" : ""}`}>{title}</h3>
          {description && (
            <p className="text-muted-foreground mt-1 text-xs">{description}</p>
          )}
        </div>
      )}
    </button>
  );
}
