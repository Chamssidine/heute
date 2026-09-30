export const MEAL_NOTE_MAX = 120;

// Repas saisis par groupe (lunchpaket et grill hors périmètre de cette page).
export const PAGE_MEALS = ["frueh", "mittag", "abend"] as const;
export type PageMeal = (typeof PAGE_MEALS)[number];

export type MealFormValues = {
  total: string;
  veg: string;
  vegan: string;
  mos: string;
  note: string;
};

export type MealFormError = "invalidNumber" | "dietsExceedTotal" | "noteTooLong";

export type MealFormResult =
  | {
      ok: true;
      value: { total: number; veg: number; vegan: number; mos: number; note: string | null };
    }
  | { ok: false; error: MealFormError };

export const EMPTY_FORM: MealFormValues = { total: "0", veg: "0", vegan: "0", mos: "0", note: "" };

function parseCount(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d{1,4}$/.test(trimmed)) {
    return null;
  }
  return Number(trimmed);
}

// Reprend les contraintes du schéma : entiers ≥ 0, veg/vegan/mos ≤ total, note ≤ 120.
export function validateMealForm(form: MealFormValues): MealFormResult {
  const total = parseCount(form.total);
  const veg = parseCount(form.veg);
  const vegan = parseCount(form.vegan);
  const mos = parseCount(form.mos);
  if (total === null || veg === null || vegan === null || mos === null) {
    return { ok: false, error: "invalidNumber" };
  }
  if (veg > total || vegan > total || mos > total) {
    return { ok: false, error: "dietsExceedTotal" };
  }
  const note = form.note.trim();
  if (note.length > MEAL_NOTE_MAX) {
    return { ok: false, error: "noteTooLong" };
  }
  return { ok: true, value: { total, veg, vegan, mos, note: note === "" ? null : note } };
}

export type MealCountRow = { meal: string; total: number; veg: number; vegan: number; mos: number };

export type MealTotals = Record<
  PageMeal,
  { total: number; veg: number; vegan: number; mos: number }
>;

export function mealTotals(rows: readonly MealCountRow[]): MealTotals {
  const totals: MealTotals = {
    frueh: { total: 0, veg: 0, vegan: 0, mos: 0 },
    mittag: { total: 0, veg: 0, vegan: 0, mos: 0 },
    abend: { total: 0, veg: 0, vegan: 0, mos: 0 },
  };
  for (const row of rows) {
    const t = (PAGE_MEALS as readonly string[]).includes(row.meal)
      ? totals[row.meal as PageMeal]
      : undefined;
    if (t) {
      t.total += row.total;
      t.veg += row.veg;
      t.vegan += row.vegan;
      t.mos += row.mos;
    }
  }
  return totals;
}

export function todayIso(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
