/**
 * Types pour le suivi de consultation et les indicateurs de changement.
 */

/**
 * Noms canoniques des écrans pour la mémorisation de la dernière consultation.
 */
export type ScreenName =
  "heute" | "dienstplan" | "team" | "aufgaben" | "kueche" | "menu" | "profil" | (string & {});

/**
 * Contrat pour un élément portant l'indicateur de modification.
 */
export interface ChangeIndicator<T = unknown> {
  updated_at?: string;
  changed?: boolean;
  previous?: T;
}

/**
 * Interface pour le backend de stockage (AsyncStorage ou mémoire).
 */
export interface StorageBackend {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
