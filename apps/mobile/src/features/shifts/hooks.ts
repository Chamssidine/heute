import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import React from "react";
import { toViewState, type ViewState } from "../../lib/query/viewState.ts";
import type { MyShiftsView } from "./model.ts";
import { applyMyShiftsChanges, myShiftsFixture } from "./model.ts";
import { getLastSeenSync } from "../../lib/query/lastSeen/index.ts";
import { fetchMyShifts, type ShiftsSupabaseClient } from "./api.ts";
import { formatStandBerlin } from "../team/hooks.ts";

export const SHIFTS_QUERY_KEY = ["shifts", "month"] as const;

export function shiftsMonthQueryKey(month: string) {
  return [...SHIFTS_QUERY_KEY, month] as const;
}

export const SHIFTS_EMPTY_MESSAGE = "Für diesen Monat sind keine Dienste eingetragen.";

export interface UseMyShiftsOptions {
  lastSeen?: string | null;
  client?: ShiftsSupabaseClient;
  queryClient?: QueryClient;
}

export interface ShiftsQuerySnapshot {
  data?: MyShiftsView;
  error?: unknown;
  isLoading: boolean;
  isPaused: boolean;
  dataUpdatedAt: number;
  refetch: () => void;
}

/**
 * Pure : convertit l'état de la requête en ViewState<MyShiftsView>.
 * « offline » = requête en pause (pas de réseau) avec des données en cache.
 * « Stand » = heure de la dernière réponse du serveur.
 */
export function shiftsViewStateFromQuery(query: ShiftsQuerySnapshot): ViewState<MyShiftsView> {
  return toViewState<MyShiftsView>({
    data: query.data,
    error: query.error,
    isLoading: query.isLoading,
    isOffline: query.isPaused,
    updatedAt: query.dataUpdatedAt > 0 ? formatStandBerlin(query.dataUpdatedAt) : undefined,
    isEmpty: (view) => view.days.length === 0,
    emptyMessage: SHIFTS_EMPTY_MESSAGE,
    onRetry: query.refetch,
  });
}

/**
 * Détecte un appel hors rendu React (tests Node des composants, sans QueryClientProvider).
 * Même approche que useTeamDay ; ne se produit jamais dans l'app.
 */
function isInsideReactRender(): boolean {
  const internals = (
    React as unknown as {
      __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?: { H: unknown };
    }
  ).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  return internals != null && internals.H != null;
}

function useReactMyShifts(
  month: string,
  lastSeen: string | null,
  options?: UseMyShiftsOptions,
): ViewState<MyShiftsView> {
  const contextQc = useQueryClient(options?.queryClient);
  const qc = options?.queryClient ?? contextQc;

  const query = useQuery(
    {
      queryKey: shiftsMonthQueryKey(month),
      queryFn: () => fetchMyShifts(month, options?.client),
    },
    qc,
  );

  return shiftsViewStateFromQuery({
    data: query.data ? applyMyShiftsChanges(query.data, lastSeen) : undefined,
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
 * Hook de « Mein Dienstplan » : mes services du mois (table shifts) et mon Soll (table employees).
 * Les indicateurs de changement (changed) sont posés par rapport à lastSeen ;
 * première ouverture (lastSeen null) : rien n'est marqué.
 */
export function useMyShifts(month: string, options?: UseMyShiftsOptions): ViewState<MyShiftsView> {
  const effectiveLastSeen =
    options?.lastSeen !== undefined ? options.lastSeen : getLastSeenSync("dienstplan");

  if (!isInsideReactRender()) {
    // Hors React (tests de composants uniquement) : la fixture, sans réseau.
    return month === myShiftsFixture.month
      ? { status: "success", data: applyMyShiftsChanges(myShiftsFixture, effectiveLastSeen) }
      : { status: "empty", message: SHIFTS_EMPTY_MESSAGE };
  }

  return useReactMyShifts(month, effectiveLastSeen ?? null, options);
}
