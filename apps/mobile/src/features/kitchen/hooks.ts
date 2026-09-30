import type { ViewState } from "../../lib/query/index.ts";
import type { KitchenDay } from "./model.ts";
import { kitchenDayFixture, kitchenDayNoLunchFixture } from "./model.ts";

/**
 * Hook provisoire pour l'écran « Küche ».
 * Renvoie un ViewState<KitchenDay> basé sur la fixture fictive pour la date de démo,
 * ou un état « empty » si aucune donnée n'existe pour la date demandée.
 */
export function useKitchenDay(date: string): ViewState<KitchenDay> {
  if (date === kitchenDayFixture.date) {
    return {
      status: "success",
      data: kitchenDayFixture,
      updatedAt: kitchenDayFixture.updatedAt,
    };
  }

  if (date === kitchenDayNoLunchFixture.date) {
    return {
      status: "success",
      data: kitchenDayNoLunchFixture,
      updatedAt: kitchenDayNoLunchFixture.updatedAt,
    };
  }

  return {
    status: "empty",
  };
}
