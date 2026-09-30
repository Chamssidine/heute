import { formatHHMM, type Database } from "@heute/domain";

/**
 * Types de repas du modèle de données (public.meal).
 */
export type MealType = Database["public"]["Enums"]["meal"];

/**
 * Liste ordonnée de tous les types de repas supportés.
 */
export const MEAL_TYPES: readonly MealType[] = [
  "frueh",
  "mittag",
  "abend",
  "lunchpaket",
  "grill",
] as const;

/**
 * Libellés complets allemands des repas (docs/design/copy.md §7.1).
 */
export const MEAL_LABELS: Record<MealType, string> = {
  frueh: "Frühstück",
  mittag: "Mittagessen",
  abend: "Abendessen",
  lunchpaket: "Lunchpaket",
  grill: "Grillen",
};

/**
 * Libellés courts allemands pour l'affichage écran (screens.md §6.3, copy.md §7.1).
 */
export const MEAL_SHORT_LABELS: Record<MealType, string> = {
  frueh: "Früh",
  mittag: "Mittag",
  abend: "Abend",
  lunchpaket: "LP",
  grill: "GR",
};

/**
 * Libellés des régimes et variantes selon docs/design/tokens.md §4.3 et copy.md §7.1.
 */
export const DIET_LABELS = {
  veg: "Vegetarisch",
  vegan: "Vegan",
  mos: "ohne Schweinefleisch",
  al: "Allergien",
} as const;

/**
 * Décompte des régimes alimentaires (docs/design/tokens.md §4.3).
 * Ordre d'affichage conventionnel : VEG · vegan · MOS · AL.
 */
export interface DietCounts {
  veg: number;
  vegan: number;
  mos: number;
  al: number;
}

/**
 * Total d'un repas pour la journée, incluant les régimes.
 */
export interface MealTotal extends DietCounts {
  meal: MealType;
  total: number;
}

/**
 * Totaux journaliers consolidés par repas (screens.md §6.3).
 */
export type KitchenTotals = Record<MealType, MealTotal>;

/**
 * Repas individuel au sein d'une réservation / groupe.
 * Si une heure spécifique est requise (ex. grill), elle est stockée en minutes depuis minuit.
 */
export interface KitchenGroupMeal extends DietCounts {
  meal: MealType;
  count: number;
  time?: number | null;
}

/**
 * Détail d'un groupe / réservation pour la journée (screens.md §6.3).
 */
export interface KitchenGroupDetail {
  matchcode: string;
  meals: KitchenGroupMeal[];
  diets: DietCounts;
  note?: string | null;
  allergens?: Record<string, number>;
}

/**
 * Plat ou composante du menu du jour (Speiseplan).
 */
export interface MenuItem {
  meal: "mittag" | "abend";
  mainDish: string;
  vegVariant: string | null;
  dessert: string | null;
}

/**
 * Menu du jour pour le midi et le soir.
 */
export interface KitchenDayMenu {
  mittag: MenuItem | null;
  abend: MenuItem | null;
}

/**
 * Vue complète d'une journée cuisine (Küche).
 * Contrat exposé à l'interface (Agent U).
 */
export interface KitchenDay {
  date: string;
  totals: KitchenTotals;
  groups: KitchenGroupDetail[];
  menu: KitchenDayMenu;
  noLunch: boolean;
  noDinner: boolean;
  updatedAt?: string;
}

/**
 * Calcule les régimes agrégés d'un groupe à partir de ses repas.
 */
export function calculateGroupDiets(meals: readonly KitchenGroupMeal[]): DietCounts {
  let veg = 0;
  let vegan = 0;
  let mos = 0;
  let al = 0;

  for (const m of meals) {
    veg += m.veg;
    vegan += m.vegan;
    mos += m.mos;
    al += m.al;
  }

  return { veg, vegan, mos, al };
}

/**
 * Calcule les totaux par repas à partir des groupes.
 */
export function calculateKitchenTotals(groups: readonly KitchenGroupDetail[]): KitchenTotals {
  const initMeal = (meal: MealType): MealTotal => ({
    meal,
    total: 0,
    veg: 0,
    vegan: 0,
    mos: 0,
    al: 0,
  });

  const totals: KitchenTotals = {
    frueh: initMeal("frueh"),
    mittag: initMeal("mittag"),
    abend: initMeal("abend"),
    lunchpaket: initMeal("lunchpaket"),
    grill: initMeal("grill"),
  };

  for (const group of groups) {
    for (const m of group.meals) {
      const target = totals[m.meal];
      target.total += m.count;
      target.veg += m.veg;
      target.vegan += m.vegan;
      target.mos += m.mos;
      target.al += m.al;
    }
  }

  return totals;
}

/**
 * Formate un résumé court des repas d'un groupe pour l'en-tête (ex: « Mittag LP 80 · Abend 68 »).
 */
export function formatGroupMealsSummary(meals: readonly KitchenGroupMeal[]): string {
  return meals
    .map((m) => {
      const label = MEAL_SHORT_LABELS[m.meal];
      if (m.meal === "lunchpaket") {
        return `Mittag LP ${m.count}`;
      }
      if (m.meal === "grill") {
        return m.time != null ? `GR ${m.count} (${formatHHMM(m.time)})` : `GR ${m.count}`;
      }
      return `${label} ${m.count}`;
    })
    .join(" · ");
}

/**
 * Formate les régimes et allergènes selon l'ordre strict : VEG · vegan · MOS · AL (tokens.md §4.3).
 */
