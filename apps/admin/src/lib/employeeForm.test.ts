import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EMPTY_EMPLOYEE_FORM,
  buildEmployeeArgs,
  employeeErrorMessage,
  formatDuration,
  parseDuration,
} from "./employeeForm.ts";

test("parseDuration / formatDuration : aller-retour", () => {
  assert.equal(parseDuration("160:00"), 9600);
  assert.equal(parseDuration("8:30"), 510);
  assert.equal(parseDuration("8:75"), null);
  assert.equal(parseDuration("x"), null);
  assert.equal(formatDuration(9600), "160:00");
  assert.equal(formatDuration(495), "8:15");
});

test("buildEmployeeArgs : raison et nom obligatoires", () => {
  assert.equal(buildEmployeeArgs({ ...EMPTY_EMPLOYEE_FORM, displayName: "Test A" }).ok, false);
  assert.equal(buildEmployeeArgs({ ...EMPTY_EMPLOYEE_FORM, reason: "Neu" }).ok, false);
});

test("buildEmployeeArgs : arguments de save_employee", () => {
  const r = buildEmployeeArgs({
    ...EMPTY_EMPLOYEE_FORM,
    displayName: "  Test A ",
    contract: "TZ",
    sollDay: "4:00",
    sollMonth: "80:00",
    reason: " Neu ",
  });
  assert.ok(r.ok);
  assert.equal(r.args.p_display_name, "Test A");
  assert.equal(r.args.p_soll_min_day, 240);
  assert.equal(r.args.p_soll_min_month, 4800);
  assert.equal(r.args.p_reason, "Neu");
});

test("buildEmployeeArgs : Soll journalier au-delà de 24 h refusé", () => {
  const r = buildEmployeeArgs({
    ...EMPTY_EMPLOYEE_FORM,
    displayName: "Test A",
    sollDay: "24:01",
    reason: "x",
  });
  assert.equal(r.ok, false);
});

test("employeeErrorMessage : dernier admin et soi-même", () => {
  assert.match(employeeErrorMessage({ code: "HT004" }), /letzte/);
  assert.match(employeeErrorMessage({ code: "HT005" }), /selbst/);
});
