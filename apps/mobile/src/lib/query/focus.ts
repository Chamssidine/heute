import { focusManager } from "@tanstack/react-query";
import { queryClient as defaultQueryClient } from "./client.ts";

export type AppStateStatus = "active" | "background" | "inactive" | "unknown" | "extension";

export interface AppStateSubscription {
  remove: () => void;
}

export interface AppStateSource {
  addEventListener: (
    type: "change",
    listener: (state: AppStateStatus) => void,
  ) => AppStateSubscription | undefined;
}

export interface QueryInvalidator {
  invalidateQueries: () => Promise<unknown>;
}

let lastState: AppStateStatus = "active";

/**
 * Gère le changement d'état d'AppState :
 * - met à jour le focusManager de TanStack Query
 * - déclenche une nouvelle lecture (invalidation) lorsque l'application revient au premier plan ("active").
 */
export function handleAppStateFocus(
  nextState: AppStateStatus,
  client: QueryInvalidator = defaultQueryClient,
): void {
  const isFocused = nextState === "active";
  focusManager.setFocused(isFocused);

  // Nouvelle lecture au retour au premier plan (depuis l'arrière-plan ou inactif)
  if (isFocused && lastState !== "active") {
    void client.invalidateQueries();
  }
  lastState = nextState;
}

/**
 * Réinitialise l'état mémorisé pour les tests unitaires.
 */
export function _resetLastAppState(state: AppStateStatus = "active"): void {
  lastState = state;
}

/**
 * Configure l'écouteur du cycle de vie AppState pour TanStack Query.
 */
export function setupFocusAppStateListener(
  appState: AppStateSource,
  client: QueryInvalidator = defaultQueryClient,
): () => void {
  const sub = appState.addEventListener("change", (state: AppStateStatus) => {
    handleAppStateFocus(state, client);
  });

  return () => {
    if (sub && typeof sub.remove === "function") {
      sub.remove();
    }
  };
}
