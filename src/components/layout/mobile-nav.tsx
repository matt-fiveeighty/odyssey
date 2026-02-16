"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calculator, Map, Target, Compass, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/calculator", label: "Calc", icon: Calculator },
  { href: "/units", label: "Units", icon: Map },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/plan-builder", label: "Plan", icon: Compass },
  { href: "/points", label: "Points", icon: Wallet },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Mobile navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-md">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
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
      </div>
    </nav>
  );
}
