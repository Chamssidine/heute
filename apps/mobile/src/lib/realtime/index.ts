import { setupRealtimeAuthSync } from "./subscription.ts";

export * from "./tableRules.ts";
export * from "./handler.ts";
export * from "./subscription.ts";

// Démarrage automatique de la synchronisation de session au chargement du module
setupRealtimeAuthSync();
