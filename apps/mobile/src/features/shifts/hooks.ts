import type { ViewState } from "../../lib/query/index.ts";
import { getLastSeenSync } from "../../lib/query/lastSeen/index.ts";
import type { MyShiftsView } from "./model.ts";
import { applyMyShiftsChanges, myShiftsFixture } from "./model.ts";

export interface UseMyShiftsOptions {
  lastSeen?: string | null;
}

/**
 * Hook pour « Mein Dienstplan ».
 * Renvoie un ViewState<MyShiftsView> basé sur la fixture d'un mois réaliste,
 * en appliquant les indicateurs de changement (changed & previous) par rapport à lastSeen.
 * - Première ouverture (lastSeen null) : rien n'est marqué (règle d'acceptation 3).
 * - Élément avec updated_at > lastSeen : porte changed: true et previous (règle d'acceptation 2).
 */
export function useMyShifts(month: string, options?: UseMyShiftsOptions): ViewState<MyShiftsView> {
  const effectiveLastSeen =
    options?.lastSeen !== undefined ? options.lastSeen : getLastSeenSync("dienstplan");

  if (month !== myShiftsFixture.month) {
    return {
      status: "empty",
    };
  }

  return {
    status: "success",
    data: applyMyShiftsChanges(myShiftsFixture, effectiveLastSeen),
  };
}
