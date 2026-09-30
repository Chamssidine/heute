import { formatDietsSummary, MEAL_SHORT_LABELS, type KitchenGroupMeal } from "../model.ts";

/**
 * Construit les lignes de détail pour les repas d'un groupe (régimes, allergies, notes).
 * Chaque ligne est préfixée par MEAL_SHORT_LABELS[meal.meal] pour identifier sans ambiguïté
 * le repas concerné pour l'équipe en cuisine (screens.md §6.3).
 */
export function buildGroupDetailLines(meals: readonly KitchenGroupMeal[]): string[] {
  const detailLines: string[] = [];

  for (const meal of meals) {
    const diets = formatDietsSummary(meal, meal.allergies);
    const note = meal.note ? `„${meal.note}“` : "";
    const details = [diets, note].filter(Boolean).join(" · ");
    if (details) {
      const line = `${MEAL_SHORT_LABELS[meal.meal]}: ${details}`;
      if (!detailLines.includes(line)) {
        detailLines.push(line);
      }
    }
  }

  return detailLines;
}
