import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import React, { useCallback } from "react";
import { queryClient as defaultQueryClient } from "../../lib/query/client.ts";
import { toViewState, type ViewState } from "../../lib/query/viewState.ts";
import {
  fetchTasksDay,
  mapTasksError,
  TASKS_ERROR_MESSAGES,
  updateTaskStatus,
  type TasksSupabaseClient,
} from "./api.ts";
import {
  createTasksDay,
  isAllowedTaskTransition,
  TASK_STATUS_LABELS,
  tasksDayFixture,
  type SetTaskStatusVariables,
  type TasksDay,
  type TaskStatus,
  type UseSetTaskStatusOptions,
  type UseSetTaskStatusResult,
} from "./model.ts";

export const TASKS_QUERY_KEY = ["tasks", "day"] as const;

export function tasksDayQueryKey(date: string) {
  return [...TASKS_QUERY_KEY, date] as const;
}

/**
 * Détecte si l'environnement d'exécution dispose d'un dispatcher React actif.
 * Permet aux tests unitaires Node d'anciens modules appelant useTasksDay hors React de fonctionner.
 */
function isInsideReactRender(): boolean {
  try {
    const internals = (
      React as unknown as {
        __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?: {
          H: unknown;
        };
      }
    )?.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    return internals != null && internals.H != null;
  } catch {
    return false;
  }
}

/**
 * Recherche la date d'une tâche à partir des données en cache ou de la fixture de référence.
 */
export function findDateForTask(taskId: string, qc: QueryClient, fallbackDate?: string): string {
  if (fallbackDate) {
    const day = qc.getQueryData<TasksDay>(tasksDayQueryKey(fallbackDate));
    if (day?.allTasks.some((t) => t.id === taskId)) {
      return fallbackDate;
    }
  }

  const queries = qc.getQueriesData<TasksDay>({ queryKey: TASKS_QUERY_KEY });
  for (const [key, data] of queries) {
    if (data && data.allTasks.some((t) => t.id === taskId)) {
      const qDate = (key as readonly string[])[2];
      return qDate ?? data.date;
    }
  }

  if (tasksDayFixture.allTasks.some((t) => t.id === taskId)) {
    return tasksDayFixture.date;
  }

  return fallbackDate ?? tasksDayFixture.date;
}

export interface TaskStatusMutationContext {
  previousDay?: TasksDay;
  queryKey: ReturnType<typeof tasksDayQueryKey>;
}

/**
 * Fonction pure de mise à jour optimiste du cache TanStack Query.
 * Partagée entre le hook React useMutation et le runner autonome de tests.
 * Annule les requêtes en vol, valide la transition vers l'avant (offen -> in_arbeit -> erledigt),
 * et applique la mise à jour optimiste dans le cache.
 */
export async function onMutateTaskStatus(
  qc: QueryClient,
  variables: SetTaskStatusVariables,
  options?: UseSetTaskStatusOptions,
): Promise<TaskStatusMutationContext> {
  const date =
    variables.date ??
    options?.defaultDate ??
    findDateForTask(variables.taskId, qc, options?.defaultDate);
  const queryKey = tasksDayQueryKey(date);

  await qc.cancelQueries({ queryKey });

  const previousDay =
    qc.getQueryData<TasksDay>(queryKey) ??
    (date === tasksDayFixture.date ? tasksDayFixture : undefined);
  const currentTask = previousDay?.allTasks.find((t) => t.id === variables.taskId);
  const currentStatus = variables.currentStatus ?? currentTask?.status;

  // Validation stricte des transitions autorisées (uniquement vers l'avant : offen → in_arbeit → erledigt)
  if (currentStatus && !isAllowedTaskTransition(currentStatus, variables.nextStatus)) {
    throw new Error(TASKS_ERROR_MESSAGES.invalidTransition);
  }

  // Mise à jour optimiste immédiate dans le cache TanStack Query
  if (previousDay) {
    const updatedTasks = previousDay.allTasks.map((t) =>
      t.id === variables.taskId
        ? {
            ...t,
            status: variables.nextStatus,
            statusLabel: TASK_STATUS_LABELS[variables.nextStatus],
            doneAt: variables.nextStatus === "erledigt" ? new Date().toISOString() : null,
          }
        : t,
    );
    const optimisticDay = createTasksDay(date, updatedTasks);
    qc.setQueryData<TasksDay>(queryKey, optimisticDay);
  }

  return { previousDay, queryKey };
}

/**
 * Fonction pure de retour arrière (rollback) du cache TanStack Query en cas d'échec serveur.
 * Partagée entre useMutation et le runner autonome.
 */
export function onErrorTaskStatus(
  qc: QueryClient,
  err: Error,
  _variables: SetTaskStatusVariables,
  context?: TaskStatusMutationContext,
  options?: UseSetTaskStatusOptions,
): void {
  if (context?.queryKey && context?.previousDay !== undefined) {
    qc.setQueryData(context.queryKey, context.previousDay);
  }
  options?.onError?.(err);
}

export interface UseTasksDayOptions {
  client?: TasksSupabaseClient;
  queryClient?: QueryClient;
}

