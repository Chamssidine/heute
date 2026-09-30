import { useQuery } from "@tanstack/react-query";
import { toViewState, type ViewState } from "../../lib/query/index.ts";
import { supabase } from "../../lib/supabase/index.ts";
import { useAuth } from "../auth/hooks.ts";
import type { AppRole, Department } from "../auth/model.ts";
import { applyKitchenDayChanges, type KitchenDay } from "../kitchen/model.ts";
import type { TasksSupabaseClient } from "../tasks/api.ts";
import { useTasksDay } from "../tasks/hooks.ts";
import type { TasksDay } from "../tasks/model.ts";
import {
  fetchTodayKitchen,
  fetchTodayShift,
  TODAY_ERROR_MESSAGES,
  type TodaySupabaseClient,
} from "./api.ts";
import {
  createTodayView,
  getTodayCardOrder,
  type TodayShift,
  type TodayView,
  type UserRoleOrDepartment,
} from "./model.ts";

export const TODAY_QUERY_KEY = ["today", "day"] as const;

export interface UseTodayOptions {
  role?: AppRole | string;
  department?: Department | string;
  client?: TodaySupabaseClient;
  /** Dernière consultation : les repas et menus modifiés depuis sont marqués `changed`. */
  lastSeen?: string | null;
}

/**
 * État d'une source de données (requête) réduit à ce dont l'agrégat a besoin.
 */
export interface TodaySource<T> {
  data?: T;
  error?: unknown;
  isLoading: boolean;
  /** Requête en pause faute de réseau (TanStack `fetchStatus === "paused"`). */
  isPaused: boolean;
  /** Heure de la dernière réponse du serveur, en millisecondes. */
  updatedAtMs?: number;
  retry: () => void;
}

export interface TodaySources {
  date: string;
  roleOrDepartment: UserRoleOrDepartment;
  shift: TodaySource<TodayShift | null>;
  kitchen: TodaySource<KitchenDay>;
  /** `null` si le rôle n'affiche pas la carte des tâches. */
  tasks: TodaySource<TasksDay | null> | null;
}

/**
 * Agrège les sources en un ViewState<TodayView> (fonction pure, testée sans React).
 */
export function combineTodaySources(sources: TodaySources): ViewState<TodayView> {
  const parts: TodaySource<unknown>[] = [sources.shift, sources.kitchen];
  if (sources.tasks) {
    parts.push(sources.tasks);
  }

  const failed = parts.find((p) => p.error != null);
  const isLoading = parts.some((p) => p.isLoading);
  const isOffline =
    parts.some((p) => p.isPaused) ||
    (failed?.error instanceof Error && failed.error.message === TODAY_ERROR_MESSAGES.networkError);
  const retry = () => parts.forEach((p) => p.retry());

  const { shift, kitchen, tasks } = sources;
  const ready =
    shift.data !== undefined &&
    kitchen.data !== undefined &&
    (tasks === null || tasks.data !== undefined);

  const timestamps = parts.flatMap((p) => (p.updatedAtMs != null ? [p.updatedAtMs] : []));
  const updatedAt =
    timestamps.length > 0 ? new Date(Math.max(...timestamps)).toISOString() : undefined;

  const view = ready
    ? createTodayView({
        date: sources.date,
        shift: shift.data ?? null,
        tasks: tasks?.data ?? null,
        kitchen: kitchen.data,
        roleOrDepartment: sources.roleOrDepartment,
        updatedAt,
      })
    : undefined;

  return toViewState<TodayView>({
    data: view,
    error: failed?.error,
    isLoading: isLoading && !view,
    isOffline,
    updatedAt: view?.lastUpdatedAt ?? updatedAt,
    isEmpty: isTodayViewEmpty,
    onRetry: retry,
  });
}

function isTodayViewEmpty(view: TodayView): boolean {
  const { totals } = view.guests;
  const noMeals = Object.values(totals).every((t) => t.total === 0);
  return (
    view.myShift === null &&
    !view.myTasks?.hasTasks &&
    noMeals &&
    view.menu.mittag === null &&
    view.menu.abend === null
  );
}

function tasksSource(state: ViewState<TasksDay>): TodaySource<TasksDay | null> {
  return {
    data: state.data ?? (state.status === "empty" ? null : undefined),
    error: state.status === "error" ? new Error(state.message ?? "") : undefined,
    isLoading: state.status === "loading",
    isPaused: state.status === "offline",
    retry: () => {
      if (state.status === "error" || state.status === "offline") {
        state.onRetry?.();
      }
    },
  };
}

/**
 * Hook de l'écran « Heute » (contrat L -> U) : agrège mon service, mes tâches, les repas et le menu
 * du jour, lus avec la session de l'utilisateur (la RLS fait foi). Signature inchangée.
 *
 * Mesure du chargement en 4G (Android) : T0 = montage de l'écran appelant `useToday()`,
 * T1 = premier `status === "success"` ; cible T1 - T0 < 1,5 s (requêtes en parallèle).
 */
export function useToday(date: string, options?: UseTodayOptions): ViewState<TodayView> {
  const auth = useAuth();
  const client = options?.client ?? (supabase as unknown as TodaySupabaseClient);
  const employeeId = auth.user?.id;
  const lastSeen = options?.lastSeen;

  const roleOrDepartment: UserRoleOrDepartment = {
    role: options?.role ?? auth.user?.role,
    department: options?.department ?? auth.user?.department,
  };
  const requiresTasks = getTodayCardOrder(roleOrDepartment).includes("my_tasks");

  const shiftQuery = useQuery({
    queryKey: [...TODAY_QUERY_KEY, date, "shift", employeeId],
    queryFn: () => fetchTodayShift(date, employeeId ?? "", client),
    enabled: employeeId != null,
  });
  const kitchenQuery = useQuery({
    queryKey: [...TODAY_QUERY_KEY, date, "kitchen"],
    queryFn: () => fetchTodayKitchen(date, client),
  });
  const tasksState = useTasksDay(date, { client: client as unknown as TasksSupabaseClient });

  const toSource = <T>(q: typeof shiftQuery | typeof kitchenQuery, data: T | undefined) => ({
    data,
    error: q.error,
    isLoading: q.isLoading || (q === shiftQuery && employeeId == null),
    isPaused: q.fetchStatus === "paused",
    updatedAtMs: q.dataUpdatedAt > 0 ? q.dataUpdatedAt : undefined,
    retry: () => {
      void q.refetch();
    },
  });

  return combineTodaySources({
    date,
    roleOrDepartment,
    shift: toSource(shiftQuery, shiftQuery.data),
    kitchen: toSource(
      kitchenQuery,
      kitchenQuery.data ? applyKitchenDayChanges(kitchenQuery.data, lastSeen) : undefined,
    ),
    tasks: requiresTasks ? tasksSource(tasksState) : null,
  });
}
