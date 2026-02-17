"use client";

import { useState, useEffect, useRef } from "react";
import { Menu, X } from "lucide-react";
import { NavLink } from "./NavLink";
import { navItems } from "./MarketingNav";

export function MobileMarketingNav() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="md:hidden" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-accent transition-colors"
      >
        {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      {open && (
        <nav
          className="absolute top-16 left-0 right-0 bg-background border-b border-border p-4 space-y-3 z-50"
          aria-label="Mobile navigation"
        >
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
