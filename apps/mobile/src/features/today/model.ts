import type { Database, ShiftInput } from "@heute/domain";
import type { ChangeIndicator } from "../../lib/query/lastSeen/index.ts";
import { strings } from "../../strings/index.ts";
import type { AppRole, Department } from "../auth/model.ts";
import {
  calculateKitchenTotals,
  formatDietsSummary,
  kitchenDayFixture,
  type KitchenDay,
  type KitchenDayMenu,
  type KitchenTotals,
  type MealTotal,
  type MealType,
  type MenuItem,
  type MenuItemPrevious,
} from "../kitchen/model.ts";
import { toShiftDay, type ShiftDay } from "../shifts/model.ts";
import {
  TASK_TYPE_SHORT_LABELS,
  tasksDayFixture,
  type TaskItem,
  type TasksDay,
} from "../tasks/model.ts";

/**
 * Identifiants canoniques des cartes de l'écran « Heute » selon screens.md §6.1.
 */
export type TodayCardId = "my_shift" | "my_tasks" | "guests" | "menu";

/**
 * Ordre des cartes pour Housekeeping et BFD selon docs/design/screens.md §6.1 :
 * Mein Dienst → Meine Aufgaben → Gäste heute → Menü.
 */
export const HOUSEKEEPING_BFD_CARD_ORDER: readonly TodayCardId[] = [
  "my_shift",
  "my_tasks",
  "guests",
  "menu",
] as const;

/**
 * Ordre des cartes pour Küche et Küchenleitung selon docs/design/screens.md §6.1 :
 * Mein Dienst → Gäste heute (avec régimes et changements) → Menü.
 */
export const KITCHEN_CARD_ORDER: readonly TodayCardId[] = ["my_shift", "guests", "menu"] as const;

/**
 * Mention permanente d'avertissement pour le Speiseplan (screens.md §6.1, copy.md).
 */
export const MENU_DISCLAIMER = "Änderungen vorbehalten – bei Allergien Küchenpersonal fragen";

/**
 * Représentation du service personnel pour la carte « Mein Dienst » (screens.md §6.1).
 */
export type TodayShift = ShiftDay;

/**
 * Détail de la tâche suivante affichée sur la carte « Meine Aufgaben » (HK-04 / screens.md §6.1).
 */
export interface TodayNextTask {
  id: string;
  title: string;
  floorLabel: string;
  typeLabel: string;
  label: string;
}

/**
 * Résumé de l'avancement des tâches pour la carte « Meine Aufgaben ».
 */
export interface TodayTasks {
  total: number;
  completed: number;
  progressLabel: string;
  nextTask: TodayNextTask | null;
  hasTasks: boolean;
}

/**
 * Résumé d'un repas du jour pour la carte « Gäste heute ».
 */
export interface TodayMealSummary extends ChangeIndicator<{
  count?: number;
}> {
  meal: MealType;
  label: string;
  count: number;
  subCount?: number;
  subLabel?: string;
  dietsSummary?: string | null;
  highlight?: boolean;
  changeNotice?: string | null;
}

/**
 * Données de la carte « Gäste heute ».
 */
export interface TodayGuests {
  frueh: TodayMealSummary;
  mittag: TodayMealSummary;
  abend: TodayMealSummary;
  lunchpaketCount: number;
  grillCount: number;
  totals: KitchenTotals;
  summaryLine: string;
}

/**
 * Détail d'un repas pour la carte « Menü ».
 */
export interface TodayMenuItem extends ChangeIndicator<MenuItemPrevious> {
  label: string;
  mainDish: string;
  vegVariant: string | null;
  formatted: string;
  dessert?: string | null;
}

/**
 * Données de la carte « Menü ».
 */
export interface TodayMenu {
  disclaimer: string;
  changed: boolean;
  mittag: TodayMenuItem | null;
  abend: TodayMenuItem | null;
  noLunch: boolean;
  noDinner: boolean;
  raw?: KitchenDayMenu;
}

/**
 * Modèle complet exposé à l'interface pour l'écran « Heute » (Agent U).
 * Compose mon service, mes tâches/progression, les convives du jour et le menu.
 */
