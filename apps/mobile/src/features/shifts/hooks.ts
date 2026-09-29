import type { ViewState } from "../../lib/query/index.ts";
import type { MyShiftsView } from "./model.ts";
import { myShiftsFixture } from "./model.ts";

/**
 * Hook provisoire pour « Mein Dienstplan ».
 * Renvoie un ViewState<MyShiftsView> basé sur la fixture d'un mois réaliste,
 * en attendant le branchement réel sur Supabase une fois les policies RLS livrées.
 */
export function useMyShifts(month: string): ViewState<MyShiftsView> {
  const data = month === myShiftsFixture.month ? myShiftsFixture : { ...myShiftsFixture, month };

  return {
    status: "success",
    data,
  };
}
