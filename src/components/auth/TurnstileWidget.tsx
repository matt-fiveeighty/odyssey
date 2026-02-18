"use client";

import { Turnstile } from "@marsidev/react-turnstile";

interface TurnstileWidgetProps {
  onSuccess: (token: string) => void;
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function TurnstileWidget({ onSuccess }: TurnstileWidgetProps) {
  if (!SITE_KEY) return null; // Skip in dev when not configured

  return (
    <Turnstile
      siteKey={SITE_KEY}
      onSuccess={onSuccess}
      options={{
        theme: "dark",
        size: "invisible",
      }}
    />
  );
}
