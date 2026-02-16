"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, LogOut } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/calculator": "Calculator",
  "/units": "Units",
  "/goals": "Goals",
  "/plan-builder": "Plan Builder",
  "/points": "Points",
};

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const pageTitle = pageTitles[pathname] ?? "Hunt Planner";

  const displayName =
    user?.user_metadata?.full_name ??
    user?.email?.split("@")[0] ??
    "Hunter";

  const initials = displayName
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
        <span className="text-xs text-muted-foreground hidden sm:block">
          {displayName}
        </span>
        <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
          <span className="text-xs font-semibold text-primary">{initials}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSignOut}
          aria-label="Sign out"
          className="w-8 h-8 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
