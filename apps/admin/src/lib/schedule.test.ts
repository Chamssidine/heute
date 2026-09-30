import assert from "node:assert/strict";
import { test } from "node:test";
import { monthDays, monthRange, shiftCell, shiftMonth } from "./schedule.ts";

test("shiftMonth : passage d'année", () => {
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
});

test("monthRange et monthDays : février 2028 (bissextile), dimanches", () => {
  assert.deepEqual(monthRange("2028-02"), { first: "2028-02-01", last: "2028-02-29", days: 29 });
  const days = monthDays("2026-09");
  assert.equal(days.length, 30);
  assert.equal(days[0]?.weekday, "Di");
  assert.deepEqual(
    days.filter((d) => d.isSunday).map((d) => d.day),
    [6, 13, 20, 27],
  );
});

test("shiftCell : service normal, absence et jour vide", () => {
  const base = { employeeId: "e", date: "2026-09-08", note: null };
  assert.deepEqual(shiftCell({ ...base, type: "normal", start1: 360, end1: 870, break_min: 30 }), {
    start: "06:00–14:30",
    end: "",
    code: "",
    ist: "08:00",
  });
  assert.deepEqual(shiftCell({ ...base, type: "urlaub" }), {
    start: "",
    end: "",
    code: "u",
    ist: "08:00",
  });
  assert.deepEqual(shiftCell(undefined), { start: "", end: "", code: "", ist: "" });
});
