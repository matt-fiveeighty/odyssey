"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, UserPlus } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/Logo";

const pageTitles: Record<string, string> = {
  "/roadmap": "Roadmap",
  "/portfolio": "Portfolio",
  "/rebalance": "Rebalance",
  "/this-year": "This Year",
  "/deadlines": "Deadlines",
  "/points": "Points",
  "/budget": "Budget",
  "/units": "Units",
  "/odds": "Odds",
  "/calculator": "Calculator",
  "/plan-builder": "Onboarding",
  "/settings": "Settings",
  // Legacy routes
  "/dashboard": "Roadmap",
  "/goals": "Goals",
};

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isGuest, signOut } = useAuth();
  const pageTitle = pageTitles[pathname] ?? "Odyssey Outdoors";

  const displayName = isGuest
    ? "Guest"
    : user?.user_metadata?.full_name ??
      user?.email?.split("@")[0] ??
      "Hunter";

  const initials = isGuest
    ? "G"
    : displayName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

  async function handleSignOut() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between h-16 px-6 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="flex items-center gap-4 flex-1">
        {/* Mobile brand header */}
        <Link href="/" className="md:hidden flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Logo size={28} className="text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]" />
          <span className="text-sm font-semibold">Odyssey Outdoors</span>
        </Link>
        {/* Desktop page title */}
        <h1 className="hidden md:block text-sm font-medium text-foreground">
          {pageTitle}
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground hidden sm:block">
          {displayName}
        </span>
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isGuest
              ? "bg-muted border border-border"
              : "bg-primary/20 border border-primary/30"
          }`}
        >
          <span
            className={`text-xs font-semibold ${
              isGuest ? "text-muted-foreground" : "text-primary"
            }`}
          >
            {initials}
          </span>
        </div>

        {isGuest ? (
          <Link href="/auth/sign-up">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-8"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Up</span>
            </Button>
          </Link>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            aria-label="Sign out"
            className="w-8 h-8 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        )}
      </div>
    </header>
  );
}
