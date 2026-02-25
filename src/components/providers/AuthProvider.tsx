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
import { migrateAssessmentToRoadmapStore } from "@/lib/store";
import { hydrateFromDb } from "@/lib/sync";

interface AuthContextValue {
  user: User | null;
  isGuest: boolean;
  loading: boolean;
  hydrated: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isGuest: false,
  loading: true,
  hydrated: false,
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
  const [isGuest, setIsGuest] = useState(checkGuestCookie);
  const [loading, setLoading] = useState(!!supabase);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    // Get initial session
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        setUser(user);
        setLoading(false);
      })
      .catch(() => {
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

  // One-time migration: sync confirmedAssessment from AppStore → RoadmapStore
  useEffect(() => {
    migrateAssessmentToRoadmapStore();
  }, []);

  // Hydrate all stores from Supabase on authenticated login
  useEffect(() => {
    if (user && !isGuest && !loading) {
      hydrateFromDb()
        .then(() => setHydrated(true))
        .catch(() => setHydrated(true)); // Proceed even if hydration fails (offline-first)
    } else if (isGuest || (!supabase && !loading)) {
      // Guests and unconfigured Supabase: mark as hydrated immediately (use localStorage)
      setHydrated(true);
    }
  }, [user, isGuest, loading, supabase]);

  return (
    <AuthContext.Provider value={{ user, isGuest, loading, hydrated, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