export interface TodayView {
  date: string;
  dateLabel: string;
  lastUpdatedAt?: string;
  lastUpdatedLabel: string;
  cardOrder: TodayCardId[];
  isKitchenRole: boolean;
  isHousekeepingRole: boolean;
  myShift: TodayShift | null;
  myTasks: TodayTasks | null;
  guests: TodayGuests;
  menu: TodayMenu;
}

/**
 * Contexte de rôle ou département utilisateur pour déterminer l'affichage.
 */
export interface UserRoleOrDepartment {
  role?: AppRole | string;
  department?: Department | string;
}

/**
 * Détermine l'ordre des cartes selon le rôle / département conformément à docs/design/screens.md §6.1 :
 * - Housekeeping / BFD : Mein Dienst → Meine Aufgaben → Gäste heute → Menü.
 * - Küche / Küchenleitung : Mein Dienst → Gäste heute → Menü.
 */
export function getTodayCardOrder(
  roleOrDept?: UserRoleOrDepartment | string | null,
): TodayCardId[] {
  if (!roleOrDept) {
    return [...HOUSEKEEPING_BFD_CARD_ORDER];
  }

  const dept = (
    typeof roleOrDept === "string" ? roleOrDept : (roleOrDept.department ?? roleOrDept.role ?? "")
  )
    .toLowerCase()
    .trim();

  const role = (typeof roleOrDept === "object" ? (roleOrDept.role ?? "") : "").toLowerCase().trim();

  // Rôles cuisine : Küche ou Küchenleitung
  if (dept === "kueche" || role === "kitchen_lead" || dept === "kitchen_lead") {
    return [...KITCHEN_CARD_ORDER];
  }

  // Rôles ménage et volontariat : Housekeeping ou BFD
  if (dept === "housekeeping" || dept === "bfd") {
    return [...HOUSEKEEPING_BFD_CARD_ORDER];
  }

  return [...HOUSEKEEPING_BFD_CARD_ORDER];
}

/**
 * Heure « HH:MM » (Europe/Berlin) d'un instant ISO, ou null s'il est absent ou invalide.
 */
function formatBerlinTime(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Berlin",
  }).format(d);
}

/**
 * Formate l'indication de fraîcheur « Stand HH:MM » selon docs/design/copy.md §7.1.
 */
export function formatStandLabel(timeOrDate?: string | null): string {
  if (!timeOrDate) {
    return "Stand —";
  }

  const trimmed = timeOrDate.trim();
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    return `Stand ${trimmed}`;
  }

  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    const formatted = new Intl.DateTimeFormat("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Europe/Berlin",
    }).format(d);
    return `Stand ${formatted}`;
  }

  return `Stand ${trimmed}`;
}

/**
 * Formate la date courte selon docs/design/copy.md §7.2 (ex. « Di, 30.09. »).
 */
export function formatTodayDateHeader(dateStr: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match || !match[1] || !match[2] || !match[3]) {
    return dateStr;
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const weekday = new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    timeZone: "Europe/Berlin",
  })
    .format(d)
    .replace(/\.$/, "");

  const dayStr = String(day).padStart(2, "0");
  const monthStr = String(month).padStart(2, "0");

  return `${weekday}, ${dayStr}.${monthStr}.`;
}

/**
 * Formate la prochaine tâche selon screens.md §6.1 :
 * « Nächste: Zimmer 412 · 4. OG · Abreise »
 */
export function formatTodayNextTask(task: TaskItem): TodayNextTask {
  const shortType = TASK_TYPE_SHORT_LABELS[task.type] ?? task.typeLabel;
  const label = `${task.title} · ${task.floorLabel} · ${shortType}`;

  return {
    id: task.id,
    title: task.title,
    floorLabel: task.floorLabel,
    typeLabel: shortType,
    label,
  };
}

/**
 * Construit l'objet TodayTasks à partir d'un TasksDay.
 */
