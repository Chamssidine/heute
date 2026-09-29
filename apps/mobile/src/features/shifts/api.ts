import type { MyShiftsView } from "./model.ts";
import { myShiftsFixture } from "./model.ts";

/**
 * Récupère le planning de l'utilisateur connecté pour un mois donné (format « YYYY-MM »).
 * Implémentation provisoire renvoyant la fixture jusqu'au branchement sur Supabase
 * une fois les policies RLS livrées.
 */
export async function fetchMyShifts(month: string): Promise<MyShiftsView> {
  return Promise.resolve(
    month === myShiftsFixture.month ? myShiftsFixture : { ...myShiftsFixture, month },
  );
}
