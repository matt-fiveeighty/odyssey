import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Marketing header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center">
              OO
            </div>
            <span className="text-sm font-semibold text-foreground">
              Odyssey Outdoors
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/auth/sign-in">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary text-primary-foreground font-bold text-[10px] flex items-center justify-center">
              OO
            </div>
            <span className="text-xs text-muted-foreground">
              Odyssey Outdoors — Strategic Western Big Game Portfolio
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Built by hunters, for hunters.
          </p>
        </div>
      </footer>
    </div>
  );
}