export function createTodayTasks(tasksDay?: TasksDay | null): TodayTasks | null {
  if (!tasksDay) {
    return null;
  }

  // Priorité à la tâche en cours (in_arbeit), sinon première tâche ouverte (offen)
  const nextOpenTask =
    tasksDay.allTasks.find((t) => t.status === "in_arbeit") ??
    tasksDay.allTasks.find((t) => t.status === "offen") ??
    null;

  return {
    total: tasksDay.total,
    completed: tasksDay.completed,
    progressLabel: tasksDay.progressLabel,
    nextTask: nextOpenTask ? formatTodayNextTask(nextOpenTask) : null,
    hasTasks: tasksDay.total > 0,
  };
}

/**
 * Construit l'objet TodayGuests à partir des totaux cuisine d'un KitchenDay.
 */
export function createTodayGuests(kitchenDay?: KitchenDay | null): TodayGuests {
  const defaultMeal = (meal: MealType) => ({
    meal,
    total: 0,
    veg: 0,
    vegan: 0,
    mos: 0,
    al: 0,
  });

  const totals: KitchenTotals = kitchenDay?.totals ?? {
    frueh: defaultMeal("frueh"),
    mittag: defaultMeal("mittag"),
    abend: defaultMeal("abend"),
    lunchpaket: defaultMeal("lunchpaket"),
    grill: defaultMeal("grill"),
  };

  const lpCount = totals.lunchpaket.total;
  const grCount = totals.grill.total;

  const formatChangeNotice = (total: MealTotal): string | null => {
    const count = total.previous?.total;
    if (count == null) return null;
    const time = formatBerlinTime(total.updated_at);
    if (time === null) return null;
    return strings.meals.modified(time, count);
  };

  const fruehSummary: TodayMealSummary = {
    meal: "frueh",
    label: "Früh",
    count: totals.frueh.total,
    dietsSummary:
      totals.frueh.total > 0
        ? formatDietsSummary({
            veg: totals.frueh.veg,
            vegan: totals.frueh.vegan,
            mos: totals.frueh.mos,
            al: totals.frueh.al,
          })
        : null,
    highlight: Boolean(totals.frueh.changed),
    changeNotice: totals.frueh.changed ? formatChangeNotice(totals.frueh) : null,
    updated_at: totals.frueh.updated_at,
    changed: totals.frueh.changed,
    previous: totals.frueh.previous ? { count: totals.frueh.previous.total } : undefined,
  };

  const mittagSummary: TodayMealSummary = {
    meal: "mittag",
    label: "Mittag",
    count: totals.mittag.total,
    subCount: lpCount > 0 ? lpCount : undefined,
    subLabel: lpCount > 0 ? `LP ${lpCount}` : undefined,
    dietsSummary:
      totals.mittag.total > 0
        ? formatDietsSummary({
            veg: totals.mittag.veg,
            vegan: totals.mittag.vegan,
            mos: totals.mittag.mos,
            al: totals.mittag.al,
          })
        : null,
    highlight: Boolean(totals.mittag.changed),
    changeNotice: totals.mittag.changed ? formatChangeNotice(totals.mittag) : null,
    updated_at: totals.mittag.updated_at,
    changed: Boolean(totals.mittag.changed),
    previous: totals.mittag.previous ? { count: totals.mittag.previous.total } : undefined,
  };

  const abendSummary: TodayMealSummary = {
    meal: "abend",
    label: "Abend",
    count: totals.abend.total,
    subCount: grCount > 0 ? grCount : undefined,
    subLabel: grCount > 0 ? `GR ${grCount}` : undefined,
    dietsSummary:
      totals.abend.total > 0
        ? formatDietsSummary({
            veg: totals.abend.veg,
            vegan: totals.abend.vegan,
            mos: totals.abend.mos,
            al: totals.abend.al,
          })
        : null,
    highlight: totals.abend.changed !== undefined ? totals.abend.changed : totals.abend.total > 0,
    changeNotice: totals.abend.changed ? formatChangeNotice(totals.abend) : null,
    updated_at: totals.abend.updated_at,
    changed: Boolean(totals.abend.changed),
    previous: totals.abend.previous ? { count: totals.abend.previous.total } : undefined,
  };

  // Résumé condensé en une ligne selon screens.md §6.1
  const summaryParts: string[] = [];
  summaryParts.push(`Früh ${totals.frueh.total}`);

  if (lpCount > 0) {
    summaryParts.push(`Mittag ${totals.mittag.total} · LP ${lpCount}`);
  } else {
    summaryParts.push(`Mittag ${totals.mittag.total}`);
  }

  summaryParts.push(`Abend ${totals.abend.total}`);

  return {
    frueh: fruehSummary,
    mittag: mittagSummary,
    abend: abendSummary,
    lunchpaketCount: lpCount,
    grillCount: grCount,
    totals,
    summaryLine: summaryParts.join("     "),
  };
}

