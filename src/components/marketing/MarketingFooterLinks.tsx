"use client";

import Link from "next/link";
import { NavLink } from "./NavLink";

export function MarketingFooterLinks() {
  return (
    <>
      {/* Product */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Product
        </h4>
        <ul className="space-y-2">
          <li>
            <NavLink href="/#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </NavLink>
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
            <NavLink href="/#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Testimonials
            </NavLink>
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
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
          </li>
          <li>
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Terms of Service
            </Link>
          </li>
          <li>
            <Link href="mailto:support@odysseyoutdoors.com" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </Link>
          </li>
        </ul>
      </div>
    </>
  );
}