export function formatDietsSummary(diets: DietCounts, allergens?: Record<string, number>): string {
  const parts: string[] = [];

  if (diets.veg > 0) parts.push(`VEG ${diets.veg}`);
  if (diets.vegan > 0) parts.push(`vegan ${diets.vegan}`);
  if (diets.mos > 0) parts.push(`MOS ${diets.mos}`);

  if (diets.al > 0) {
    if (allergens && Object.keys(allergens).length > 0) {
      const details = Object.entries(allergens)
        .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1))
        .join(", ");
      parts.push(`AL ${diets.al} (${details})`);
    } else {
      parts.push(`AL ${diets.al}`);
    }
  }

  return parts.join(" · ");
}

/**
 * Construit un objet KitchenDay cohérent.
 */
export function createKitchenDay(params: {
  date: string;
  groups: readonly KitchenGroupDetail[];
  menu: KitchenDayMenu;
  noLunch?: boolean;
  noDinner?: boolean;
  updatedAt?: string;
}): KitchenDay {
  const totals = calculateKitchenTotals(params.groups);

  const noLunch = params.noLunch ?? totals.mittag.total === 0;
  const noDinner = params.noDinner ?? (totals.abend.total === 0 && totals.grill.total === 0);

  return {
    date: params.date,
    totals,
    groups: [...params.groups],
    menu: params.menu,
    noLunch,
    noDinner,
    updatedAt: params.updatedAt,
  };
}

/**
 * Fixture réaliste pour une journée complète (mardi 30.09.2026, Stand 14:32).
 * Données strictement fictives (aucun nom réel, codes inventés).
 * Inclut :
 * - 80 Lunchpakete pour MUSTERSCHULE/40001 avec note « 1× Nudeln/Müsli »
 * - Grillen 18:00 pour TSV MUSTER/40002
 * - Totaux cohérents : Früh 121, Mittag 38, LP 80, Abend 25 (VEG 10, vegan 2, MOS 9, AL 1), GR 12.
 */
const musterschuleMeals: KitchenGroupMeal[] = [
  {
    meal: "lunchpaket",
    count: 80,
    veg: 8,
    vegan: 0,
    mos: 4,
    al: 0,
  },
  {
    meal: "abend",
    count: 12,
    veg: 5,
    vegan: 0,
    mos: 4,
    al: 0,
  },
];

const tsvMeals: KitchenGroupMeal[] = [
  {
    meal: "abend",
    count: 12,
    veg: 4,
    vegan: 2,
    mos: 4,
    al: 1,
  },
  {
    meal: "grill",
    count: 12,
    veg: 0,
    vegan: 0,
    mos: 0,
    al: 0,
    time: 18 * 60,
  },
];

const testchorMeals: KitchenGroupMeal[] = [
  {
    meal: "frueh",
    count: 118,
    veg: 15,
    vegan: 5,
    mos: 10,
    al: 0,
  },
  {
    meal: "mittag",
    count: 38,
    veg: 6,
    vegan: 2,
    mos: 5,
    al: 0,
  },
];

const einzelgaesteMeals: KitchenGroupMeal[] = [
  {
    meal: "frueh",
    count: 3,
    veg: 0,
    vegan: 0,
    mos: 0,
    al: 0,
  },
  {
    meal: "abend",
    count: 1,
    veg: 1,
    vegan: 0,
    mos: 1,
    al: 0,
  },
];

export const KITCHEN_FIXTURE_GROUPS: readonly KitchenGroupDetail[] = [
  {
    matchcode: "MUSTERSCHULE/40001",
    meals: musterschuleMeals,
    diets: calculateGroupDiets(musterschuleMeals),
    note: "1× Nudeln/Müsli",
  },
  {
    matchcode: "TSV MUSTER/40002",
    meals: tsvMeals,
    diets: calculateGroupDiets(tsvMeals),
    allergens: { laktose: 1 },
  },
  {
    matchcode: "TESTCHOR/40003",
    meals: testchorMeals,
    diets: calculateGroupDiets(testchorMeals),
  },
  {
    matchcode: "Einzelgäste_27+",
    meals: einzelgaesteMeals,
    diets: calculateGroupDiets(einzelgaesteMeals),
  },
];

export const KITCHEN_FIXTURE_MENU: KitchenDayMenu = {
  mittag: {
    meal: "mittag",
    mainDish: "Chili con Carne mit Nudeln",
    vegVariant: "Chili sin Carne",
    dessert: "Obstsalat",
  },
  abend: {
    meal: "abend",
    mainDish: "Zitronenhähnchen mit Kartoffeln",
    vegVariant: "Gemüsebratling",
    dessert: "Grießbrei",
  },
};

export const kitchenDayFixture: KitchenDay = createKitchenDay({
  date: "2026-09-30",
  groups: KITCHEN_FIXTURE_GROUPS,
  menu: KITCHEN_FIXTURE_MENU,
  noLunch: false,
  noDinner: false,
  updatedAt: "14:32",
});

/**
 * Fixture d'un jour sans déjeuner (« Kein Mittagessen », ex. journée de clôture ou excursion).
 */
export const kitchenDayNoLunchFixture: KitchenDay = createKitchenDay({
  date: "2026-10-05",
  groups: [
    {
      matchcode: "Einzelgäste_27+",
      meals: [
        {
          meal: "frueh",
          count: 5,
          veg: 1,
          vegan: 0,
          mos: 0,
          al: 0,
        },
        {
          meal: "abend",
          count: 5,
          veg: 1,
          vegan: 0,
          mos: 0,
          al: 0,
        },
      ],
      diets: {
        veg: 2,
        vegan: 0,
        mos: 0,
        al: 0,
      },
    },
  ],
  menu: {
    mittag: null,
    abend: {
      meal: "abend",
      mainDish: "Kartoffelsuppe",
      vegVariant: "Kartoffelsuppe ohne Speck",
      dessert: null,
    },
  },
  noLunch: true,
  noDinner: false,
  updatedAt: "08:15",
});
