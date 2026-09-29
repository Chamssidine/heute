import type { Database } from "@heute/domain";
import type { ViewState } from "../../lib/query/index.ts";

/**
 * Rôles applicatifs autorisés dans l'application mobile selon database.types.ts et PLAN §4.3.
 */
export type AppRole = Database["public"]["Enums"]["app_role"];

/**
 * Départements de l'auberge selon database.types.ts.
 */
export type Department = Database["public"]["Enums"]["department"];

/**
 * Représentation de l'utilisateur connecté dans l'application mobile.
 * Contrat exposé à l'interface (Agent U). Ne contient aucun secret ni token.
 */
export interface CurrentUser {
  id: string; // ID employé (employees.id)
  userId: string; // ID compte Supabase (auth.users.id)
  email: string;
  displayName: string;
  role: AppRole;
  department: Department;
}

/**
 * Session applicative contenant l'utilisateur courant et l'expiration.
 * Aucun token d'accès brut n'est exposé ici : les tokens sont gérés exclusivement
 * par le client Supabase et stockés dans ExpoSecureStore.
 */
export interface AuthSession {
  user: CurrentUser;
  expiresAt?: number | null;
}

/**
 * Identifiants de connexion e-mail et mot de passe.
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Messages utilisateur en allemand selon docs/design/copy.md §7.3 et screens.md §6.6.
 * Structure : ce qui s'est passé + ce que je peux faire. Jamais de code technique.
 */
export const AUTH_MESSAGES = {
  unauthorized: "Nicht angemeldet",
  unauthorizedMessage: "Bitte melde dich an, um fortzufahren.",
  sessionExpired: "Bitte melde dich erneut an.",
  invalidCredentials: "E-Mail oder Passwort ist nicht korrekt. Bitte prüfe deine Eingaben.",
  userInactive: "Dieses Benutzerkonto ist deaktiviert. Frag bitte an der Rezeption.",
  networkError: "Keine Verbindung. Bitte prüfe deine Internetverbindung.",
  genericError: "Anmeldung fehlgeschlagen. Bitte versuche es erneut oder frag an der Rezeption.",
} as const;

/**
 * Type du ViewState pour l'authentification.
 */
export type AuthViewState = ViewState<AuthSession>;

/**
 * Contrat complet exposé par le hook useAuth() pour l'interface (Agent U).
 */
export interface UseAuthReturn {
  // Propriétés ViewState au premier niveau pour compatibilité directe avec Screen / UI
  status: AuthViewState["status"];
  data?: AuthSession;
  message?: string;
  onRetry?: () => void;
  onLogin?: () => void;
  updatedAt?: string;

  // Propriétés dédiées
  state: AuthViewState;
  session: AuthSession | null;
  user: CurrentUser | null;
  isAuthenticated: boolean;

  // Actions
  signIn: (credentialsOrEmail: LoginCredentials | string, maybePassword?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

/**
 * Options pour la fonction pure toAuthViewState.
 */
export interface ToAuthViewStateOptions {
  session?: AuthSession | null;
  isLoading?: boolean;
  error?: unknown;
  isOffline?: boolean;
  onRetry?: () => void;
  onLogin?: () => void;
  updatedAt?: string;
}

/**
 * Fonction pure transformant l'état de session en ViewState<AuthSession>.
 * Gère explicitement l'état `unauthorized` pour la navigation protégée (Screen).
 */
export function toAuthViewState(options: ToAuthViewStateOptions): AuthViewState {
  const {
    session,
    isLoading = false,
    error,
    isOffline = false,
    onRetry,
    onLogin,
    updatedAt,
  } = options;

  // 1. En cours de chargement
  if (isLoading) {
    return {
      status: "loading",
      updatedAt,
    };
  }

  // 2. Erreur d'authentification ou réseau
  if (error != null) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : AUTH_MESSAGES.genericError;

    return {
      status: "error",
      message,
      onRetry,
      updatedAt,
    };
  }

  // 3. Session active
  if (session != null) {
    if (isOffline) {
      return {
        status: "offline",
        data: session,
        onRetry,
        updatedAt,
      };
    }

    return {
      status: "success",
      data: session,
      updatedAt,
    };
  }

  // 4. Aucun utilisateur connecté : état unauthorized pour navigation protégée
  return {
    status: "unauthorized",
    message: AUTH_MESSAGES.unauthorizedMessage,
    onLogin,
    updatedAt,
  };
}

/**
 * Fixture fictive d'un utilisateur connecté (Karl Musterkoch, cuisine).
 * Données fictives conformes à supabase/seed.sql et screens.md.
 */
export const authUserFixture: CurrentUser = {
  id: "e0000000-0000-4000-8000-000000000001",
  userId: "a0000000-0000-4000-8000-000000000001",
  email: "karl.koch@musterberg.test",
  displayName: "Karl Musterkoch",
  role: "staff",
  department: "kueche",
};

/**
 * Fixture fictive d'une session active.
 */
export const authSessionFixture: AuthSession = {
  user: authUserFixture,
  expiresAt: 1790000000,
};
