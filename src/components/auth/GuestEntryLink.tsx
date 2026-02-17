"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function GuestEntryLink() {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground hover:text-foreground hidden sm:inline-flex"
      onClick={() => {
        document.cookie = "guest-session=true; path=/; max-age=86400; SameSite=Lax; Secure";
        router.push("/plan-builder");
      }}
    >
      Try as Guest
    </Button>
  );
}
