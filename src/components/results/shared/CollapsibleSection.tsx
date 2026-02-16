"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface CollapsibleSectionProps {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  defaultOpen?: boolean;
  badge?: string;
  children: React.ReactNode;
}

export function CollapsibleSection({ title, icon: Icon, defaultOpen = false, badge, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors duration-200 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-primary" />}
          <span className="text-sm font-semibold">{title}</span>
          {badge && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium">{badge}</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <div
        className={`transition-all duration-300 ease-out overflow-hidden ${
          open ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="p-4 pt-0">{children}</div>
      </div>
    </div>
  );
}
