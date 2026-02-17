import Link from "next/link";
import { Logo } from "@/components/shared/Logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Minimal header */}
      <header className="flex items-center justify-between h-16 px-6 border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          <Logo size={28} className="text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]" />
          <span className="text-sm font-semibold text-foreground">
            Odyssey Outdoors
          </span>
        </Link>
      </header>

      {/* Centered content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </main>
    </div>
  );
}
