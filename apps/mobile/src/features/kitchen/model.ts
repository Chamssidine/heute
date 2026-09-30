import { formatHHMM, type Database } from "@heute/domain";
import { applyChangeIndicator, type ChangeIndicator } from "../../lib/query/lastSeen/index.ts";

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
 * Ancienne valeur d'un total de repas modifié (VG-05 / tokens.md §4.4).
 */
export interface MealTotalPrevious {
  total?: number;
  veg?: number;
  vegan?: number;
  mos?: number;
  al?: number;
}

/**
 * Total d'un repas pour la journée, incluant les régimes.
 */
export interface MealTotal extends DietCounts, ChangeIndicator<MealTotalPrevious> {
  meal: MealType;
  total: number;
}

/**
 * Totaux journaliers consolidés par repas (screens.md §6.3).
 */
export type KitchenTotals = Record<MealType, MealTotal>;

/**
 * Ancienne valeur d'un repas de groupe modifié.
 */
export interface KitchenGroupMealPrevious extends Partial<DietCounts> {
  count?: number;
}

/**
 * Repas individuel au sein d'une réservation / groupe.
 * Si une heure spécifique est requise (ex. grill), elle est stockée en minutes depuis minuit.
 * note et allergies sont stockés au niveau du repas conformément au schéma public.meal_counts.
 */
export interface KitchenGroupMeal extends DietCounts, ChangeIndicator<KitchenGroupMealPrevious> {
  meal: MealType;
  count: number;
  time?: number | null;
  note?: string | null;
  allergies?: Record<string, number>;
}

/**
 * Détail d'un groupe / réservation pour la journée (screens.md §6.3).
 * Les régimes, notes et allergies sont portés par chaque repas (meals[]).
 */
export interface KitchenGroupDetail {
  matchcode: string;
  meals: KitchenGroupMeal[];
}

/**
 * Ancienne valeur d'un plat de menu modifié (VG-05 / tokens.md §4.4).
 */
export interface MenuItemPrevious {
  mainDish?: string;
  vegVariant?: string | null;
  dessert?: string | null;
}

/**
 * Plat ou composante du menu du jour (Speiseplan).
 */
export interface MenuItem extends ChangeIndicator<MenuItemPrevious> {
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
 * Formate les régimes et allergies selon l'ordre strict : VEG · vegan · MOS · AL (tokens.md §4.3).
 */
export function formatDietsSummary(diets: DietCounts, allergies?: Record<string, number>): string {
  const parts: string[] = [];

  if (diets.veg > 0) parts.push(`VEG ${diets.veg}`);
  if (diets.vegan > 0) parts.push(`vegan ${diets.vegan}`);
  if (diets.mos > 0) parts.push(`MOS ${diets.mos}`);

  if (diets.al > 0) {
    if (allergies && Object.keys(allergies).length > 0) {
      const details = Object.entries(allergies)
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
  totals?: KitchenTotals;
  totalsChanges?: Partial<Record<MealType, { updated_at?: string; previous?: MealTotalPrevious }>>;
}): KitchenDay {
  const totals = params.totals ?? calculateKitchenTotals(params.groups);

  if (params.totalsChanges) {
    for (const [meal, change] of Object.entries(params.totalsChanges) as [
      MealType,
      { updated_at?: string; previous?: MealTotalPrevious },
    ][]) {
      if (totals[meal] && change) {
        totals[meal].updated_at = change.updated_at;
        totals[meal].previous = change.previous;
      }
    }
  }

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

type MealCountRow = Database["public"]["Tables"]["meal_counts"]["Row"];
type MenuItemRow = Database["public"]["Tables"]["menu_items"]["Row"];
type MealTotalsRow = Database["public"]["Functions"]["meal_totals"]["Returns"][number];

/**
 * Ligne de `meal_counts` avec la réservation jointe (PostgREST renvoie un objet ou un tableau).
 */
export type KitchenMealCountRow = Pick<
  MealCountRow,
  "meal" | "total" | "veg" | "vegan" | "mos" | "note" | "allergies"
> & {
  bookings: { matchcode: string } | { matchcode: string }[] | null;
};

export type KitchenMenuItemRow = Pick<
  MenuItemRow,
  "meal" | "main_dish" | "veg_variant" | "dessert"
>;

export type KitchenTotalsRow = Pick<
  MealTotalsRow,
  "meal" | "total" | "veg" | "vegan" | "mos" | "allergies"
>;

/**
 * `allergies` est un jsonb { allergène: nombre } : AL = somme des valeurs (comme `meal_totals`).
 * Les valeurs invalides sont ignorées ; aucun détail n'est journalisé.
 */
function parseAllergies(value: MealCountRow["allergies"]): Record<string, number> {
  const result: Record<string, number> = {};
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return result;
  }
  for (const [key, count] of Object.entries(value)) {
    if (typeof count === "number" && Number.isInteger(count) && count > 0) {
      result[key] = count;
    }
  }
  return result;
}

function toMenuItem(
  rows: readonly KitchenMenuItemRow[],
  meal: "mittag" | "abend",
): MenuItem | null {
  const row = rows.find((r) => r.meal === meal);
  return row
    ? { meal, mainDish: row.main_dish, vegVariant: row.veg_variant, dessert: row.dessert }
    : null;
}

/**
 * Transforme les lignes de la base en KitchenDay. Les totaux viennent de `meal_totals`
 * (source identique à l'admin) ; sans ligne, ils sont recalculés depuis les groupes.
 * Les repas à 0 sont ignorés pour ne pas afficher de ligne vide.
 */
export function buildKitchenDay(params: {
  date: string;
  mealCounts: readonly KitchenMealCountRow[];
  menuItems: readonly KitchenMenuItemRow[];
  totals: readonly KitchenTotalsRow[];
  updatedAt?: string;
}): KitchenDay {
  const byMatchcode = new Map<string, KitchenGroupMeal[]>();
  for (const row of params.mealCounts) {
    if (row.total <= 0) continue;
    const booking = Array.isArray(row.bookings) ? row.bookings[0] : row.bookings;
    const matchcode = booking?.matchcode ?? "";
    const allergies = parseAllergies(row.allergies);
    const meal: KitchenGroupMeal = {
      meal: row.meal,
      count: row.total,
      veg: row.veg,
      vegan: row.vegan,
      mos: row.mos,
      al: Object.values(allergies).reduce((sum, n) => sum + n, 0),
      note: row.note,
    };
    if (Object.keys(allergies).length > 0) meal.allergies = allergies;
    byMatchcode.set(matchcode, [...(byMatchcode.get(matchcode) ?? []), meal]);
  }

  const order = (m: KitchenGroupMeal) => MEAL_TYPES.indexOf(m.meal);
  const groups: KitchenGroupDetail[] = [...byMatchcode.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "de"))
    .map(([matchcode, meals]) => ({ matchcode, meals: meals.sort((a, b) => order(a) - order(b)) }));

  let totals: KitchenTotals | undefined;
  if (params.totals.length > 0) {
    totals = calculateKitchenTotals([]);
    for (const row of params.totals) {
      totals[row.meal] = {
        meal: row.meal,
        total: row.total,
        veg: row.veg,
        vegan: row.vegan,
        mos: row.mos,
        al: row.allergies,
      };
    }
  }

  return createKitchenDay({
    date: params.date,
    groups,
    totals,
    menu: {
      mittag: toMenuItem(params.menuItems, "mittag"),
      abend: toMenuItem(params.menuItems, "abend"),
    },
    updatedAt: params.updatedAt,
  });
}

/**
 * Heure « Stand HH:MM » (Europe/Berlin) d'un instant en millisecondes.
 */
export function formatStand(timestampMs: number): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(timestampMs));
}

