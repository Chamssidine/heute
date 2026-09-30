import assert from "node:assert/strict";
import { test } from "node:test";
import { groupByFloor, today, type HousekeepingTask } from "./housekeeping.ts";

const task = (id: string, roomNumber: string | null, floor: number | null): HousekeepingTask => ({
  id,
  taskType: "abreise",
  zone: roomNumber === null ? "Bäder" : null,
  status: "offen",
  assignedTo: null,
  roomNumber,
  floor,
});

test("groupByFloor : étages croissants, zones à la fin, chambres triées numériquement", () => {
  const groups = groupByFloor([
    task("a", "210", 2),
    task("b", null, null),
    task("c", "101", 1),
    task("d", "29", 2),
  ]);
  assert.deepEqual(
    groups.map((g) => g.floor),
    [1, 2, null],
  );
  assert.deepEqual(
    groups[1]?.tasks.map((t) => t.roomNumber),
    ["29", "210"],
  );
});

test("today : date Europe/Berlin", () => {
  assert.equal(today(new Date("2026-09-30T22:30:00Z")), "2026-10-01");
});
