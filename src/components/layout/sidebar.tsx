"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calculator,
  Map,
  Compass,
  Wallet,
  Settings,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Search,
  DollarSign,
  Route,
  PieChart,
  RefreshCw,
  Calendar,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Logo } from "@/components/shared/Logo";

const navSections = [
  {
    label: "Strategy",
    items: [
      { href: "/roadmap", label: "Roadmap", icon: Route },
      { href: "/portfolio", label: "Portfolio", icon: PieChart },
      { href: "/rebalance", label: "Rebalance", icon: RefreshCw },
    ],
  },
  {
    label: "Execution",
    items: [
      { href: "/this-year", label: "Planner", icon: Compass },
      { href: "/deadlines", label: "Deadlines", icon: Calendar },
      { href: "/groups", label: "Hunt Plans", icon: Users },
    ],
  },
  {
    label: "Capital",
    items: [
      { href: "/points", label: "Points", icon: Wallet },
      { href: "/budget", label: "Budget", icon: DollarSign },
    ],
  },
  {
    label: "Research",
    items: [
      { href: "/units", label: "Units", icon: Map },
      { href: "/odds", label: "Odds", icon: Search },
      { href: "/calculator", label: "Calculator", icon: Calculator },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border hover:bg-sidebar-accent/50 transition-colors">
        <Logo size={28} className="text-primary shrink-0 drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]" />
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground">
              Odyssey Outdoors
            </span>
            <span className="text-[10px] text-muted-foreground">
              Strategic Portfolio
            </span>
          </div>
        )}
      </Link>

      {/* Navigation */}
      <nav aria-label="Main navigation" className="flex-1 flex flex-col gap-1 p-2 mt-2 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label} className="mb-3">
            {!collapsed && (
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">
                {section.label}
              </p>
            )}
            {section.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={collapsed ? item.label : undefined}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <item.icon
                    className={cn("w-5 h-5 shrink-0", isActive && "text-primary")}
                  />
                  {!collapsed && <span>{item.label}</span>}
                  {isActive && !collapsed && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
        {/* Settings at bottom */}
        <div className="mt-auto">
          <Link
            href="/settings"
            aria-label={collapsed ? "Settings" : undefined}
            aria-current={pathname === "/settings" ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              pathname === "/settings"
                ? "bg-primary/15 text-primary"
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            )}
          >
            <Settings className={cn("w-5 h-5 shrink-0", pathname === "/settings" && "text-primary")} />
            {!collapsed && <span>Settings</span>}
          </Link>
        </div>
      </nav>

      {/* Quick Links */}
      {!collapsed && (
        <div className="p-3 mx-2 mb-2 rounded-lg bg-sidebar-accent/50">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Quick Links
          </p>
          <div className="flex flex-col gap-1">
            <a
              href="https://cpw.state.co.us"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="CO Fish & Game (opens in new tab)"
              className="flex items-center gap-2 text-xs text-sidebar-foreground/60 hover:text-primary transition-colors"
            >
              <span>CO Fish & Game</span>
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
            <a
              href="https://wgfd.wyo.gov"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WY Game & Fish (opens in new tab)"
              className="flex items-center gap-2 text-xs text-sidebar-foreground/60 hover:text-primary transition-colors"
            >
              <span>WY Game & Fish</span>
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
            <a
              href="https://fwp.mt.gov"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="MT Fish & Wildlife (opens in new tab)"
              className="flex items-center gap-2 text-xs text-sidebar-foreground/60 hover:text-primary transition-colors"
            >
              <span>MT Fish & Wildlife</span>
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="flex items-center justify-center h-10 border-t border-sidebar-border text-muted-foreground hover:text-sidebar-foreground transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </aside>
  );
}