/**
 * Une journée sans aucun repas ni menu est « vide » (écran empty).
 */
export function isKitchenDayEmpty(day: KitchenDay): boolean {
  const hasMeals = MEAL_TYPES.some((m) => day.totals[m].total > 0);
  return (
    !hasMeals && day.groups.length === 0 && day.menu.mittag === null && day.menu.abend === null
  );
}

/**
 * Applique l'indicateur changed: true et previous sur les éléments de KitchenDay
 * selon la dernière consultation (lastSeen).
 * Règle d'acceptation 3 : première ouverture (lastSeen null) -> rien n'est marqué.
 * Règle d'acceptation 2 : updated_at > lastSeen -> changed: true et previous (ancienne valeur).
 */
export function applyKitchenDayChanges(day: KitchenDay, lastSeen?: string | null): KitchenDay {
  const markMealTotal = (m: MealTotal): MealTotal => applyChangeIndicator(m, lastSeen);
  const markMenuItem = (item: MenuItem | null): MenuItem | null =>
    item ? applyChangeIndicator(item, lastSeen) : null;

  return {
    ...day,
    totals: {
      frueh: markMealTotal(day.totals.frueh),
      mittag: markMealTotal(day.totals.mittag),
      abend: markMealTotal(day.totals.abend),
      lunchpaket: markMealTotal(day.totals.lunchpaket),
      grill: markMealTotal(day.totals.grill),
    },
    menu: {
      mittag: markMenuItem(day.menu.mittag),
      abend: markMenuItem(day.menu.abend),
    },
    groups: day.groups.map((g) => ({
      ...g,
      meals: g.meals.map((m) => applyChangeIndicator(m, lastSeen)),
    })),
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
    note: "1× Nudeln/Müsli",
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
    allergies: { laktose: 1 },
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
  },
  {
    matchcode: "TSV MUSTER/40002",
    meals: tsvMeals,
  },
  {
    matchcode: "TESTCHOR/40003",
    meals: testchorMeals,
  },
  {
    matchcode: "Einzelgäste_27+",
    meals: einzelgaesteMeals,
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
    updated_at: "2026-09-30T12:05:00Z", // 14:05 Europe/Berlin
    previous: {
      mainDish: "Hähnchenschenkel",
      vegVariant: "Gemüsespieß",
      dessert: "Grießbrei",
    },
  },
};

export const kitchenDayFixture: KitchenDay = createKitchenDay({
  date: "2026-09-30",
  groups: KITCHEN_FIXTURE_GROUPS,
  menu: KITCHEN_FIXTURE_MENU,
  noLunch: false,
  noDinner: false,
  updatedAt: "14:32",
  totalsChanges: {
    abend: {
      updated_at: "2026-09-30T12:05:00Z", // 14:05 Europe/Berlin
      previous: {
        total: 13,
      },
    },
  },
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
