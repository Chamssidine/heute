import type { ViewState } from "../../lib/query/index.ts";
import { getLastSeenSync } from "../../lib/query/lastSeen/index.ts";
import type { KitchenDay } from "./model.ts";
import { applyKitchenDayChanges, kitchenDayFixture, kitchenDayNoLunchFixture } from "./model.ts";

export interface UseKitchenDayOptions {
  lastSeen?: string | null;
}

/**
 * Hook pour l'écran « Küche ».
 * Renvoie un ViewState<KitchenDay> basé sur la fixture fictive pour la date demandée,
 * en appliquant les indicateurs de changement (changed & previous) selon la dernière consultation.
 * - Première ouverture (lastSeen null) : rien n'est marqué (règle d'acceptation 3).
 * - Élément avec updated_at > lastSeen : porte changed: true et previous (règle d'acceptation 2).
 */
export function useKitchenDay(date: string, options?: UseKitchenDayOptions): ViewState<KitchenDay> {
  const effectiveLastSeen =
    options?.lastSeen !== undefined ? options.lastSeen : getLastSeenSync("kueche");

  if (date === kitchenDayFixture.date) {
    const data = applyKitchenDayChanges(kitchenDayFixture, effectiveLastSeen);

    return {
      status: "success",
      data,
      updatedAt: data.updatedAt,
    };
  }

  if (date === kitchenDayNoLunchFixture.date) {
    const data = applyKitchenDayChanges(kitchenDayNoLunchFixture, effectiveLastSeen);

    return {
      status: "success",
      data,
      updatedAt: data.updatedAt,
    };
  }

  return {
    status: "empty",
  };
}
