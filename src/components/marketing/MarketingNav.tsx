"use client";

import { NavLink } from "./NavLink";

const navItems = [
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Testimonials", href: "/#testimonials" },
];

export function MarketingNav() {
  return (
    <nav className="hidden md:flex items-center gap-6">
      {navItems.map((item) => (
        <NavLink
          key={item.href}
          href={item.href}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export { navItems };
