"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLinkProps {
  href: string;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

/**
 * Nav link that handles same-page hash scrolling properly.
 * Next.js <Link> doesn't re-scroll to anchors when already on the target page.
 */
export function NavLink({ href, className, children, onClick }: NavLinkProps) {
  const pathname = usePathname();

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    // Check if this is a hash link targeting the current page
    const [path, hash] = href.split("#");
    const targetPath = path || "/";

    if (hash && pathname === targetPath) {
      e.preventDefault();
      const el = document.getElementById(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      // Update URL hash without navigation
      window.history.pushState(null, "", `#${hash}`);
    }

    onClick?.();
  }

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