/**
 * Formate un élément de menu (Speiseplan).
 */
export function formatTodayMenuItem(item: MenuItem | null, label: string): TodayMenuItem | null {
  if (!item || !item.mainDish) {
    return null;
  }

  const formatted = item.vegVariant ? `${item.mainDish} · Veg: ${item.vegVariant}` : item.mainDish;

  return {
    label,
    mainDish: item.mainDish,
    vegVariant: item.vegVariant,
    formatted,
    dessert: item.dessert,
    updated_at: item.updated_at,
    changed: item.changed,
    previous: item.previous,
  };
}

/**
 * Construit l'objet TodayMenu à partir d'un KitchenDay.
 */
export function createTodayMenu(kitchenDay?: KitchenDay | null): TodayMenu {
  const menu = kitchenDay?.menu;

  const mittag = formatTodayMenuItem(menu?.mittag ?? null, "Mittag");
  const abend = formatTodayMenuItem(menu?.abend ?? null, "Abend");

  return {
    disclaimer: MENU_DISCLAIMER,
    mittag,
    abend,
    noLunch: kitchenDay?.noLunch ?? mittag == null,
    noDinner: kitchenDay?.noDinner ?? abend == null,
    raw: menu,
    changed: Boolean(mittag?.changed) || Boolean(abend?.changed),
  };
}

type ShiftRow = Database["public"]["Tables"]["shifts"]["Row"];
type MenuItemRow = Database["public"]["Tables"]["menu_items"]["Row"];
export type MealTotalsRow = Database["public"]["Functions"]["meal_totals"]["Returns"][number];

/**
 * Ligne `shifts` → service affiché sur la carte « Mein Dienst ».
 */
export function shiftRowToShiftDay(
  row: Pick<ShiftRow, "date" | "type" | "start1" | "end1" | "start2" | "end2" | "break_min">,
): TodayShift {
  return toShiftDay({
    date: row.date,
    type: row.type,
    start1: row.start1,
    end1: row.end1,
    start2: row.start2,
    end2: row.end2,
    break_min: row.break_min,
  });
}

/**
 * Lignes `meal_totals` + `menu_items` → KitchenDay. Les allergies ne sont que comptées :
 * aucun détail d'allergie ne transite par ce modèle.
 */
export function rowsToKitchenDay(
  date: string,
  totalsRows: readonly MealTotalsRow[],
  menuRows: readonly MenuItemRow[],
  updatedAt?: string,
): KitchenDay {
  const totals = calculateKitchenTotals([
    {
      matchcode: "",
      meals: totalsRows
        .filter((r) => r.date === date)
        .map((r) => ({
          meal: r.meal,
          count: r.total,
          veg: r.veg,
          vegan: r.vegan,
          mos: r.mos,
          al: r.allergies,
        })),
    },
  ]);

  const toMenuItem = (meal: "mittag" | "abend"): MenuItem | null => {
    const row = menuRows.find((r) => r.date === date && r.meal === meal);
    return row
      ? { meal, mainDish: row.main_dish, vegVariant: row.veg_variant, dessert: row.dessert }
      : null;
  };

  return {
    date,
    totals,
    groups: [],
    menu: { mittag: toMenuItem("mittag"), abend: toMenuItem("abend") },
    noLunch: totals.mittag.total === 0,
    noDinner: totals.abend.total === 0 && totals.grill.total === 0,
    updatedAt,
  };
}

