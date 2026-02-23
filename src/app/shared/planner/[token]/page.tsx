import type { Metadata } from "next";
import Link from "next/link";
import { cacheGet, CACHE_TTLS } from "@/lib/redis";
import type { PlanItem } from "@/components/planner/PlanItemCard";
import { SharedPlannerView } from "@/components/planner/SharedPlannerView";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = { params: Promise<{ token: string }> };

interface PlannerSharePayload {
  items: PlanItem[];
  year: number;
  planName: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const data = await cacheGet<PlannerSharePayload>(`planner_share:${token}`);

  if (!data) {
    return { title: "Shared Plan Not Found | Odyssey Outdoors" };
  }

  const title = data.planName
    ? `${data.planName} | Odyssey Outdoors`
    : `Shared Hunt Plan ${data.year} | Odyssey Outdoors`;

  return {
    title,
    description: `A shared ${data.year} hunt planner with ${data.items.length} scheduled items.`,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function SharedPlannerPage({ params }: Props) {
  const { token } = await params;
  const data = await cacheGet<PlannerSharePayload>(`planner_share:${token}`);

  // Expired or invalid token
  if (!data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-muted">
            <Clock className="size-8 text-muted-foreground" />
          </div>

          <h1 className="mb-2 text-xl font-semibold">
            This share link has expired or doesn&apos;t exist
          </h1>

          <p className="mb-8 text-muted-foreground">
            Shared plans expire after 90 days. The link may have been removed or
            never existed.
          </p>

          <Button size="lg" asChild>
            <Link href="/plan-builder">Create your own plan</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Calculate expiration from creation timestamp + TTL
  const expiresAt = new Date(
    new Date(data.createdAt).getTime() + CACHE_TTLS.share_links * 1000,
  ).toISOString();

  return (
    <SharedPlannerView
      items={data.items}
      year={data.year}
      planName={data.planName}
      expiresAt={expiresAt}
      token={token}
    />
  );
}
