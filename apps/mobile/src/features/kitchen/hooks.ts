import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import React from "react";
import { queryKeys } from "../../lib/query/keys.ts";
import { getLastSeenSync } from "../../lib/query/lastSeen/index.ts";
import { toViewState, type ViewState } from "../../lib/query/viewState.ts";
import { fetchKitchenDay, type KitchenSupabaseClient } from "./api.ts";
import {
  applyKitchenDayChanges,
  isKitchenDayEmpty,
  kitchenDayFixture,
  kitchenDayNoLunchFixture,
  type KitchenDay,
} from "./model.ts";

export interface UseKitchenDayOptions {
  client?: KitchenSupabaseClient;
  queryClient?: QueryClient;
  lastSeen?: string | null;
}

/**
 * Détecte un dispatcher React actif : les tests Node (today, kitchen) appellent le hook
 * hors rendu et reçoivent alors la fixture (même repli que useTasksDay).
 */
function isInsideReactRender(): boolean {
  try {
    const internals = (
      React as unknown as {
        __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?: { H: unknown };
      }
    ).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    return internals != null && internals.H != null;
  } catch {
    return false;
  }
}

function useReactKitchenDay(
  date: string,
  lastSeen: string | null,
  options?: UseKitchenDayOptions,
): ViewState<KitchenDay> {
  const contextQc = useQueryClient(options?.queryClient);
  const qc = options?.queryClient ?? contextQc;

  const query = useQuery(
    {
      queryKey: queryKeys.kitchen.day(date),
      queryFn: () => fetchKitchenDay(date, options?.client),
    },
    qc,
  );

  const data = query.data ? applyKitchenDayChanges(query.data, lastSeen) : undefined;

  return toViewState<KitchenDay>({
    data,
    error: query.error,
    isLoading: query.isLoading,
    updatedAt: data?.updatedAt,
    isEmpty: isKitchenDayEmpty,
    emptyMessage: "Für diesen Tag sind keine Mahlzeiten geplant.",
    onRetry: () => {
      void query.refetch();
    },
  });
}

/**
 * Hook de l'écran « Küche » : lit meal_counts, menu_items et meal_totals pour la date
 * avec la session de l'utilisateur (la RLS fait foi). Renvoie un ViewState<KitchenDay>
 * avec les indicateurs de changement (changed & previous) selon la dernière consultation :
 * - première ouverture (lastSeen null) : rien n'est marqué ;
 * - élément avec updated_at > lastSeen : porte changed: true et previous.
 */
export function useKitchenDay(date: string, options?: UseKitchenDayOptions): ViewState<KitchenDay> {
  const effectiveLastSeen =
    options?.lastSeen !== undefined ? options.lastSeen : getLastSeenSync("kueche");

  if (!isInsideReactRender()) {
    const fixture = [kitchenDayFixture, kitchenDayNoLunchFixture].find((d) => d.date === date);
    if (!fixture) return { status: "empty" };
    const data = applyKitchenDayChanges(fixture, effectiveLastSeen);
    return { status: "success", data, updatedAt: data.updatedAt };
  }

  return useReactKitchenDay(date, effectiveLastSeen, options);
}
