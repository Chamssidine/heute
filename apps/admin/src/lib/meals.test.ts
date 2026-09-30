import assert from "node:assert/strict";
import { test } from "node:test";
import { mealTotals, validateMealForm } from "./meals.ts";

const base = { total: "10", veg: "2", vegan: "1", mos: "0", note: "" };

test("validateMealForm : saisie valide, note vide -> null", () => {
  assert.deepEqual(validateMealForm(base), {
    ok: true,
    value: { total: 10, veg: 2, vegan: 1, mos: 0, note: null },
  });
});

test("validateMealForm : nombres invalides", () => {
  for (const bad of ["", "-1", "1.5", "abc"]) {
    assert.deepEqual(validateMealForm({ ...base, total: bad }), {
      ok: false,
      error: "invalidNumber",
    });
  }
});

test("validateMealForm : régimes supérieurs au total", () => {
  assert.deepEqual(validateMealForm({ ...base, vegan: "11" }), {
    ok: false,
    error: "dietsExceedTotal",
  });
});

test("validateMealForm : note limitée à 120 caractères", () => {
  assert.equal(validateMealForm({ ...base, note: "x".repeat(120) }).ok, true);
  assert.deepEqual(validateMealForm({ ...base, note: "x".repeat(121) }), {
    ok: false,
    error: "noteTooLong",
  });
});

test("mealTotals : somme par repas, autres repas ignorés", () => {
  const totals = mealTotals([
    { meal: "frueh", total: 5, veg: 1, vegan: 0, mos: 0 },
    { meal: "frueh", total: 3, veg: 0, vegan: 1, mos: 2 },
    { meal: "grill", total: 9, veg: 9, vegan: 9, mos: 9 },
  ]);
  assert.deepEqual(totals.frueh, { total: 8, veg: 1, vegan: 1, mos: 2 });
  assert.equal(totals.abend.total, 0);
});
