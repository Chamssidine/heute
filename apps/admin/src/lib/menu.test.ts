import assert from "node:assert/strict";
import { test } from "node:test";
import { currentWeekStart, isRlsDenied, menuRow, shiftWeek, weekDates } from "./menu.ts";

test("currentWeekStart : lundi de la semaine, dimanche compris", () => {
  assert.equal(currentWeekStart(new Date(2026, 8, 30)), "2026-09-28");
  assert.equal(currentWeekStart(new Date(2026, 9, 4)), "2026-09-28");
  assert.equal(currentWeekStart(new Date(2026, 9, 5)), "2026-10-05");
  assert.equal(currentWeekStart(new Date(2026, 8, 28, 23, 59)), "2026-09-28");
});

test("shiftWeek et weekDates : passage de mois et d'année", () => {
  assert.equal(shiftWeek("2026-12-28", 1), "2027-01-04");
  assert.equal(shiftWeek("2026-09-28", -1), "2026-09-21");
  assert.deepEqual(weekDates("2026-12-28"), [
    "2026-12-28",
    "2026-12-29",
    "2026-12-30",
    "2026-12-31",
    "2027-01-01",
    "2027-01-02",
    "2027-01-03",
  ]);
});

test("menuRow : nettoie les espaces et met les champs vides à null", () => {
  assert.deepEqual(
    menuRow("2026-09-28", "mittag", { mainDish: " Linsen ", vegVariant: " ", dessert: "Obst" }),
    {
      date: "2026-09-28",
      meal: "mittag",
      main_dish: "Linsen",
      veg_variant: null,
      dessert: "Obst",
    },
  );
});

test("isRlsDenied : reconnaît le code 42501", () => {
  assert.equal(isRlsDenied({ code: "42501" }), true);
  assert.equal(isRlsDenied({ code: "23505" }), false);
});
