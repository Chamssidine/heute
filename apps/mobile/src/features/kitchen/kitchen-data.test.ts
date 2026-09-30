import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { KitchenError, mapKitchenError } from "./api.ts";
import {
  buildKitchenDay,
  formatStand,
  isKitchenDayEmpty,
  type KitchenMealCountRow,
  type KitchenMenuItemRow,
  type KitchenTotalsRow,
} from "./model.ts";

const counts: KitchenMealCountRow[] = [
  {
    meal: "abend",
    total: 12,
    veg: 4,
    vegan: 2,
    mos: 4,
    note: null,
    allergies: { laktose: 1 },
    bookings: { matchcode: "TSV MUSTER/40002" },
  },
  {
    meal: "lunchpaket",
    total: 80,
    veg: 8,
    vegan: 0,
    mos: 4,
    note: "1× Nudeln/Müsli",
    allergies: {},
    bookings: [{ matchcode: "MUSTERSCHULE/40001" }],
  },
  {
    meal: "mittag",
    total: 0,
    veg: 0,
    vegan: 0,
    mos: 0,
    note: null,
    allergies: {},
    bookings: { matchcode: "TSV MUSTER/40002" },
  },
];

const menu: KitchenMenuItemRow[] = [
  { meal: "abend", main_dish: "Kartoffelsuppe", veg_variant: null, dessert: "Grießbrei" },
];

const totals: KitchenTotalsRow[] = [
  { meal: "abend", total: 12, veg: 4, vegan: 2, mos: 4, allergies: 1 },
  { meal: "lunchpaket", total: 80, veg: 8, vegan: 0, mos: 4, allergies: 0 },
];

describe("features/kitchen - lignes de la base vers le modèle", () => {
  const day = buildKitchenDay({
    date: "2026-10-01",
    mealCounts: counts,
    menuItems: menu,
    totals,
    updatedAt: "09:05",
  });

  it("regroupe par Matchcode, triés, en ignorant les repas à 0", () => {
    assert.deepEqual(
      day.groups.map((g) => g.matchcode),
      ["MUSTERSCHULE/40001", "TSV MUSTER/40002"],
    );
    assert.deepEqual(
      day.groups[1]?.meals.map((m) => m.meal),
      ["abend"],
    );
  });

  it("calcule AL depuis le jsonb des allergies et garde la note", () => {
    const abend = day.groups[1]?.meals[0];
    assert.equal(abend?.al, 1);
    assert.deepEqual(abend?.allergies, { laktose: 1 });
    assert.equal(day.groups[0]?.meals[0]?.note, "1× Nudeln/Müsli");
  });

  it("prend les totaux de meal_totals", () => {
    assert.equal(day.totals.abend.total, 12);
    assert.equal(day.totals.abend.al, 1);
    assert.equal(day.totals.lunchpaket.total, 80);
    assert.equal(day.totals.frueh.total, 0);
  });

  it("signale « kein Mittagessen » sans repas de midi, pas « kein Abendessen »", () => {
    assert.equal(day.noLunch, true);
    assert.equal(day.noDinner, false);
  });

  it("mappe le menu et la date fournie, avec l'heure Stand", () => {
    assert.equal(day.date, "2026-10-01");
    assert.equal(day.menu.mittag, null);
    assert.deepEqual(day.menu.abend, {
      meal: "abend",
      mainDish: "Kartoffelsuppe",
      vegVariant: null,
      dessert: "Grießbrei",
    });
    assert.equal(day.updatedAt, "09:05");
  });

  it("recalcule les totaux depuis les groupes sans ligne meal_totals", () => {
    const fallback = buildKitchenDay({
      date: "2026-10-01",
      mealCounts: counts,
      menuItems: [],
      totals: [],
    });
    assert.equal(fallback.totals.abend.total, 12);
    assert.equal(fallback.totals.lunchpaket.total, 80);
  });

  it("jour sans données : vide, avec noLunch et noDinner", () => {
    const empty = buildKitchenDay({
      date: "2026-10-02",
      mealCounts: [],
      menuItems: [],
      totals: [],
    });
    assert.equal(isKitchenDayEmpty(empty), true);
    assert.equal(empty.noLunch, true);
    assert.equal(empty.noDinner, true);
    assert.equal(isKitchenDayEmpty(day), false);
  });

  it("ignore un jsonb d'allergies invalide", () => {
    const bad = buildKitchenDay({
      date: "2026-10-01",
      mealCounts: counts.slice(0, 1).map((row) => ({ ...row, allergies: ["x"] })),
      menuItems: [],
      totals: [],
    });
    assert.equal(bad.groups[0]?.meals[0]?.al, 0);
  });
});

describe("features/kitchen - Stand et erreurs", () => {
  it("formate l'heure en Europe/Berlin (été = UTC+2)", () => {
    assert.equal(formatStand(Date.UTC(2026, 9, 1, 7, 5)), "09:05");
  });

  it("n'expose jamais le texte brut de la base", () => {
    const err = mapKitchenError({ code: "XX000", message: "allergie laktose krank" });
    assert.ok(err instanceof KitchenError);
    assert.equal(err.message.includes("krank"), false);
    assert.equal(err.message.includes("laktose"), false);
  });

  it("mappe réseau et 401, et ne re-mappe pas une erreur déjà traduite", () => {
    const net = mapKitchenError(new Error("Failed to fetch"));
    assert.match(net.message, /Keine Verbindung/);
    assert.equal(mapKitchenError(net), net);
    assert.equal(
      (mapKitchenError({ code: "PGRST301", message: "JWT expired" }) as KitchenError).code,
      "PGRST301",
    );
  });
});
