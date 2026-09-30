import assert from "node:assert/strict";
import { test } from "node:test";
import {
  constraintErrorMessage,
  formatAllergies,
  parseAllergies,
  validateBookingForm,
} from "./bookings.ts";
import { de } from "../strings/de.ts";

const base = {
  matchcode: " KLASSE7B ",
  label: "Klasse 7b",
  arrival: "2026-10-05",
  departure: "2026-10-09",
  note: "",
};

test("validateBookingForm : saisie valide, champs rognés, note vide -> null", () => {
  assert.deepEqual(validateBookingForm(base), {
    ok: true,
    value: { ...base, matchcode: "KLASSE7B", note: null },
  });
});

test("validateBookingForm : départ le jour d'arrivée accepté, avant refusé", () => {
  assert.equal(validateBookingForm({ ...base, departure: "2026-10-05" }).ok, true);
  assert.deepEqual(validateBookingForm({ ...base, departure: "2026-10-04" }), {
    ok: false,
    error: "departureBeforeArrival",
  });
});

test("validateBookingForm : champs obligatoires et dates invalides", () => {
  assert.deepEqual(validateBookingForm({ ...base, matchcode: " " }), {
    ok: false,
    error: "matchcodeRequired",
  });
  assert.deepEqual(validateBookingForm({ ...base, label: "" }), {
    ok: false,
    error: "labelRequired",
  });
  assert.deepEqual(validateBookingForm({ ...base, arrival: "2026-02-31" }), {
    ok: false,
    error: "invalidDate",
  });
  assert.deepEqual(validateBookingForm({ ...base, departure: "" }), {
    ok: false,
    error: "invalidDate",
  });
});

test("parseAllergies : saisie valide, vide et erreurs", () => {
  assert.deepEqual(parseAllergies(""), { ok: true, value: {} });
  assert.deepEqual(parseAllergies("Gluten 2, milch:1"), {
    ok: true,
    value: { gluten: 2, milch: 1 },
  });
  assert.deepEqual(parseAllergies("gluten"), { ok: false, error: "allergyFormat" });
  assert.deepEqual(parseAllergies("gluten 0"), { ok: false, error: "allergyFormat" });
  assert.deepEqual(parseAllergies("banane 1"), { ok: false, error: "allergyUnknown" });
});

test("formatAllergies : aller-retour avec parseAllergies", () => {
  const text = formatAllergies({ gluten: 2, milch: 1 });
  assert.equal(text, "gluten 2, milch 1");
  assert.deepEqual(parseAllergies(text), { ok: true, value: { gluten: 2, milch: 1 } });
  assert.equal(formatAllergies(null), "");
});

test("constraintErrorMessage : contraintes traduites, sans reprendre le message brut", () => {
  assert.equal(
    constraintErrorMessage({
      code: "23514",
      message: "violates check meal_counts_diets_within_total",
    }),
    de.guests.errors.dietsExceedTotal,
  );
  assert.equal(
    constraintErrorMessage({ code: "23514", message: "meal_counts_allergies_check" }),
    de.guests.errors.allergyInvalid,
  );
  assert.equal(
    constraintErrorMessage({ code: "23514", message: "bookings_check" }),
    de.bookings.errors.departureBeforeArrival,
  );
  assert.equal(constraintErrorMessage({ code: "23505" }), de.guests.errors.duplicate);
  assert.equal(constraintErrorMessage({ code: "42501" }), de.guests.errors.forbidden);
  assert.equal(constraintErrorMessage({ code: "XX000", message: "secret" }), de.guests.saveError);
  assert.equal(constraintErrorMessage(null), de.guests.saveError);
});
