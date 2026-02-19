"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Compass,
  Target,
  Wallet,
  Map,
  MoreHorizontal,
  Calculator,
  Search,
  DollarSign,
  Users,
  Route,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const primaryItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/planner", label: "Planner", icon: Compass },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/points", label: "Points", icon: Wallet },
  { href: "/units", label: "Units", icon: Map },
];

const moreItems = [
  { href: "/opportunity-finder", label: "Opportunities", icon: Search },
  { href: "/calculator", label: "Calculator", icon: Calculator },
  { href: "/journey", label: "Journey Map", icon: Route },
  { href: "/budget", label: "Budget", icon: DollarSign },
  { href: "/groups", label: "Groups", icon: Users },
  { href: "/plan-builder", label: "Plan Builder", icon: Compass },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  // Check if a "more" item is active
  const moreIsActive = moreItems.some((item) => pathname === item.href);

  return (
    <>
      {/* More drawer overlay */}
      {showMore && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowMore(false)}
            role="presentation"
          />
          <div className="absolute bottom-16 left-0 right-0 bg-background border-t border-border rounded-t-2xl p-4 shadow-2xl fade-in-up">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">More</p>
              <button
                onClick={() => setShowMore(false)}
                aria-label="Close menu"
                className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {moreItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-[10px] font-medium text-center leading-tight">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-md"
      >
        <div className="flex items-center justify-around h-16 px-2">
          {primaryItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
          {/* More button */}
          <button
            onClick={() => setShowMore((v) => !v)}
            aria-label="More options"
            className={cn(
              "flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-colors",
              moreIsActive || showMore
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
