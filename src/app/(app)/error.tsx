"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="size-8 text-destructive" />
        </div>

        <h1 className="mb-2 text-2xl font-bold text-foreground">
          Something went wrong
        </h1>

        <p className="mb-8 text-muted-foreground">
          An unexpected error occurred. You can try again or head back to the
          dashboard.
        </p>

        {error.digest && (
          <p className="mb-6 font-mono text-xs text-muted-foreground/60">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button onClick={reset} size="lg">
            Try again
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
