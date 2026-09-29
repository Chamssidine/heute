import { supabase } from "../../lib/supabase/index.ts";
import { createTeamDay, type RawTeamShift, type TeamDay } from "./model.ts";

/**
 * Appelle la fonction RPC Supabase team_shifts(day) selon le contrat #27.
 * Retourne la liste brute des services d'employés actifs pour la date demandée.
 */
export async function fetchTeamShifts(day: string): Promise<RawTeamShift[]> {
  const { data, error } = await supabase.rpc("team_shifts", { day });

  if (error) {
    throw error;
  }

  return (data as RawTeamShift[] | null) ?? [];
}

/**
 * Récupère les données d'équipe pour une journée et les groupe pour l'interface UI.
 */
export async function fetchTeamDay(day: string): Promise<TeamDay> {
  const rawShifts = await fetchTeamShifts(day);
  return createTeamDay(day, rawShifts);
}
