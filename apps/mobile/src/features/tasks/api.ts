import type { Database } from "@heute/domain";
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
} as const;

/**
 * Mappe les erreurs techniques Supabase ou réseau vers des erreurs explicites
 * avec des messages utilisateur en allemand (docs/design/copy.md §7.3).
 */
export function mapTasksError(error: unknown): Error {
  if (!error) {
    return new Error(TASKS_ERROR_MESSAGES.fetchFailed);
  }

  const message = error instanceof Error ? error.message : String(error);

  if (/network|offline|failed to fetch|abort|timeout/i.test(message)) {
    return new Error(TASKS_ERROR_MESSAGES.networkError);
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

export const tasksApi = {
  fetchTasksDay,
  mapTasksError,
};
