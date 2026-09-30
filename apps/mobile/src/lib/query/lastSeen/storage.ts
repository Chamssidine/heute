import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StorageBackend } from "./types.ts";

export const LAST_SEEN_STORAGE_PREFIX = "heute_last_seen:";

/**
 * Backend par défaut : AsyncStorage. Une erreur de stockage n'est jamais masquée.
 * Les tests injectent un backend mémoire via setStorageBackend.
 */
const defaultBackend: StorageBackend = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};

let currentBackend: StorageBackend = defaultBackend;

/**
 * Cache synchrone alimenté par les lectures et écritures réussies, pour initialiser
 * les écrans sans flicker. Ce n'est pas un repli : il n'est jamais lu à la place du backend.
 */
const syncCache = new Map<string, string>();

export function setStorageBackend(backend: StorageBackend): void {
  currentBackend = backend;
  syncCache.clear();
}

export function resetStorageBackend(): void {
  setStorageBackend(defaultBackend);
}

export function getLastSeenKey(screen: string): string {
  return `${LAST_SEEN_STORAGE_PREFIX}${screen}`;
}

/**
 * Récupère le timestamp ISO de dernière consultation d'un écran.
 * Renvoie null si l'écran n'a jamais été consulté.
 */
export async function getLastSeen(screen: string): Promise<string | null> {
  const val = await currentBackend.getItem(getLastSeenKey(screen));
  if (val) {
    syncCache.set(screen, val);
  }
  return val;
}

/**
 * Lecture synchrone depuis le cache (valide après un getLastSeen ou setLastSeen réussi).
 */
export function getLastSeenSync(screen: string): string | null {
  return syncCache.get(screen) ?? null;
}

/**
 * Enregistre l'instant de consultation (ISO 8601) pour un écran donné.
 */
export async function setLastSeen(screen: string, timestamp?: string): Promise<void> {
  const ts = timestamp ?? new Date().toISOString();
  await currentBackend.setItem(getLastSeenKey(screen), ts);
  syncCache.set(screen, ts);
}

/**
 * Efface le timestamp enregistré pour un écran.
 */
export async function clearLastSeen(screen: string): Promise<void> {
  await currentBackend.removeItem(getLastSeenKey(screen));
  syncCache.delete(screen);
}
