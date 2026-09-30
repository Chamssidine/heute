import type { Database } from "@heute/domain";
import { createClient } from "@supabase/supabase-js";

const memoryStorage = new Map<string, string>();

let secureStoreModule: {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
} | null = null;

async function getSecureStore() {
  if (secureStoreModule) return secureStoreModule;
  if (typeof process === "undefined" || !process.versions?.node) {
    try {
      secureStoreModule = await import("expo-secure-store");
      return secureStoreModule;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Adaptateur de stockage sécurisé pour React Native / Expo utilisant SecureStore.
 * Conforme aux recommandations de la documentation Supabase pour Expo.
 * Utilise un stockage mémoire de repli en environnement de test Node.
 */
export const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const store = await getSecureStore();
    if (store?.getItemAsync) {
      return store.getItemAsync(key);
    }
    return memoryStorage.get(key) ?? null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    const store = await getSecureStore();
    if (store?.setItemAsync) {
      return store.setItemAsync(key, value);
    }
    memoryStorage.set(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    const store = await getSecureStore();
    if (store?.deleteItemAsync) {
      return store.deleteItemAsync(key);
    }
    memoryStorage.delete(key);
  },
};

const REQUEST_TIMEOUT_MS = 15000;

/**
 * Fetch avec timeout de 15 secondes pour chaque requête réseau.
 */
export const fetchWithTimeout: typeof fetch = (input, init) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  if (init?.signal) {
    if (init.signal.aborted) {
      controller.abort();
    } else {
      init.signal.addEventListener("abort", () => {
        controller.abort();
      });
    }
  }

  return fetch(input, {
    ...init,
    signal: controller.signal,
  }).finally(() => {
    clearTimeout(timeoutId);
  });
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY || "sb-anon-key-local";

export type AppStateStatus = "active" | "background" | "inactive" | "unknown" | "extension";

/**
 * Configure l'écouteur du cycle de vie AppState pour le rafraîchissement des tokens d'authentification.
 */
export function setupSupabaseAppState(appState?: {
  addEventListener: (type: "change", listener: (state: AppStateStatus) => void) => unknown;
}): void {
  if (typeof appState?.addEventListener === "function") {
    appState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });
  }
}

/**
 * Client Supabase unique pour l'application mobile.
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: fetchWithTimeout,
  },
});

// Rafraîchissement automatique du token lié au cycle de vie de l'application en environnement React Native
if (typeof process === "undefined" || !process.versions?.node) {
  import("react-native")
    .then(({ AppState }) => {
      setupSupabaseAppState(AppState);
    })
    .catch(() => {
      // Ignoré hors environnement React Native
    });
}
