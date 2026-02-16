import Link from "next/link";

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
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center">
            HP
          </div>
          <span className="text-sm font-semibold text-foreground">
            Hunt Planner
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
