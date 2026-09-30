import type { ViewState } from "../../lib/query/index.ts";
import type { TeamDay } from "./model.ts";
import { teamDayFixture } from "./model.ts";

/**
 * Hook provisoire pour l'écran « Team ».
 * Renvoie un ViewState<TeamDay> basé sur la fixture d'une journée réaliste,
 * ou status: "empty" pour toute date différente de la fixture,
 * en attendant le branchement réel sur Supabase (team_shifts) une fois la PR backend mergée.
 */
export function useTeamDay(date: string = teamDayFixture.date): ViewState<TeamDay> {
  if (date !== teamDayFixture.date) {
    return {
      status: "empty",
    };
  }

  return {
    status: "success",
    data: teamDayFixture,
  };
}
