import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import React from "react";
import { toViewState, type ViewState } from "../../lib/query/viewState.ts";
import { fetchTeamDay, type TeamSupabaseClient } from "./api.ts";
import { teamDayFixture, type TeamDay } from "./model.ts";

export const TEAM_QUERY_KEY = ["team", "day"] as const;

export function teamDayQueryKey(date: string) {
  return [...TEAM_QUERY_KEY, date] as const;
}

export const TEAM_EMPTY_MESSAGE = "Heute ist niemand eingeteilt.";

/**
 * Date du jour au format YYYY-MM-DD, fuseau Europe/Berlin (en-CA donne ce format).
 */
export function todayBerlin(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(now);
}

/**
 * Heure « HH:MM » (Europe/Berlin) d'un instant : sert à « Stand HH:MM ».
 */
export function formatStandBerlin(timestampMs: number): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(timestampMs));
}

export interface TeamQuerySnapshot {
  data?: TeamDay;
  error?: unknown;
  isLoading: boolean;
  isPaused: boolean;
  dataUpdatedAt: number;
  refetch: () => void;
}

/**
 * Pure : convertit l'état de la requête en ViewState<TeamDay>.
 * « offline » = requête en pause (pas de réseau) avec des données en cache.
 */
export function teamViewStateFromQuery(query: TeamQuerySnapshot): ViewState<TeamDay> {
  return toViewState<TeamDay>({
    data: query.data,
    error: query.error,
    isLoading: query.isLoading,
    isOffline: query.isPaused,
    updatedAt: query.dataUpdatedAt > 0 ? formatStandBerlin(query.dataUpdatedAt) : undefined,
    isEmpty: (day) => day.groups.every((group) => group.shifts.length === 0),
    emptyMessage: TEAM_EMPTY_MESSAGE,
    onRetry: query.refetch,
  });
}

export interface UseTeamDayOptions {
  client?: TeamSupabaseClient;
  queryClient?: QueryClient;
}

/**
 * Détecte un appel hors rendu React (tests Node des composants, sans QueryClientProvider).
 * Même approche que useTasksDay ; ne se produit jamais dans l'app.
 */
function isInsideReactRender(): boolean {
  const internals = (
    React as unknown as {
      __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?: { H: unknown };
    }
  ).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  return internals != null && internals.H != null;
}

function useReactTeamDay(date: string, options?: UseTeamDayOptions): ViewState<TeamDay> {
  const contextQc = useQueryClient(options?.queryClient);
  const qc = options?.queryClient ?? contextQc;

  const query = useQuery(
    {
      queryKey: teamDayQueryKey(date),
      queryFn: () => fetchTeamDay(date, options?.client),
    },
    qc,
  );

  return teamViewStateFromQuery({
    data: query.data,
    error: query.error,
    isLoading: query.isLoading,
    isPaused: query.fetchStatus === "paused",
    dataUpdatedAt: query.dataUpdatedAt,
    refetch: () => {
      void query.refetch();
    },
  });
}

/**
 * Hook de l'écran « Team » : services du jour via la RPC team_shifts(day).
 * Sans argument : la vraie date du jour (Europe/Berlin).
 */
export function useTeamDay(
  date: string = todayBerlin(),
  options?: UseTeamDayOptions,
): ViewState<TeamDay> {
  if (!isInsideReactRender()) {
    // Hors React (tests de composants uniquement) : la fixture, sans réseau.
    return date === teamDayFixture.date
      ? { status: "success", data: teamDayFixture }
      : { status: "empty", message: TEAM_EMPTY_MESSAGE };
  }

  return useReactTeamDay(date, options);
}
