import type { ViewState } from "../../lib/query/index.ts";
import type { MyShiftsView } from "./model.ts";
import { myShiftsFixture } from "./model.ts";

/**
 * Hook provisoire pour « Mein Dienstplan ».
 * Renvoie un ViewState<MyShiftsView> basé sur la fixture d'un mois réaliste,
 * ou status: "empty" pour tout mois différent de la fixture,
 * en attendant le branchement réel sur Supabase une fois les policies RLS livrées.
 */
export function useMyShifts(month: string): ViewState<MyShiftsView> {
  if (month !== myShiftsFixture.month) {
    return {
      status: "empty",
    };
  }

  return {
    status: "success",
    data: myShiftsFixture,
  };
}
