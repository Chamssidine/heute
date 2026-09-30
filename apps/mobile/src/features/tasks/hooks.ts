import type { ViewState } from "../../lib/query/index.ts";
import type { TasksDay } from "./model.ts";
import { tasksDayFixture } from "./model.ts";

/**
 * Hook provisoire pour « Aufgaben » (contrat L -> U).
 * Renvoie un ViewState<TasksDay> basé sur la fixture d'une journée réaliste,
 * ou status: "empty" avec le message allemand de copy.md §7.3 pour toute date sans tâche,
 * en attendant le branchement complet sur Supabase via TanStack Query.
 */
export function useTasksDay(date: string): ViewState<TasksDay> {
  if (date !== tasksDayFixture.date) {
    return {
      status: "empty",
      message: "Heute hast du keine Aufgaben.",
    };
  }

  return {
    status: "success",
    data: tasksDayFixture,
  };
}
