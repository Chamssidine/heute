import { queryKeys } from "../query/keys.ts";

export type RealtimeTable = "shifts" | "room_tasks" | "meal_counts" | "menu_items";

export const REALTIME_TABLES: readonly RealtimeTable[] = [
  "shifts",
  "room_tasks",
  "meal_counts",
  "menu_items",
] as const;

/**
 * Règles d'invalidation associant chaque table Postgres aux clés TanStack Query correspondantes.
 * - shifts (mes services) -> ["shifts"], ["today"], ["team"]
 * - room_tasks (mes tâches de ménage) -> ["tasks"], ["today"]
 * - meal_counts (repas et effectifs) -> ["kitchen"], ["today"]
 * - menu_items (menu de la semaine) -> ["kitchen"], ["today"]
 *
 * La RLS fait foi côté serveur (l'app ne filtre pas à la place de la base).
 */
export const TABLE_INVALIDATION_MAP: Record<RealtimeTable, readonly (readonly unknown[])[]> = {
  shifts: [queryKeys.shifts.all, queryKeys.today.all, queryKeys.team.all],
  room_tasks: [queryKeys.tasks.all, queryKeys.today.all],
  meal_counts: [queryKeys.kitchen.all, queryKeys.today.all],
  menu_items: [queryKeys.kitchen.all, queryKeys.today.all],
};

/**
 * Vérifie si le nom de table appartient aux tables surveillées en temps réel.
 */
export function isRealtimeTable(table: string): table is RealtimeTable {
  return (REALTIME_TABLES as readonly string[]).includes(table);
}

/**
 * Renvoie la liste des préfixes de clés de requête TanStack Query à invalider pour une table donnée.
 */
export function getTableInvalidationKeys(table: string): readonly (readonly unknown[])[] {
  if (!isRealtimeTable(table)) {
    return [];
  }
  return TABLE_INVALIDATION_MAP[table];
}
