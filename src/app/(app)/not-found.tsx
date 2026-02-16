import { Compass } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-muted">
          <Compass className="size-8 text-muted-foreground" />
        </div>

        <h1 className="mb-2 text-4xl font-bold text-foreground">404</h1>

        <h2 className="mb-2 text-xl font-semibold text-foreground">
          Trail not found
        </h2>

        <p className="mb-8 text-muted-foreground">
          Looks like you wandered off the map. The page you&apos;re looking for
          doesn&apos;t exist or has been moved.
        </p>

        <Button size="lg" asChild>
          <Link href="/">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
