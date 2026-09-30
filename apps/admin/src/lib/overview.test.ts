import assert from "node:assert/strict";
import { test } from "node:test";
import { shiftLabel, taskCounts, teamByDepartment, type TeamShiftRow } from "./overview.ts";

const row = (over: Partial<TeamShiftRow>): TeamShiftRow => ({
  employee_id: "e1",
  display_name: "Test Eins",
  department: "kueche",
  type: "normal",
  start1: 420,
  end1: 900,
  start2: 0,
  end2: 0,
  ...over,
});

test("shiftLabel : horaire HH:MM, teildienst avec 2e partie", () => {
  assert.equal(shiftLabel(row({})), "07:00–15:00");
  assert.equal(
    shiftLabel(row({ type: "td", start1: 420, end1: 600, start2: 1020, end2: 1200 })),
    "07:00–10:00, 17:00–20:00",
  );
});

test("shiftLabel : jamais de motif d'absence, même pour un admin", () => {
  for (const type of ["krank", "urlaub", "abwesend"]) {
    assert.equal(shiftLabel(row({ type })), "Abwesend");
  }
});

test("teamByDepartment : groupe par équipe, trié par nom", () => {
  const groups = teamByDepartment([
    row({ employee_id: "b", display_name: "Zoe" }),
    row({ employee_id: "a", display_name: "Anna" }),
    row({ employee_id: "c", display_name: "Max", department: "bfd" }),
  ]);
  assert.deepEqual(
    groups.get("kueche")?.map((e) => e.name),
    ["Anna", "Zoe"],
  );
  assert.equal(groups.get("bfd")?.length, 1);
});

test("taskCounts : comptes et pourcentage", () => {
  const counts = taskCounts(["offen", "in_arbeit", "erledigt", "erledigt"]);
  assert.deepEqual(counts, { offen: 1, in_arbeit: 1, erledigt: 2, total: 4, percentDone: 50 });
  assert.equal(taskCounts([]).percentDone, 0);
});
