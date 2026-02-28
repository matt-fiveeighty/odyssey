"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { gsap } from "gsap";
import {
  Calculator,
  Map,
  Compass,
  Wallet,
  Settings,
  Shield,
  ExternalLink,
  Search,
  DollarSign,
  Route,
  PieChart,
  RefreshCw,
  Calendar,
  Users,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  {
    label: "Admin",
    items: [
      { href: "/admin", label: "Data Airlock", icon: Shield },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const prelayer1Ref = useRef<HTMLDivElement>(null);
  const prelayer2Ref = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── Open animation ──
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    const pre1 = prelayer1Ref.current;
    const pre2 = prelayer2Ref.current;
    if (!panel || !backdrop) return;

    const items = panel.querySelectorAll<HTMLElement>(".sp-item");
    const headers = panel.querySelectorAll<HTMLElement>(".sp-header");
    const brand = panel.querySelector<HTMLElement>(".sp-brand");

    if (reducedMotion) {
      gsap.set([panel, pre1, pre2].filter(Boolean), { x: 0 });
      gsap.set(backdrop, { opacity: 1 });
      gsap.set(items, { y: "0%", rotateX: 0, opacity: 1 });
      gsap.set(headers, { y: "0%", opacity: 1 });
      if (brand) gsap.set(brand, { y: 0, opacity: 1 });
      return;
    }

    const tl = gsap.timeline();
    tlRef.current = tl;

    // 1. Backdrop — soft fade
    tl.fromTo(
      backdrop,
      { opacity: 0 },
      { opacity: 1, duration: 0.4, ease: "power2.out" },
      0,
    );

    // 2. Prelayers cascade — colored layers fan open ahead of panel
    if (pre1) {
      tl.fromTo(
        pre1,
        { x: -280, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, ease: "power4.out" },
        0.02,
      );
    }
    if (pre2) {
      tl.fromTo(
        pre2,
        { x: -280, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, ease: "power4.out" },
        0.08,
      );
    }

    // 3. Main panel slides in
    tl.fromTo(
      panel,
      { x: -280 },
      { x: 0, duration: 0.55, ease: "power4.out" },
      0.12,
    );

    // 4. Brand header — slide down + fade
    if (brand) {
      tl.fromTo(
        brand,
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: "power3.out" },
        0.32,
      );
    }

    // 5. Section headers — clip-reveal from below
    tl.fromTo(
      headers,
      { y: "100%", opacity: 0 },
      {
        y: "0%",
        opacity: 1,
        duration: 0.4,
        ease: "power3.out",
        stagger: 0.05,
      },
      0.36,
    );

    // 6. Nav items — clip-reveal with perspective flip from bottom
    tl.fromTo(
      items,
      { y: "115%", rotateX: -12, opacity: 0 },
      {
        y: "0%",
        rotateX: 0,
        opacity: 1,
        duration: 0.5,
        ease: "power3.out",
        stagger: 0.04,
        transformOrigin: "50% 100%",
        transformPerspective: 600,
      },
      0.4,
    );
  }, [open, reducedMotion]);

  // ── Close animation ──
  const close = useCallback(() => {
    if (!open) return;
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    const pre1 = prelayer1Ref.current;
    const pre2 = prelayer2Ref.current;
    if (!panel || !backdrop) {
      setOpen(false);
      return;
    }

    tlRef.current?.kill();

    if (reducedMotion) {
      setOpen(false);
      return;
    }

    const tl = gsap.timeline({
      onComplete: () => setOpen(false),
    });

    const items = panel.querySelectorAll<HTMLElement>(".sp-item");
    const headers = panel.querySelectorAll<HTMLElement>(".sp-header");
    const brand = panel.querySelector<HTMLElement>(".sp-brand");

    // 1. Items clip out upward with reverse rotation
    tl.to(
      items,
      {
        y: "-115%",
        rotateX: 8,
        opacity: 0,
        duration: 0.28,
        ease: "power3.in",
        stagger: 0.02,
        transformOrigin: "50% 0%",
        transformPerspective: 600,
      },
      0,
    );

    // 2. Headers clip out
    tl.to(
      headers,
      {
        y: "-100%",
        opacity: 0,
        duration: 0.22,
        ease: "power3.in",
        stagger: 0.02,
      },
      0,
    );

    // 3. Brand fades up
    if (brand) {
      tl.to(
        brand,
        { y: -12, opacity: 0, duration: 0.2, ease: "power2.in" },
        0.04,
      );
    }

    // 4. Panel slides left
    tl.to(
      panel,
      { x: -280, duration: 0.38, ease: "power4.in" },
      0.12,
    );

    // 5. Prelayers cascade out (reverse order)
    if (pre2) {
      tl.to(
        pre2,
        { x: -280, opacity: 0, duration: 0.32, ease: "power4.in" },
        0.15,
      );
    }
    if (pre1) {
      tl.to(
        pre1,
        { x: -280, opacity: 0, duration: 0.32, ease: "power4.in" },
        0.19,
      );
    }

    // 6. Backdrop fades
    tl.to(
      backdrop,
      { opacity: 0, duration: 0.28, ease: "power2.in" },
      0.16,
    );
  }, [open, reducedMotion]);

  // ── Escape key ──
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  // ── Close on navigation ──
  useEffect(() => {
    if (open) setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {/* ─── Icon Rail (always visible on desktop) ─── */}
      <aside className="hidden md:flex flex-col w-16 border-r border-sidebar-border bg-sidebar shrink-0">
        {/* Toggle */}
        <button
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          aria-expanded={open}
          className="flex items-center justify-center h-16 border-b border-sidebar-border text-sidebar-foreground/70 hover:text-primary hover:bg-sidebar-accent/50 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Icon links */}
        <nav aria-label="Main navigation" className="flex-1 flex flex-col gap-1 p-2 mt-1 overflow-y-auto">
          {navSections.flatMap((section) =>
            section.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center justify-center w-full py-2.5 rounded-lg transition-all duration-200",
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                  )}
                >
                  <item.icon className="w-5 h-5" />
                </Link>
              );
            }),
          )}

          {/* Settings at bottom */}
          <div className="mt-auto">
            <Link
              href="/settings"
              aria-label="Settings"
              aria-current={pathname === "/settings" ? "page" : undefined}
              className={cn(
                "flex items-center justify-center w-full py-2.5 rounded-lg transition-all duration-200",
                pathname === "/settings"
                  ? "bg-primary/15 text-primary"
                  : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent",
              )}
            >
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        </nav>
      </aside>

      {/* ─── Slide-Out Panel Overlay ─── */}
      {open && (
        <div className="hidden md:block fixed inset-0 z-40">
          {/* Backdrop */}
          <div
            ref={backdropRef}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={close}
            aria-hidden="true"
          />

          {/* Prelayer 1 — deeper cascade layer */}
          <div
            ref={prelayer1Ref}
            className="absolute left-16 top-0 bottom-0 w-64 pointer-events-none"
            style={{
              willChange: "transform",
              background: "oklch(0.14 0.01 260 / 0.95)",
            }}
            aria-hidden="true"
          />

          {/* Prelayer 2 — primary-tinted cascade layer */}
          <div
            ref={prelayer2Ref}
            className="absolute left-16 top-0 bottom-0 w-64 pointer-events-none"
            style={{
              willChange: "transform",
              background: "oklch(0.12 0.02 145 / 0.85)",
            }}
            aria-hidden="true"
          />

          {/* Panel */}
          <div
            ref={panelRef}
            className="absolute left-16 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border flex flex-col overflow-hidden"
            style={{ willChange: "transform" }}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation panel"
          >
            {/* Panel header */}
            <div className="sp-brand flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
              <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity" onClick={close}>
                <Logo size={24} className="text-primary shrink-0 drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]" />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-sidebar-foreground">Odyssey Outdoors</span>
                  <span className="text-[10px] text-muted-foreground">Strategic Portfolio</span>
                </div>
              </Link>
              <button
                onClick={close}
                aria-label="Close navigation"
                className="flex items-center justify-center w-8 h-8 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Panel nav */}
            <nav className="flex-1 flex flex-col gap-1 p-3 overflow-y-auto">
              {navSections.map((section) => (
                <div key={section.label} className="mb-2">
                  {/* Clip wrapper for section header */}
                  <div className="overflow-hidden">
                    <p
                      className="sp-header text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1"
                      style={{ willChange: "transform" }}
                    >
                      {section.label}
                    </p>
                  </div>
                  {section.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      /* Clip wrapper — hides item during translate */
                      <div key={item.href} className="overflow-hidden" style={{ perspective: "600px" }}>
                        <Link
                          href={item.href}
                          aria-current={isActive ? "page" : undefined}
                          onClick={close}
                          className={cn(
                            "sp-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-[background-color,color] duration-200",
                            isActive
                              ? "bg-primary/15 text-primary"
                              : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                          )}
                          style={{ willChange: "transform", transformOrigin: "50% 100%" }}
                        >
                          <item.icon className={cn("w-5 h-5 shrink-0", isActive && "text-primary")} />
                          <span>{item.label}</span>
                          {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                        </Link>
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Settings */}
              <div className="mt-auto">
                <div className="overflow-hidden" style={{ perspective: "600px" }}>
                  <Link
                    href="/settings"
                    onClick={close}
                    aria-current={pathname === "/settings" ? "page" : undefined}
                    className={cn(
                      "sp-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-[background-color,color] duration-200",
                      pathname === "/settings"
                        ? "bg-primary/15 text-primary"
                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                    )}
                    style={{ willChange: "transform", transformOrigin: "50% 100%" }}
                  >
                    <Settings className={cn("w-5 h-5 shrink-0", pathname === "/settings" && "text-primary")} />
                    <span>Settings</span>
                  </Link>
                </div>
              </div>
            </nav>

            {/* Quick Links */}
            <div className="overflow-hidden mx-2 mb-2" style={{ perspective: "600px" }}>
              <div
                className="sp-item p-3 rounded-lg bg-sidebar-accent/50"
                style={{ willChange: "transform", transformOrigin: "50% 100%" }}
              >
                <p
                  className="sp-header text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2"
                  style={{ willChange: "transform" }}
                >
                  Quick Links
                </p>
                <div className="flex flex-col gap-1">
                  {[
                    { label: "CO Fish & Game", href: "https://cpw.state.co.us" },
                    { label: "WY Game & Fish", href: "https://wgfd.wyo.gov" },
                    { label: "MT Fish & Wildlife", href: "https://fwp.mt.gov" },
                  ].map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${link.label} (opens in new tab)`}
                      className="flex items-center gap-2 text-xs text-sidebar-foreground/60 hover:text-primary transition-colors"
                    >
                      <span>{link.label}</span>
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
