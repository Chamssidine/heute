import NetInfo from "@react-native-community/netinfo";
import { AppState } from "react-native";
import { onlineManager } from "@tanstack/react-query";
import { queryClient as defaultQueryClient } from "../query/client.ts";
import { setupFocusAppStateListener } from "../query/focus.ts";
import { handleNetworkStateChange, type NetworkQueryInvalidator } from "./connection.ts";
import "../realtime/index.ts";

export * from "./connection.ts";

/**
 * Configure TanStack Query onlineManager avec NetInfo et déclenche
 * une nouvelle lecture au retour de la connexion réseau.
 */
export function setupNetworkListener(client: NetworkQueryInvalidator = defaultQueryClient): void {
  onlineManager.setEventListener((setOnline) => {
    if (typeof NetInfo?.addEventListener === "function") {
      return NetInfo.addEventListener((state) => {
        handleNetworkStateChange(state, client, setOnline);
      });
    }
    return () => {};
  });
}

// Branchement automatique au chargement du module si NetInfo est disponible
if (typeof NetInfo?.addEventListener === "function") {
  setupNetworkListener(defaultQueryClient);
}

// Branchement automatique au chargement du module si AppState est disponible
if (typeof AppState?.addEventListener === "function") {
  setupFocusAppStateListener(AppState, defaultQueryClient);
}

export { onlineManager };
