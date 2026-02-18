"use client";

import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";

interface LlmNarrativeProps {
  endpoint: string;
  params: Record<string, unknown>;
  fallbackText?: string;
  className?: string;
}

/**
 * Renders an LLM-generated narrative with:
 * - "AI-generated" badge
 * - Loading skeleton
 * - Graceful fallback to static text if LLM fails
 */
export function LlmNarrative({
  endpoint,
  params,
  fallbackText,
  className = "",
}: LlmNarrativeProps) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAi, setIsAi] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchNarrative() {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });

        if (!res.ok) throw new Error("API error");

        const data = await res.json();
        if (cancelled) return;

        if (data.narrative) {
          setText(data.narrative);
          setIsAi(true);
        } else if (fallbackText) {
          setText(fallbackText);
        }
      } catch {
        if (cancelled) return;
        if (fallbackText) {
          setText(fallbackText);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchNarrative();
    return () => {
      cancelled = true;
    };
  }, [endpoint, params, fallbackText]);

  if (loading) {
    return (
      <div className={`space-y-2 animate-pulse ${className}`}>
        <div className="h-3 bg-secondary rounded w-full" />
        <div className="h-3 bg-secondary rounded w-5/6" />
        <div className="h-3 bg-secondary rounded w-4/6" />
      </div>
    );
  }

  if (!text) return null;

  return (
    <div className={`relative ${className}`}>
      {isAi && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60 mb-1.5">
          <Sparkles className="w-3 h-3" />
          <span>AI-generated insight</span>
        </div>
      )}
      <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
        {text}
      </div>
    </div>
  );
}
