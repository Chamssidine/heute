import type { Database } from "@heute/domain";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase/index.ts";
import type { KitchenDay } from "../kitchen/model.ts";
import type { TodayShift } from "./model.ts";
import { rowsToKitchenDay, shiftRowToShiftDay } from "./model.ts";

export type TodaySupabaseClient = SupabaseClient<Database>;

export const TODAY_ERROR_MESSAGES = {
  fetchFailed: "Heute konnte nicht geladen werden. Bitte erneut versuchen.",
  networkError: "Keine Verbindung. Heute konnte nicht geladen werden.",
} as const;

const REQUEST_TIMEOUT_MS = 10_000;

// AbortSignal.timeout n'existe pas partout dans React Native (Hermes).
function timeoutSignal(): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return controller.signal;
}

/**
 * Erreur de lecture sans texte brut de la base (aucune donnée sensible dans le message).
 * Le code éventuel est conservé pour que toViewState détecte une session expirée.
 */
export function mapTodayError(error: unknown): Error {
  const raw =
    typeof error === "object" && error !== null ? (error as Record<string, unknown>) : null;
  const code = raw && typeof raw.code === "string" ? raw.code : undefined;
  const message = error instanceof Error ? error.message : String(raw?.message ?? error);

  const mapped = new Error(
    /network|offline|failed to fetch|abort|timeout/i.test(message)
      ? TODAY_ERROR_MESSAGES.networkError
      : TODAY_ERROR_MESSAGES.fetchFailed,
  );
  if (code === "PGRST301" || code === "401") {
    (mapped as Error & { code?: string }).code = code;
  }
  return mapped;
}

/**
 * Mon service du jour. RLS fait foi pour les droits ; `employeeId` ne sert qu'à choisir
 * « mon » service parmi les lignes visibles (un admin voit tout le monde).
 */
export async function fetchTodayShift(
  date: string,
  employeeId: string,
  client: TodaySupabaseClient = supabase as unknown as TodaySupabaseClient,
): Promise<TodayShift | null> {
  const { data, error } = await client
    .from("shifts")
    .select("date, type, start1, end1, start2, end2, break_min")
    .eq("date", date)
    .eq("employee_id", employeeId)
    .limit(1)
    .abortSignal(timeoutSignal());

  if (error) {
    throw mapTodayError(error);
  }
  const row = data?.[0];
  return row ? shiftRowToShiftDay(row) : null;
}

/**
 * Repas du jour (`meal_totals`) et menu du jour (`menu_items`). `updatedAt` = heure de la réponse.
 */
export async function fetchTodayKitchen(
  date: string,
  client: TodaySupabaseClient = supabase as unknown as TodaySupabaseClient,
): Promise<KitchenDay> {
  const signal = timeoutSignal();
  const [totals, menu] = await Promise.all([
    client.rpc("meal_totals", { from_date: date, to_date: date }).abortSignal(signal),
    client.from("menu_items").select("*").eq("date", date).abortSignal(signal),
  ]);

  if (totals.error) {
    throw mapTodayError(totals.error);
  }
  if (menu.error) {
    throw mapTodayError(menu.error);
  }

  return rowsToKitchenDay(date, totals.data ?? [], menu.data ?? [], new Date().toISOString());
}

export const todayApi = {
  fetchTodayShift,
  fetchTodayKitchen,
  mapTodayError,
};