export interface CreateTodayViewParams {
  date: string;
  shift?: ShiftDay | ShiftInput | null;
  tasks?: TasksDay | null;
  kitchen?: KitchenDay | null;
  roleOrDepartment?: UserRoleOrDepartment | string | null;
  updatedAt?: string;
  dateLabel?: string;
}

/**
 * Garde de type vérifiant si un objet de service est déjà un TodayShift (ShiftDay formaté).
 */
export function isTodayShift(shift: ShiftDay | ShiftInput): shift is TodayShift {
  return "hours" in shift && "badgeLabel" in shift;
}

/**
 * Construit l'état TodayView complet pour l'écran « Heute ».
 */
export function createTodayView(params: CreateTodayViewParams): TodayView {
  const cardOrder = getTodayCardOrder(params.roleOrDepartment);
  const isKitchenRole =
    cardOrder.length === KITCHEN_CARD_ORDER.length &&
    cardOrder.every((c, i) => c === KITCHEN_CARD_ORDER[i]);
  const isHousekeepingRole = !isKitchenRole;

  let myShift: TodayShift | null = null;
  if (params.shift) {
    if (isTodayShift(params.shift)) {
      myShift = params.shift;
    } else {
      myShift = toShiftDay(params.shift);
    }
  }

  const myTasks = createTodayTasks(params.tasks);
  const guests = createTodayGuests(params.kitchen);
  const menu = createTodayMenu(params.kitchen);

  const lastUpdatedAt = params.updatedAt ?? params.kitchen?.updatedAt;
  const lastUpdatedLabel = formatStandLabel(lastUpdatedAt);
  const dateLabel = params.dateLabel ?? formatTodayDateHeader(params.date);

  return {
    date: params.date,
    dateLabel,
    lastUpdatedAt,
    lastUpdatedLabel,
    cardOrder,
    isKitchenRole,
    isHousekeepingRole,
    myShift,
    myTasks,
    guests,
    menu,
  };
}

/**
 * Fixture de service personnel (mercredi 30.09.2026, 08:00–16:30 [Dienst]).
 * Correspond exactement à screens.md §6.1 :
 * « Mein Dienst / 08:00–16:30 [Dienst] »
 */
export const TODAY_FIXTURE_SHIFT_INPUT: ShiftInput = {
  date: "2026-09-30",
  type: "normal",
  start1: 480, // 08:00
  end1: 990, // 16:30
  break_min: 30,
};

export const todayShiftFixture: TodayShift = toShiftDay(TODAY_FIXTURE_SHIFT_INPUT);

export const todayTasksFixture: TodayTasks | null = createTodayTasks(tasksDayFixture);

export const todayGuestsFixture: TodayGuests = createTodayGuests(kitchenDayFixture);

export const todayMenuFixture: TodayMenu = createTodayMenu(kitchenDayFixture);

/**
 * Fixture Heute pour le rôle Housekeeping / BFD (mercredi 30.09.2026, Stand 14:32).
 * Contient les 4 cartes dans l'ordre de screens.md §6.1 :
 * Mein Dienst → Meine Aufgaben → Gäste heute → Menü.
 */
export const todayFixtureHousekeeping: TodayView = createTodayView({
  date: "2026-09-30",
  shift: todayShiftFixture,
  tasks: tasksDayFixture,
  kitchen: kitchenDayFixture,
  roleOrDepartment: "housekeeping",
  updatedAt: "14:32",
});

/**
 * Fixture Heute pour le rôle Küche / Küchenleitung (mercredi 30.09.2026, Stand 14:32).
 * Contient les 3 cartes dans l'ordre de screens.md §6.1 :
 * Mein Dienst → Gäste heute → Menü.
 */
export const todayFixtureKitchen: TodayView = createTodayView({
  date: "2026-09-30",
  shift: todayShiftFixture,
  tasks: tasksDayFixture,
  kitchen: kitchenDayFixture,
  roleOrDepartment: "kueche",
  updatedAt: "14:32",
});
