import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";

/**
 * QueryClient configuré avec retry pour les lectures uniquement
 * et un gcTime adapté à la persistance hors ligne.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      gcTime: 1000 * 60 * 60 * 24, // 24 heures pour la persistance hors ligne
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
    mutations: {
      retry: false, // Pas de retry automatique pour les écritures (lectures seulement)
    },
  },
});

/**
 * Persister AsyncStorage pour TanStack Query.
 */
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "HEUTE_QUERY_CACHE",
  throttleTime: 1000,
});

/**
 * Initialise la persistance du cache TanStack Query dans AsyncStorage.
 */
export function initQueryPersistence(
  client: QueryClient = queryClient,
  persister = asyncStoragePersister,
): () => void {
  const [unsubscribe] = persistQueryClient({
    queryClient: client,
    persister,
    maxAge: 1000 * 60 * 60 * 24, // 24 heures
  });
  return unsubscribe;
}
