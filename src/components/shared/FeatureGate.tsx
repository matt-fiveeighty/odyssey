"use client";

import { useAppStore } from "@/lib/store";
import type { Feature } from "@/lib/entitlements";
import { Lock } from "lucide-react";
import Link from "next/link";

interface FeatureGateProps {
  feature: Feature;
  children: React.ReactNode;
  /** What to show when feature is locked. Defaults to upgrade prompt. */
  fallback?: React.ReactNode;
}

/**
 * Client-side feature gate.
 * Renders children if the user's plan includes the feature.
 * Otherwise renders a fallback or a default upgrade prompt.
 */
export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const features = useAppStore((s) => s.subscriptionFeatures);
  const hasAccess = features[feature] ?? false;

  if (hasAccess) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 px-4 text-center">
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
        <Lock className="w-5 h-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">Upgrade to unlock</p>
        <p className="text-xs text-muted-foreground mt-1">
          This feature is available on paid plans.
        </p>
      </div>
      <Link
        href="/pricing"
        className="text-xs text-primary hover:underline font-medium"
      >
        View Plans
      </Link>
    </div>
  );
}
