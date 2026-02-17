"use client";

import { useRouter } from "next/navigation";

export function GuestEntryButton() {
  const router = useRouter();

  function handleGuestEntry() {
    document.cookie = "guest-session=true; path=/; max-age=86400; SameSite=Lax; Secure";
    router.push("/plan-builder");
  }

  return (
    <button
      onClick={handleGuestEntry}
      className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200 underline underline-offset-4 decoration-muted-foreground/30 hover:decoration-primary/50 cursor-pointer"
    >
      or continue as guest — no account needed
    </button>
  );
}
