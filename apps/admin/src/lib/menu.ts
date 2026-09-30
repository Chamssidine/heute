export type MenuMeal = "mittag" | "abend";

export type MenuDraft = { mainDish: string; vegVariant: string; dessert: string };

export const MENU_MEALS: readonly MenuMeal[] = ["mittag", "abend"];

// Code Postgres « insufficient_privilege » : renvoyé par PostgREST quand la RLS refuse l'écriture.
const RLS_DENIED_CODE = "42501";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toIso(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function fromIso(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
}

// Lundi de la semaine contenant `now` (jour local).
export function currentWeekStart(now: Date = new Date()): string {
  const local = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const sinceMonday = (local.getUTCDay() + 6) % 7;
  local.setUTCDate(local.getUTCDate() - sinceMonday);
  return toIso(local);
}

export function shiftWeek(weekStart: string, delta: number): string {
  const d = fromIso(weekStart);
  d.setUTCDate(d.getUTCDate() + delta * 7);
  return toIso(d);
}

export function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = fromIso(weekStart);
    d.setUTCDate(d.getUTCDate() + i);
    return toIso(d);
  });
}

export function menuKey(date: string, meal: MenuMeal): string {
  return `${date}|${meal}`;
}

// Chaîne vide -> null pour les champs optionnels.
export function menuRow(date: string, meal: MenuMeal, draft: MenuDraft) {
  return {
    date,
    meal,
    main_dish: draft.mainDish.trim(),
    veg_variant: draft.vegVariant.trim() || null,
    dessert: draft.dessert.trim() || null,
  };
}

export function isRlsDenied(error: { code?: string }): boolean {
  return error.code === RLS_DENIED_CODE;
}
