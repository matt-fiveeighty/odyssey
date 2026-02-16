"use client";

import { Compass } from "lucide-react";

interface AdvisorInsightProps {
  text: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function AdvisorInsight({ text, icon: Icon = Compass }: AdvisorInsightProps) {
  return (
    <div className="fade-in-up p-3.5 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed italic">{text}</p>
    </div>
  );
}
