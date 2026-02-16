"use client";

import { Check } from "lucide-react";

interface OptionCardProps {
  selected: boolean;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  compact?: boolean;
  gradient?: string;
}

export function OptionCard({ selected, onClick, icon: Icon, title, description, compact, gradient }: OptionCardProps) {
  return (
    <button
      role="radio"
      aria-checked={selected}
      aria-label={title}
      onClick={onClick}
      className={`relative text-left transition-all duration-200 cursor-pointer ${
        compact ? "p-3 rounded-xl" : "p-5 rounded-xl"
      } border-2 ${
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/30 glow-primary"
          : "border-border hover:border-primary/30 hover:bg-secondary/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 active:scale-[0.98]"
      } ${gradient ? "overflow-hidden" : ""}`}
    >
      {gradient && (
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-10`} />
      )}
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
    </button>
  );
}
