import { getTableInvalidationKeys, isRealtimeTable } from "./tableRules.ts";

export interface QueryInvalidator {
  invalidateQueries: (options: { queryKey: readonly unknown[] }) => Promise<void>;
}

export type RealtimeLogger = (message: string) => void;

/**
 * Traite un événement Supabase Realtime pour une table donnée :
 * - Invalide immédiatement toutes les clés de requêtes associées.
 * - Règle stricte de confidentialité (AGENTS.md) : aucune donnée de santé
 *   (allergies, motif d'absence, « krank ») ni détail de payload n'est journalisé.
 *   Seul le nom de la table est mentionné si une journalisation est active.
 */
export async function handleRealtimeTableEvent(
  table: string,
  invalidator: QueryInvalidator,
  logger?: RealtimeLogger,
): Promise<void> {
  if (!isRealtimeTable(table)) {
    return;
  }

  if (typeof logger === "function") {
    logger(`[Realtime] Invalidation requêtes pour la table: ${table}`);
  }

  const queryKeysToInvalidate = getTableInvalidationKeys(table);
  await Promise.all(
    queryKeysToInvalidate.map((queryKey) => invalidator.invalidateQueries({ queryKey })),
  );
}
