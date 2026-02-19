"use client";

/**
 * Empty-state gate shown on pages that require a completed plan/assessment.
 * Displays a friendly CTA directing the user to the Plan Builder.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Compass, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface NoPlanGateProps {
  /** Page-specific icon displayed above the message */
  icon?: LucideIcon;
  /** Headline — defaults to "No plan built yet" */
  title?: string;
  /** Supporting copy — defaults to generic prompt */
  description?: string;
}

export function NoPlanGate({
  icon: Icon = Compass,
  title = "No plan built yet",
  description = "Complete a strategic assessment in the Plan Builder to unlock this page. It takes about 5 minutes and gives you a personalized multi-year roadmap.",
}: NoPlanGateProps) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-10 text-center max-w-lg mx-auto">
        <Icon className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6">{description}</p>
        <Button asChild>
          <Link href="/plan-builder">
            Start Plan Builder
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
