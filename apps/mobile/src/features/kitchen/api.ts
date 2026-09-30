import type { Database } from "@heute/domain";
import { supabase } from "../../lib/supabase/index.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildKitchenDay,
  formatStand,
  type KitchenDay,
  type KitchenMealCountRow,
  type KitchenMenuItemRow,
  type KitchenTotalsRow,
} from "./model.ts";

export type KitchenSupabaseClient = SupabaseClient<Database>;

export const KITCHEN_ERROR_MESSAGES = {
  fetchFailed: "Küche konnte nicht geladen werden. Bitte erneut versuchen.",
  networkError: "Keine Verbindung. Küche konnte nicht geladen werden.",
} as const;

const REQUEST_TIMEOUT_MS = 10_000;

/** Erreur déjà traduite : ne doit pas être re-mappée. */
export class KitchenError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "KitchenError";
    this.code = code;
  }
}

/**
 * Message utilisateur en allemand ; le texte brut de la base n'est jamais repris
 * (les lignes de repas contiennent des allergies, donnée sensible).
 * Les erreurs d'authentification (401 / JWT) gardent leur code pour que toViewState
 * produise l'état « unauthorized ».
 */
export function mapKitchenError(error: unknown): Error {
  if (error instanceof KitchenError) {
    return error;
  }
  const obj =
    typeof error === "object" && error !== null ? (error as Record<string, unknown>) : null;
  const code = obj && typeof obj.code === "string" ? obj.code : undefined;
  const message = obj && typeof obj.message === "string" ? obj.message : "";

  if (code === "PGRST301" || obj?.status === 401) {
    return new KitchenError("Nicht angemeldet.", "PGRST301");
  }
  if (/network|offline|failed to fetch|abort|timeout/i.test(message)) {
    return new KitchenError(KITCHEN_ERROR_MESSAGES.networkError);
  }
  return new KitchenError(KITCHEN_ERROR_MESSAGES.fetchFailed);
}

/**
 * Lit la journée cuisine avec la session de l'utilisateur : la RLS décide de ce qui est visible
 * (aucun filtre de droits côté app). `updatedAt` = heure de la réponse du serveur.
 */
export async function fetchKitchenDay(
  date: string,
  client: KitchenSupabaseClient = supabase as unknown as KitchenSupabaseClient,
): Promise<KitchenDay> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const [counts, menu, totals] = await Promise.all([
      client
        .from("meal_counts")
        .select("meal, total, veg, vegan, mos, note, allergies, bookings ( matchcode )")
        .eq("date", date)
        .abortSignal(controller.signal),
      client
        .from("menu_items")
        .select("meal, main_dish, veg_variant, dessert")
        .eq("date", date)
        .abortSignal(controller.signal),
      client.rpc("meal_totals", { from_date: date, to_date: date }).abortSignal(controller.signal),
    ]);

    const failure = counts.error ?? menu.error ?? totals.error;
    if (failure) {
      throw mapKitchenError(failure);
    }

    return buildKitchenDay({
      date,
      mealCounts: (counts.data ?? []) as unknown as KitchenMealCountRow[],
      menuItems: (menu.data ?? []) as KitchenMenuItemRow[],
      totals: (totals.data ?? []) as KitchenTotalsRow[],
      updatedAt: formatStand(Date.now()),
    });
  } catch (err) {
    throw mapKitchenError(err);
  } finally {
    clearTimeout(timer);
  }
}

export const kitchenApi = { fetchKitchenDay, mapKitchenError };
