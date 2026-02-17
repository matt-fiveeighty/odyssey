"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { User, SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";

interface AuthContextValue {
  user: User | null;
  isGuest: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isGuest: false,
  loading: true,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

/** Check for guest-session cookie */
function checkGuestCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c === "guest-session=true");
}

function getInitialSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  return createClient();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState<SupabaseClient | null>(getInitialSupabase);
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(!!supabase);

  useEffect(() => {
    // Check guest mode on mount
    setIsGuest(checkGuestCookie());

    if (!supabase) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = useCallback(async () => {
    // Clear guest cookie
    document.cookie = "guest-session=; path=/; max-age=0";
    setIsGuest(false);

    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ user, isGuest, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
