import type { Database } from "@heute/domain";
import {
  isRpcErrorCode,
  rpcErrorMessage,
  RPC_ERROR_CODES,
  RPC_ERROR_MESSAGES,
} from "@heute/domain/src/errors/index.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase/index.ts";
import {
  createTasksDay,
  extractFloorFromZone,
  formatFloorLabel,
  formatTaskTitle,
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
  type TaskItem,
  type TasksDay,
  type TaskStatus,
  type TaskType,
} from "./model.ts";

export type TasksSupabaseClient = SupabaseClient<Database>;

export const TASKS_ERROR_MESSAGES = {
  fetchFailed: "Aufgaben konnten nicht geladen werden. Bitte erneut versuchen.",
  networkError: "Keine Verbindung. Aufgaben konnten nicht geladen werden.",
  saveFailed: "Speichern fehlgeschlagen. Bitte erneut versuchen.",
  invalidTransition: "Diese Statusänderung ist nicht erlaubt.",
} as const;

/**
 * Mappe les erreurs techniques Supabase, PostgreSQL RPC ou réseau vers des erreurs explicites
 * avec des messages utilisateur en allemand via packages/domain (docs/design/copy.md §7.3).
 * Jamais de texte brut de la base de données n'est renvoyé.
 */
export function mapTasksError(error: unknown, context: "fetch" | "save" = "fetch"): Error {
  if (!error) {
    return new Error(
      context === "save" ? TASKS_ERROR_MESSAGES.saveFailed : TASKS_ERROR_MESSAGES.fetchFailed,
    );
  }

  // Si c'est déjà une instance Error avec un message déjà traduit, ne pas réécraser
  if (error instanceof Error) {
    const knownMessages: readonly string[] = [
      ...Object.values(RPC_ERROR_MESSAGES),
      ...Object.values(TASKS_ERROR_MESSAGES),
      rpcErrorMessage(null),
    ];
    if (knownMessages.includes(error.message)) {
      return error;
    }
  }

  // 1. Détection de code d'erreur SQLSTATE / RPC (ex: 42501, HT002)
  const errObj =
    typeof error === "object" && error !== null ? (error as Record<string, unknown>) : null;
  const rawCode = errObj && typeof errObj.code === "string" ? errObj.code : undefined;

  if (rawCode === "42501") {
    return new Error(rpcErrorMessage(RPC_ERROR_CODES.forbidden));
  }

  if (rawCode && isRpcErrorCode(rawCode)) {
    return new Error(rpcErrorMessage(rawCode));
  }

  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("HT002") || message === "forbidden") {
    return new Error(rpcErrorMessage(RPC_ERROR_CODES.forbidden));
  }

  if (message.includes("HT001") || message === "reason_required") {
    return new Error(rpcErrorMessage(RPC_ERROR_CODES.reasonRequired));
  }

  // 2. Message de transition invalide déjà formaté
  if (message === TASKS_ERROR_MESSAGES.invalidTransition) {
    return new Error(TASKS_ERROR_MESSAGES.invalidTransition);
  }

  // 3. Contexte d'enregistrement : échec de sauvegarde explicite
  if (context === "save") {
    return new Error(TASKS_ERROR_MESSAGES.saveFailed);
  }

  // 4. Erreurs réseau / hors ligne en lecture
  if (/network|offline|failed to fetch|abort|timeout/i.test(message)) {
    return new Error(TASKS_ERROR_MESSAGES.networkError);
  }

  // 5. Code d'erreur RPC présent mais inconnu
  if (rawCode) {
    return new Error(rpcErrorMessage(rawCode));
  }

  return new Error(TASKS_ERROR_MESSAGES.fetchFailed);
}

interface RoomRelation {
  id: string;
  number: string;
  floor: number;
  beds: number;
  has_bath: boolean;
}

interface RoomTaskRow {
  id: string;
  date: string;
  room_id: string | null;
  task_type: Database["public"]["Enums"]["task_type"];
  zone: string | null;
  status: Database["public"]["Enums"]["task_status"];
  done_at: string | null;
  note: string | null;
  assignedTo?: string | null;
  rooms: RoomRelation | RoomRelation[] | null;
}

/**
 * Récupère et structure les tâches de ménage du jour visibles par l'utilisateur connecté.
 * RLS côté Supabase filtre automatiquement les tâches selon les droits (PLAN §5.1).
 */
export async function fetchTasksDay(
  date: string,
  client: TasksSupabaseClient = supabase as unknown as TasksSupabaseClient,
): Promise<TasksDay> {
  const { data, error } = await client
    .from("room_tasks")
    .select(
      `
      id,
      date,
      room_id,
      task_type,
      zone,
      status,
      done_at,
      note,
      rooms (
        id,
        number,
        floor,
        beds,
        has_bath
      )
    `,
    )
    .eq("date", date);

  if (error) {
    throw mapTasksError(error);
  }

  const rows = (data ?? []) as unknown as RoomTaskRow[];

  const items: TaskItem[] = rows.map((row) => {
    const room = Array.isArray(row.rooms) ? row.rooms[0] : row.rooms;
    const roomNumber = room?.number ?? null;
    const zone = row.zone ?? null;
    const floor = room?.floor ?? (zone ? extractFloorFromZone(zone) : 0);
    const type: TaskType = zone && !row.room_id ? "zone" : (row.task_type as TaskType);
    const status: TaskStatus = row.status;

    return {
      id: row.id,
      roomId: row.room_id,
      roomNumber,
      zone,
      title: formatTaskTitle({ roomNumber, zone }),
      floor,
      floorLabel: formatFloorLabel(floor),
      type,
      typeLabel: TASK_TYPE_LABELS[type] ?? type,
      status,
      statusLabel: TASK_STATUS_LABELS[status] ?? status,
      note: row.note,
      doneAt: row.done_at,
    };
  });

  return createTasksDay(date, items);
}

/**
 * Met à jour le statut d'une tâche via la RPC PostgreSQL `set_task_status`.
 * Seul l'employé assigné à la tâche peut modifier son statut (sécurité garantie par RLS / RPC).
 * done_at est renseigné automatiquement par la base lorsque le statut passe à 'erledigt'.
 */
export async function updateTaskStatus(
  taskId: string,
  nextStatus: TaskStatus,
  client: TasksSupabaseClient = supabase as unknown as TasksSupabaseClient,
): Promise<void> {
  try {
    const { error } = await client.rpc("set_task_status", {
      p_id: taskId,
      p_status: nextStatus,
    });

    if (error) {
      throw mapTasksError(error, "save");
    }
  } catch (err) {
    throw mapTasksError(err, "save");
  }
}

export const tasksApi = {
  fetchTasksDay,
  updateTaskStatus,
  mapTasksError,
};
