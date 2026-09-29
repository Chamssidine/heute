import NetInfo from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";

/**
 * Configure TanStack Query onlineManager avec NetInfo.
 */
export function setupNetworkListener(): void {
  onlineManager.setEventListener((setOnline) => {
    return NetInfo.addEventListener((state) => {
      setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });
  });
}

// Branchement automatique au chargement du module si NetInfo est disponible
if (typeof NetInfo?.addEventListener === "function") {
  setupNetworkListener();
}

export { onlineManager };
