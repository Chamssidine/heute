import type { Database } from "@heute/domain";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase/index.ts";
import { createTeamDay, type RawTeamShift, type TeamDay } from "./model.ts";

export type TeamSupabaseClient = SupabaseClient<Database>;

export const TEAM_ERROR_MESSAGES = {
  fetchFailed: "Team konnte nicht geladen werden. Bitte erneut versuchen.",
  networkError: "Keine Verbindung. Team konnte nicht geladen werden.",
} as const;

/**
 * Transforme une erreur Supabase en erreur au message utilisateur fixe :
 * jamais de texte brut de la base (pas de donnée de santé dans les messages).
 * Les erreurs d'authentification gardent leur code pour que toViewState affiche « unauthorized ».
 */
export function mapTeamError(error: unknown): Error {
  const obj =
    typeof error === "object" && error !== null ? (error as Record<string, unknown>) : null;
  const code = obj && typeof obj.code === "string" ? obj.code : undefined;
  const rawMessage = obj && typeof obj.message === "string" ? obj.message : "";

  if (code === "PGRST301" || /jwt/i.test(rawMessage)) {
    return Object.assign(new Error(TEAM_ERROR_MESSAGES.fetchFailed), { code: "PGRST301" });
  }
  if (/network|offline|failed to fetch/i.test(rawMessage)) {
    return new Error(TEAM_ERROR_MESSAGES.networkError);
  }
  return new Error(TEAM_ERROR_MESSAGES.fetchFailed);
}

/**
 * Appelle la fonction RPC Supabase team_shifts(day) avec la session de l'utilisateur :
 * la RLS fait foi, aucun filtre de droits côté app.
 */
export async function fetchTeamShifts(
  day: string,
  client: TeamSupabaseClient = supabase,
): Promise<RawTeamShift[]> {
  const { data, error } = await client.rpc("team_shifts", { day });

  if (error) {
    throw mapTeamError(error);
  }

  return data ?? [];
}

/**
 * Récupère les données d'équipe pour une journée et les groupe pour l'interface UI.
 */
export async function fetchTeamDay(
  day: string,
  client: TeamSupabaseClient = supabase,
): Promise<TeamDay> {
  const rawShifts = await fetchTeamShifts(day, client);
  return createTeamDay(day, rawShifts);
}