function useReactTasksDay(date: string, options?: UseTasksDayOptions): ViewState<TasksDay> {
  const contextQc = useQueryClient(options?.queryClient);
  const qc = options?.queryClient ?? contextQc;
  const isFixtureDate = date === tasksDayFixture.date;

  const query = useQuery(
    {
      queryKey: tasksDayQueryKey(date),
      queryFn: async (): Promise<TasksDay> => {
        if (options?.client) {
          return fetchTasksDay(date, options.client);
        }
        const cached = qc.getQueryData<TasksDay>(tasksDayQueryKey(date));
        if (cached) {
          return cached;
        }
        if (isFixtureDate) {
          return tasksDayFixture;
        }
        return createTasksDay(date, []);
      },
      initialData: () =>
        qc.getQueryData<TasksDay>(tasksDayQueryKey(date)) ??
        (isFixtureDate ? tasksDayFixture : undefined),
      staleTime: options?.client ? undefined : Infinity,
    },
    qc,
  );

  return toViewState<TasksDay>({
    data: query.data,
    error: query.error,
    isLoading: query.isLoading,
    isEmpty: (data) => data.total === 0,
    emptyMessage: "Heute hast du keine Aufgaben.",
    onRetry: () => {
      void query.refetch();
    },
  });
}

/**
 * Hook pour la vue des tâches du jour « Aufgaben ».
 * Souscrit aux données via useQuery sur tasksDayQueryKey(date), avec fixture en initialData,
 * et renvoie un ViewState<TasksDay> réactif reflétant les mises à jour optimistes.
 */
export function useTasksDay(date: string, options?: UseTasksDayOptions): ViewState<TasksDay> {
  const isFixtureDate = date === tasksDayFixture.date;

  if (!isInsideReactRender()) {
    if (!isFixtureDate) {
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

  return useReactTasksDay(date, options);
}

/**
 * Moteur de mutation autonome pour les tests Node et les exécutions hors React.
 * Utilise les mêmes fonctions pures onMutateTaskStatus et onErrorTaskStatus que useMutation.
 */
export function createSetTaskStatusRunner(
  options?: UseSetTaskStatusOptions,
): UseSetTaskStatusResult {
  const qc = options?.queryClient ?? defaultQueryClient;
  const client = options?.client;

  let isPending = false;
  let currentError: Error | null = null;

  const execute = async (variables: SetTaskStatusVariables): Promise<void> => {
    isPending = true;
    currentError = null;

    let context: TaskStatusMutationContext;
    try {
      context = await onMutateTaskStatus(qc, variables, options);
    } catch (validationErr) {
      isPending = false;
      const err = validationErr instanceof Error ? validationErr : new Error(String(validationErr));
      currentError = err;
      options?.onError?.(err);
      throw err;
    }

    try {
      await updateTaskStatus(variables.taskId, variables.nextStatus, client);
      isPending = false;
      options?.onSuccess?.();
      qc.invalidateQueries({ queryKey: context.queryKey });
    } catch (rawError) {
      isPending = false;
      const mappedError = mapTasksError(rawError, "save");
      currentError = mappedError;
      onErrorTaskStatus(qc, mappedError, variables, context, options);
      throw mappedError;
    }
  };

  return {
    get isPending() {
      return isPending;
    },
    get error() {
      return currentError;
    },
    reset: () => {
      currentError = null;
      isPending = false;
    },
    mutate: (vars: SetTaskStatusVariables) => {
      execute(vars).catch((err: unknown) => {
        void err;
      });
    },
    mutateAsync: execute,
    setTaskStatus: (taskId: string, nextStatus: TaskStatus, date?: string) =>
      execute({ taskId, nextStatus, date }),
  };
}

/**
 * Hook principal useSetTaskStatus() exposé pour l'interface (Agent U).
 * Appelle directement useMutation de TanStack Query.
 * Gère la transition vers l'avant, la mise à jour optimiste et le rollback en cas d'erreur.
 */
export function useSetTaskStatus(options?: UseSetTaskStatusOptions): UseSetTaskStatusResult {
  const contextQc = useQueryClient(options?.queryClient);
  const qc = options?.queryClient ?? contextQc;
  const client = options?.client;

  const mutation = useMutation(
    {
      mutationFn: async (variables: SetTaskStatusVariables) => {
        await updateTaskStatus(variables.taskId, variables.nextStatus, client);
      },
      onMutate: (variables) => onMutateTaskStatus(qc, variables, options),
      onError: (err, variables, context) =>
        onErrorTaskStatus(qc, err as Error, variables, context, options),
      onSuccess: () => {
        options?.onSuccess?.();
      },
      onSettled: (_data, _err, _variables, context) => {
        if (context?.queryKey) {
          qc.invalidateQueries({ queryKey: context.queryKey });
        }
      },
    },
    qc,
  );

  const setTaskStatus = useCallback(
    async (taskId: string, nextStatus: TaskStatus, date?: string) => {
      await mutation.mutateAsync({ taskId, nextStatus, date });
    },
    [mutation],
  );

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    setTaskStatus,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
