import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useEffect } from "react";
import { authApi } from "./api.ts";
import {
  toAuthViewState,
  type AuthSession,
  type LoginCredentials,
  type UseAuthReturn,
} from "./model.ts";

export const AUTH_QUERY_KEY = ["auth", "session"] as const;

export interface UseAuthOptions {
  mockSession?: AuthSession | null;
  api?: typeof authApi;
}

/**
 * Détecte si l'exécution a lieu dans le cycle de rendu d'un composant React.
 */
function isInsideReactRender(): boolean {
  try {
    const internals = (
      React as unknown as {
        __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?: {
          H: unknown;
        };
      }
    )?.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    return internals != null && internals.H != null;
  } catch {
    return false;
  }
}

/**
 * Implémentation réactive du hook useAuth utilisant TanStack Query.
 */
function useReactAuth(options?: UseAuthOptions): UseAuthReturn {
  const queryClient = useQueryClient();
  const api = options?.api ?? authApi;

  const {
    data: session = null,
    isLoading: isSessionLoading,
    error: sessionError,
    refetch,
  } = useQuery<AuthSession | null>({
    queryKey: AUTH_QUERY_KEY,
    queryFn: () => (options?.mockSession !== undefined ? options.mockSession : api.fetchSession()),
    staleTime: 1000 * 60 * 15,
  });

  const signInMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => api.signInWithEmail(credentials),
    onSuccess: (newSession) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, newSession);
    },
  });

  const signOutMutation = useMutation({
    mutationFn: () => api.signOut(),
    onSuccess: () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      queryClient.clear();
    },
  });

  useEffect(() => {
    if (options?.mockSession !== undefined) {
      return;
    }
    const unsubscribe = api.onAuthStateChange((newSession) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, newSession);
    });
    return unsubscribe;
  }, [api, options?.mockSession, queryClient]);

  const activeError = signInMutation.error ?? signOutMutation.error ?? sessionError;
  const isLoading = isSessionLoading || signInMutation.isPending || signOutMutation.isPending;

  const state = toAuthViewState({
    session,
    isLoading,
    error: activeError,
    onRetry: () => {
      signInMutation.reset();
      signOutMutation.reset();
      refetch();
    },
  });

  const signIn = useCallback(
    async (credentialsOrEmail: LoginCredentials | string, maybePassword?: string) => {
      const credentials: LoginCredentials =
        typeof credentialsOrEmail === "string"
          ? { email: credentialsOrEmail, password: maybePassword ?? "" }
          : credentialsOrEmail;
      await signInMutation.mutateAsync(credentials);
    },
    [signInMutation],
  );

  const signOut = useCallback(async () => {
    await signOutMutation.mutateAsync();
  }, [signOutMutation]);

  return {
    ...state,
    state,
    session,
    user: session?.user ?? null,
    isAuthenticated: session != null,
    signIn,
    signOut,
  };
}

/**
 * Implémentation autonome pour tests unitaires en environnement Node (sans contexte React).
 */
function useStaticAuth(options?: UseAuthOptions): UseAuthReturn {
  let currentSession = options?.mockSession ?? null;
  let currentError: unknown = null;
  const api = options?.api ?? authApi;

  const getViewState = () =>
    toAuthViewState({
      session: currentSession,
      error: currentError,
    });

  return {
    get status() {
      return getViewState().status;
    },
    get data() {
      const vs = getViewState();
      return "data" in vs ? vs.data : undefined;
    },
    get message() {
      const vs = getViewState();
      return "message" in vs ? vs.message : undefined;
    },
    get onRetry() {
      const vs = getViewState();
      return "onRetry" in vs ? vs.onRetry : undefined;
    },
    get onLogin() {
      const vs = getViewState();
      return "onLogin" in vs ? vs.onLogin : undefined;
    },
    get updatedAt() {
      return getViewState().updatedAt;
    },
    get state() {
      return getViewState();
    },
    get session() {
      return currentSession;
    },
    get user() {
      return currentSession?.user ?? null;
    },
    get isAuthenticated() {
      return currentSession != null;
    },
    signIn: async (credentialsOrEmail: LoginCredentials | string, maybePassword?: string) => {
      const credentials: LoginCredentials =
        typeof credentialsOrEmail === "string"
          ? { email: credentialsOrEmail, password: maybePassword ?? "" }
          : credentialsOrEmail;
      try {
        currentError = null;
        currentSession = await api.signInWithEmail(credentials);
      } catch (err) {
        currentError = err;
        throw err;
      }
    },
    signOut: async () => {
      try {
        currentError = null;
        await api.signOut();
        currentSession = null;
      } catch (err) {
        currentError = err;
        throw err;
      }
    },
  };
}

/**
 * Hook d'authentification principal exposé à l'interface (Agent U).
 * Gère la session courante, les actions de connexion/déconnexion et l'état ViewState.
 */
export function useAuth(options?: UseAuthOptions): UseAuthReturn {
  if (isInsideReactRender()) {
    return useReactAuth(options);
  }
  return useStaticAuth(options);
}
