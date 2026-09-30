import { strings } from "../../../strings/index.ts";
import type { MenuItem } from "../model.ts";

export interface MealDisplayInfo {
  label: string;
  dishText: string;
  details: string;
  isMuted: boolean;
}

export interface BuildMealDisplayParams {
  label: string;
  item: MenuItem | null;
  isCancelled: boolean;
  cancelledText: string;
}

/**
 * Prépare les textes et l'état visuel d'un bloc de repas du menu.
 * L'annulation est basée strictement sur noLunch / noDinner (comme buildKitchenMealTiles).
 * Quand aucun menu n'est saisi sans annulation (item === null), un texte neutre est affiché
 * (« Menü noch nicht eingetragen ») avec un style atténué.
 */
export function buildMealDisplayInfo({
  label,
  item,
  isCancelled,
  cancelledText,
}: BuildMealDisplayParams): MealDisplayInfo {
  const details = item
    ? [
        item.vegVariant ? `${strings.kitchen.vegPrefix}: ${item.vegVariant}` : "",
        item.dessert ? `${strings.kitchen.dessertPrefix}: ${item.dessert}` : "",
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  let dishText: string;
  let isMuted = false;

  if (isCancelled) {
    dishText = cancelledText;
    isMuted = true;
  } else if (!item) {
    dishText = strings.kitchen.menuNotEntered;
    isMuted = true;
  } else {
    dishText = item.mainDish;
  }

  return {
    label,
    dishText,
    details: isCancelled ? "" : details,
    isMuted,
  };
}
