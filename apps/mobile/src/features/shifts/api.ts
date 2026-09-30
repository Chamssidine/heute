import type { Database } from "@heute/domain";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase/index.ts";
import { createMyShiftsView, type MyShiftsView, type ShiftInputWithHistory } from "./model.ts";

export type ShiftsSupabaseClient = SupabaseClient<Database>;

export const SHIFTS_ERROR_MESSAGES = {
  fetchFailed: "Dienstplan konnte nicht geladen werden. Bitte erneut versuchen.",
  networkError: "Keine Verbindung. Dienstplan konnte nicht geladen werden.",
  invalidMonth: "Ungültiger Monat.",
} as const;

/**
 * Colonnes lues : jamais `note` (peut contenir un motif d'absence).
 */
export type ShiftRow = Pick<
  Database["public"]["Tables"]["shifts"]["Row"],
  "date" | "type" | "start1" | "end1" | "start2" | "end2" | "break_min" | "updated_at"
>;

export type EmployeeSollRow = Pick<
  Database["public"]["Tables"]["employees"]["Row"],
  "id" | "soll_min_month"
>;

/**
 * Transforme une erreur Supabase en erreur au message utilisateur fixe :
 * jamais de texte brut de la base (pas de donnée de santé dans les messages).
 * Les erreurs d'authentification gardent leur code pour que toViewState affiche « unauthorized ».
 */
export function mapShiftsError(error: unknown): Error {
  const obj =
    typeof error === "object" && error !== null ? (error as Record<string, unknown>) : null;
  const code = obj && typeof obj.code === "string" ? obj.code : undefined;
  const rawMessage = obj && typeof obj.message === "string" ? obj.message : "";

  if (code === "PGRST301" || /jwt|not authenticated/i.test(rawMessage)) {
    return Object.assign(new Error(SHIFTS_ERROR_MESSAGES.fetchFailed), { code: "PGRST301" });
  }
  if (/network|offline|failed to fetch/i.test(rawMessage)) {
    return new Error(SHIFTS_ERROR_MESSAGES.networkError);
  }
  return new Error(SHIFTS_ERROR_MESSAGES.fetchFailed);
}

/**
 * Bornes [début, fin[ d'un mois « YYYY-MM » : premier jour du mois et premier du suivant.
 */
export function monthRange(month: string): { from: string; to: string } {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!match || !match[1] || !match[2]) {
    throw new Error(SHIFTS_ERROR_MESSAGES.invalidMonth);
  }
  const year = Number(match[1]);
  const m = Number(match[2]);
  const nextYear = m === 12 ? year + 1 : year;
  const nextMonth = m === 12 ? 1 : m + 1;
  return {
    from: `${match[1]}-${match[2]}-01`,
    to: `${String(nextYear).padStart(4, "0")}-${String(nextMonth).padStart(2, "0")}-01`,
  };
}

/**
 * Transforme les lignes de la base en modèle : IST, Soll et solde viennent de @heute/domain.
 */
export function toMyShiftsView(
  month: string,
  rows: readonly ShiftRow[],
  sollMinutes: number,
): MyShiftsView {
  const shifts: ShiftInputWithHistory[] = [...rows]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((row) => ({
      date: row.date,
      type: row.type,
      start1: row.start1,
      end1: row.end1,
      start2: row.start2,
      end2: row.end2,
      break_min: row.break_min,
      updated_at: row.updated_at,
    }));
  return createMyShiftsView(month, shifts, sollMinutes);
}

/**
 * Lit mes services du mois et mon Soll avec la session de l'utilisateur :
 * la RLS fait foi. Le filtre sur user_id / employee_id identifie « moi », il ne gère pas de droits.
 */
export async function fetchMyShifts(
  month: string,
  client: ShiftsSupabaseClient = supabase,
): Promise<MyShiftsView> {
  const { from, to } = monthRange(month);

  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) {
    throw mapShiftsError(sessionError);
  }
  const userId = sessionData.session?.user.id;
  if (!userId) {
    throw Object.assign(new Error(SHIFTS_ERROR_MESSAGES.fetchFailed), { code: "PGRST301" });
  }

  const { data: employee, error: employeeError } = await client
    .from("employees")
    .select("id, soll_min_month")
    .eq("user_id", userId)
    .maybeSingle();
  if (employeeError) {
    throw mapShiftsError(employeeError);
  }
  if (!employee) {
    throw new Error(SHIFTS_ERROR_MESSAGES.fetchFailed);
  }

  const { data, error } = await client
    .from("shifts")
    .select("date, type, start1, end1, start2, end2, break_min, updated_at")
    .eq("employee_id", employee.id)
    .gte("date", from)
    .lt("date", to)
    .order("date");
  if (error) {
    throw mapShiftsError(error);
  }

  return toMyShiftsView(month, data ?? [], employee.soll_min_month);
}
