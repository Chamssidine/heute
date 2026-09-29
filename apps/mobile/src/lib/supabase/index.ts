import { AppState, type AppStateStatus } from "react-native";
import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@heute/domain";

/**
 * Adaptateur de stockage sécurisé pour React Native / Expo utilisant SecureStore.
 * Conforme aux recommandations de la documentation Supabase pour Expo.
 */
export const ExpoSecureStoreAdapter = {
  getItem: (key: string): Promise<string | null> => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string): Promise<void> => {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string): Promise<void> => {
    return SecureStore.deleteItemAsync(key);
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
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? "";

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

// Rafraîchissement automatique du token lié au cycle de vie de l'application (AppState)
if (typeof AppState?.addEventListener === "function") {
  AppState.addEventListener("change", (state: AppStateStatus) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
