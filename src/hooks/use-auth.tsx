import { createContext, useContext, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const bootstrappedUserIds = useRef<Set<string>>(new Set());

  const ensureBootstrap = useCallback(async (nextSession: Session | null) => {
    const userId = nextSession?.user.id;
    if (!userId || bootstrappedUserIds.current.has(userId)) return;
    bootstrappedUserIds.current.add(userId);
    const { error } = await supabase.rpc("ensure_user_bootstrap", { target_user_id: userId });
    if (error) {
      bootstrappedUserIds.current.delete(userId);
      console.error("[Supabase] Failed to ensure first-run user rows", error);
    }
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
      void ensureBootstrap(s);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      void ensureBootstrap(data.session);
    });
    return () => sub.subscription.unsubscribe();
  }, [ensureBootstrap]);

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
