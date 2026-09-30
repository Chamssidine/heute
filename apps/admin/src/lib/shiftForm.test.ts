import assert from "node:assert/strict";
import { test } from "node:test";
import {
  COPY_WEEK_REASON,
  EMPTY_FORM,
  buildShiftArgs,
  parseTime,
  planShiftCopy,
  serverErrorMessage,
} from "./shiftForm.ts";

test("planShiftCopy : décale de 7 jours, ignore les jours déjà remplis", () => {
  const base = { start2: null, end2: null, break_min: 30, note: null, type: "normal" } as const;
  const plan = planShiftCopy(
    [
      { ...base, date: "2026-09-28", start1: 360, end1: 870 },
      { ...base, date: "2026-09-29", start1: 360, end1: 870 },
      { ...base, type: "frei", date: "2026-12-28", start1: null, end1: null },
    ],
    new Set(["2026-10-06"]),
  );
  assert.deepEqual(
    plan.calls.map((c) => c.p_date),
    ["2026-10-05", "2027-01-04"],
  );
  assert.equal(plan.skipped, 1);
  assert.equal(plan.calls[0]?.p_reason, COPY_WEEK_REASON);
  assert.equal(plan.calls[0]?.p_start1, 360);
  assert.equal(plan.calls[1]?.p_type, "frei");
});

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
