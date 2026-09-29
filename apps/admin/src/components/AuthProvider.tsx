"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { canAccessAdmin, loginErrorMessage, type AppRole } from "../lib/auth.ts";
import { getSupabase } from "../lib/supabase.ts";

export type AuthState =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "forbidden"; displayName: string }
  | { status: "ready"; displayName: string; role: AppRole };

type AuthContextValue = {
  state: AuthState;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth doit être utilisé dans AuthProvider.");
  }
  return value;
}

async function loadState(userId: string): Promise<AuthState> {
  const { data, error } = await getSupabase()
    .from("employees")
    .select("display_name, role, active")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  // Pas de ligne employees active : aucun accès (la RLS le impose aussi côté base).
  if (!data || !data.active) {
    return { status: "signedOut" };
  }
  if (!canAccessAdmin(data.role)) {
    return { status: "forbidden", displayName: data.display_name };
  }
  return { status: "ready", displayName: data.display_name, role: data.role };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const supabase = getSupabase();
    void supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (userId === undefined) {
      return;
    }
    if (userId === null) {
      setState({ status: "signedOut" });
      return;
    }
    let cancelled = false;
    loadState(userId).then(
      (next) => {
        if (!cancelled) {
          setState(next);
        }
      },
      (error: unknown) => {
        console.error("Profil konnte nicht geladen werden", error);
        if (!cancelled) {
          setState({ status: "signedOut" });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabase().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      throw new Error(loginErrorMessage(error));
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await getSupabase().auth.signOut();
    if (error) {
      throw new Error(loginErrorMessage(error));
    }
  }, []);

  const value = useMemo(() => ({ state, signIn, signOut }), [state, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
