import type { NetInfoState } from "@react-native-community/netinfo";

export interface NetworkQueryInvalidator {
  invalidateQueries: () => Promise<unknown>;
}

export interface NetInfoListenerSource {
  addEventListener: (listener: (state: Partial<NetInfoState>) => void) => () => void;
}

let wasOnline = true;

/**
 * Détermine si un état NetInfo correspond à un accès internet opérationnel.
 */
export function isNetworkConnected(state: Partial<NetInfoState>): boolean {
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

/**
 * Traite un changement d'état réseau :
 * - notifie TanStack Query onlineManager via setOnline
 * - déclenche une nouvelle lecture (invalidation) lorsque le réseau revient après une déconnexion.
 */
export function handleNetworkStateChange(
  state: Partial<NetInfoState>,
  client?: NetworkQueryInvalidator,
  setOnline?: (online: boolean) => void,
): boolean {
  const isOnline = isNetworkConnected(state);
  if (typeof setOnline === "function") {
    setOnline(isOnline);
  }

  // Nouvelle lecture quand le réseau revient
  if (isOnline && !wasOnline && client) {
    void client.invalidateQueries();
  }
  wasOnline = isOnline;
  return isOnline;
}

/**
 * Branche un écouteur NetInfo personnalisé (utile pour tests ou plateformes spécifiques).
 */
export function setupNetworkListenerWithSource(
  source: NetInfoListenerSource,
  client?: NetworkQueryInvalidator,
  setOnline?: (online: boolean) => void,
): () => void {
  return source.addEventListener((state) => {
    handleNetworkStateChange(state, client, setOnline);
  });
}

/**
 * Réinitialise l'état mémorisé pour les tests unitaires.
 */
export function _resetNetworkState(online = true): void {
  wasOnline = online;
}
