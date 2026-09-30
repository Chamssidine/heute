import assert from "node:assert/strict";
import { test } from "node:test";
import { EMPTY_FORM, buildShiftArgs, parseTime, serverErrorMessage } from "./shiftForm.ts";

test("parseTime : HH:MM en minutes", () => {
  assert.equal(parseTime("06:30"), 390);
  assert.equal(parseTime("6:00"), 360);
  assert.equal(parseTime("24:00"), null);
  assert.equal(parseTime("abc"), null);
});

test("buildShiftArgs : raison obligatoire", () => {
  const r = buildShiftArgs({ ...EMPTY_FORM, start1: "06:00", end1: "14:30" });
  assert.equal(r.ok, false);
});

test("buildShiftArgs : service normal et Teildienst", () => {
  const normal = buildShiftArgs({
    ...EMPTY_FORM,
    start1: "06:00",
    end1: "14:30",
    reason: " Tausch ",
  });
  assert.ok(normal.ok);
  assert.equal(normal.args.p_start1, 360);
  assert.equal(normal.args.p_end1, 870);
  assert.equal(normal.args.p_reason, "Tausch");
  const td = buildShiftArgs({
    ...EMPTY_FORM,
    type: "td",
    start1: "07:00",
    end1: "11:00",
    start2: "10:00",
    end2: "14:00",
    reason: "x",
  });
  assert.equal(td.ok, false);
});

test("buildShiftArgs : absence sans horaires", () => {
  const r = buildShiftArgs({ ...EMPTY_FORM, type: "krank", reason: "x" });
  assert.ok(r.ok);
  assert.equal(r.args.p_start1, null);
});

test("serverErrorMessage : codes traduits en allemand", () => {
  assert.equal(serverErrorMessage({ code: "HT001" }), "Bitte einen Grund angeben.");
  assert.equal(serverErrorMessage({ code: "HT002" }), "Dazu fehlt dir die Berechtigung.");
  assert.match(serverErrorMessage({ code: "42" }), /schiefgelaufen/);
});
