import { strings } from "../../../strings/index.ts";
import type { ChipVariant } from "../../../lib/theme/colors.ts";
import { MEAL_SHORT_LABELS, type KitchenTotals, type MealTotal, type MealType } from "../model.ts";

export interface MealChipData {
  key: string;
  variant: ChipVariant;
  label: string;
  count: number;
}

export interface MealTileConfig {
  meal: MealType;
  label: string;
  count: number;
  isCancelled: boolean;
  cancelledText?: string;
  chips: MealChipData[];
}

/**
 * Génère la liste des chips diététiques et variantes dans l'ordre strict défini par tokens.md §4.3 :
 * VEG · vegan · MOS · AL · LP · GR.
 */
export function buildMealChips(
  mealTotal: MealTotal,
  extraVariantChip?: MealChipData | null,
): MealChipData[] {
  const chips: MealChipData[] = [];

  if (mealTotal.veg > 0) {
    chips.push({
      key: `veg-${mealTotal.meal}`,
      variant: "veg",
      label: `VEG ${mealTotal.veg}`,
      count: mealTotal.veg,
    });
  }

  if (mealTotal.vegan > 0) {
    chips.push({
      key: `vegan-${mealTotal.meal}`,
      variant: "vegan",
      label: `vegan ${mealTotal.vegan}`,
      count: mealTotal.vegan,
    });
  }

  // MOS : chip neutre sans icône (tokens.md §4.3)
  if (mealTotal.mos > 0) {
    chips.push({
      key: `mos-${mealTotal.meal}`,
      variant: "mos",
      label: `MOS ${mealTotal.mos}`,
      count: mealTotal.mos,
    });
  }

  if (mealTotal.al > 0) {
    chips.push({
      key: `al-${mealTotal.meal}`,
      variant: "al",
      label: `AL ${mealTotal.al}`,
      count: mealTotal.al,
    });
  }

  if (extraVariantChip) {
    chips.push(extraVariantChip);
  }

  return chips;
}

export interface BuildKitchenMealTilesOptions {
  noLunch?: boolean;
  noDinner?: boolean;
}

/**
 * Prépare les données d'affichage des tuiles de décompte cuisine.
 * L'annulation est alignée sur les drapeaux de la journée (isCancelled = day.noLunch et isCancelled = day.noDinner).
 * Les chips (notamment LP pour Mittag, GR pour Abend) sont conservés même lorsque le repas est annulé.
 */
export function buildKitchenMealTiles(
  totals: KitchenTotals,
  options: BuildKitchenMealTilesOptions = {},
): Record<"frueh" | "mittag" | "abend", MealTileConfig> {
  const isMittagCancelled = options.noLunch ?? false;
  const isAbendCancelled = options.noDinner ?? false;

  const lpChip: MealChipData | null =
    totals.lunchpaket.total > 0
      ? {
          key: "lp",
          variant: "lp",
          label: `LP ${totals.lunchpaket.total}`,
          count: totals.lunchpaket.total,
        }
      : null;

  const grChip: MealChipData | null =
    totals.grill.total > 0
      ? {
          key: "gr",
          variant: "gr",
          label: `GR ${totals.grill.total}`,
          count: totals.grill.total,
        }
      : null;

  return {
    frueh: {
      meal: "frueh",
      label: MEAL_SHORT_LABELS.frueh,
      count: totals.frueh.total,
      isCancelled: false,
      chips: buildMealChips(totals.frueh),
    },
    mittag: {
      meal: "mittag",
      label: MEAL_SHORT_LABELS.mittag,
      count: totals.mittag.total,
      isCancelled: isMittagCancelled,
      cancelledText: strings.meals.noLunch,
      chips: buildMealChips(totals.mittag, lpChip),
    },
    abend: {
      meal: "abend",
      label: MEAL_SHORT_LABELS.abend,
      count: totals.abend.total,
      isCancelled: isAbendCancelled,
      cancelledText: strings.meals.noDinner,
      chips: buildMealChips(totals.abend, grChip),
    },
  };
}
