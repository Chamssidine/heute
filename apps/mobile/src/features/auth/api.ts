import type { Database } from "@heute/domain";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase/index.ts";
import {
  AUTH_MESSAGES,
  type AuthSession,
  type CurrentUser,
  type LoginCredentials,
} from "./model.ts";

export type HeuteSupabaseClient = SupabaseClient<Database>;

/**
 * Mappe une erreur Supabase Auth ou réseau vers une erreur avec message utilisateur allemand.
 * Structure : ce qui s'est passé + ce que je peux faire. Jamais de code technique.
 */
export function mapAuthError(error: unknown): Error {
  if (!error) {
    return new Error(AUTH_MESSAGES.genericError);
  }

  const message = error instanceof Error ? error.message : String(error);

  if (/invalid.*credentials|invalid_grant|invalid login/i.test(message)) {
    return new Error(AUTH_MESSAGES.invalidCredentials);
  }

  if (/network|offline|failed to fetch|abort|timeout/i.test(message)) {
    return new Error(AUTH_MESSAGES.networkError);
  }

  if (/deaktiviert|inactive/i.test(message)) {
    return new Error(AUTH_MESSAGES.userInactive);
  }

  return new Error(AUTH_MESSAGES.genericError);
}

/**
 * Récupère le profil employé associé à un compte Supabase Auth.
 */
export async function fetchEmployeeProfile(
  userId: string,
  client: HeuteSupabaseClient = supabase as unknown as HeuteSupabaseClient,
): Promise<CurrentUser> {
  const { data, error } = await client
    .from("employees")
    .select("id, user_id, display_name, department, role, active")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw mapAuthError(error);
  }

  if (data) {
    if (!data.active) {
      throw new Error(AUTH_MESSAGES.userInactive);
    }

    return {
      id: data.id,
      userId: data.user_id ?? userId,
      email: "",
      displayName: data.display_name,
      role: data.role,
      department: data.department,
    };
  }

  // Profil par défaut si l'employé n'est pas encore lié dans la table
  return {
    id: userId,
    userId,
    email: "",
    displayName: "Mitarbeiter",
    role: "staff",
    department: "housekeeping",
  };
}

/**
 * Connexion avec e-mail et mot de passe via Supabase Auth.
 */
export async function signInWithEmail(
  credentials: LoginCredentials,
  client: HeuteSupabaseClient = supabase as unknown as HeuteSupabaseClient,
): Promise<AuthSession> {
  const { data, error } = await client.auth.signInWithPassword({
    email: credentials.email.trim(),
    password: credentials.password,
  });

  if (error || !data.user) {
    throw mapAuthError(error ?? new Error("No user returned"));
  }

  const profile = await fetchEmployeeProfile(data.user.id, client);

  return {
    user: {
      ...profile,
      email: data.user.email ?? credentials.email,
    },
    expiresAt: data.session?.expires_at ?? null,
  };
}

/**
 * Déconnexion de la session courante via Supabase Auth.
 */
export async function signOut(
  client: HeuteSupabaseClient = supabase as unknown as HeuteSupabaseClient,
): Promise<void> {
  const { error } = await client.auth.signOut();
  if (error) {
    throw mapAuthError(error);
  }
}

/**
 * Récupère la session active persistée.
 */
export async function fetchSession(
  client: HeuteSupabaseClient = supabase as unknown as HeuteSupabaseClient,
): Promise<AuthSession | null> {
  const { data, error } = await client.auth.getSession();
  if (error) {
    throw mapAuthError(error);
  }

  if (!data.session?.user) {
    return null;
  }

  const profile = await fetchEmployeeProfile(data.session.user.id, client);

  return {
    user: {
      ...profile,
      email: data.session.user.email ?? "",
    },
    expiresAt: data.session.expires_at ?? null,
  };
}

/**
 * Écoute les changements d'état d'authentification (connexion, déconnexion, rafraîchissement).
 */
export function onAuthStateChange(
  callback: (session: AuthSession | null) => void,
  client: HeuteSupabaseClient = supabase as unknown as HeuteSupabaseClient,
): () => void {
  const {
    data: { subscription },
  } = client.auth.onAuthStateChange(async (_event, session) => {
    if (!session?.user) {
      callback(null);
      return;
    }

    try {
      const profile = await fetchEmployeeProfile(session.user.id, client);
      callback({
        user: {
          ...profile,
          email: session.user.email ?? "",
        },
        expiresAt: session.expires_at ?? null,
      });
    } catch {
      callback(null);
    }
  });

  return () => {
    subscription.unsubscribe();
  };
}

export const authApi = {
  signInWithEmail,
  signOut,
  fetchSession,
  onAuthStateChange,
  fetchEmployeeProfile,
  mapAuthError,
};
