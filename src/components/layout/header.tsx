"use client";

import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/calculator": "Calculator",
  "/units": "Units",
  "/goals": "Goals",
  "/plan-builder": "Plan Builder",
  "/points": "Points",
};

export function Header() {
  const pathname = usePathname();
  const pageTitle = pageTitles[pathname] ?? "Hunt Planner";

  return (
    <header className="flex items-center justify-between h-16 px-6 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="flex items-center gap-4 flex-1">
        {/* Mobile brand header */}
        <div className="md:hidden flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center">
            HP
          </div>
          <span className="text-sm font-semibold">Hunt Planner</span>
        </div>
        {/* Desktop breadcrumb / page title */}
        <div className="hidden md:flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Hunt Planner</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
          <span className="font-medium text-foreground">{pageTitle}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
          <span className="text-xs font-semibold text-primary">U</span>
        </div>
      </div>
    </header>
  );
}
