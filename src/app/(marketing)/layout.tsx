import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MobileMarketingNav } from "@/components/marketing/MobileMarketingNav";
import { Logo } from "@/components/shared/Logo";

const navItems = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Testimonials", href: "#testimonials" },
];

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <Logo size={28} className="text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]" />
              <span className="text-sm font-semibold text-foreground">
                Odyssey Outdoors
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/auth/sign-in">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button size="sm">Get Started</Button>
            </Link>
            {/* Mobile menu */}
            <MobileMarketingNav items={navItems} />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <Logo size={24} className="text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]" />
                <span className="text-sm font-semibold">Odyssey Outdoors</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Strategic western big game portfolio planning. Built by hunters, for hunters.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Product
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/auth/sign-up" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Get Started
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Resources
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Testimonials
                  </Link>
                </li>
                <li>
                  <span className="text-sm text-muted-foreground/50 cursor-default">
                    Blog (Coming Soon)
                  </span>
                </li>
                <li>
                  <span className="text-sm text-muted-foreground/50 cursor-default">
                    FAQ (Coming Soon)
                  </span>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Legal
              </h4>
              <ul className="space-y-2">
                <li>
                  <span className="text-sm text-muted-foreground/50 cursor-default">
                    Privacy Policy
                  </span>
                </li>
                <li>
                  <span className="text-sm text-muted-foreground/50 cursor-default">
                    Terms of Service
                  </span>
                </li>
                <li>
                  <Link href="mailto:support@odysseyoutdoors.com" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Odyssey Outdoors. All rights reserved.
            </p>
            <p className="text-[10px] text-muted-foreground/50">
              Not affiliated with any state fish &amp; game agency.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
