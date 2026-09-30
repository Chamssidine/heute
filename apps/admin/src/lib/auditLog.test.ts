import assert from "node:assert/strict";
import { test } from "node:test";
import { diffRow, formatValue, pageCount } from "./auditLog.ts";

test("diffRow ne garde que les champs modifiés d'un update", () => {
  const changes = diffRow({
    action: "update",
    old: { id: "1", start1: 480, end1: 960, updated_at: "a" },
    new: { id: "1", start1: 540, end1: 960, updated_at: "b" },
  });
  assert.deepEqual(changes, [{ field: "Beginn", before: "08:00", after: "09:00" }]);
});

test("diffRow d'un insert liste les champs renseignés", () => {
  const changes = diffRow({
    action: "insert",
    old: null,
    new: { id: "1", break_min: 30, note: null },
  });
  assert.deepEqual(changes, [{ field: "Pause (Min.)", before: null, after: "30" }]);
});

test("aucune donnée de santé en clair", () => {
  assert.equal(formatValue("type", "krank"), "Abwesend");
  assert.equal(formatValue("note", "Grippe"), "(ausgeblendet)");
  assert.equal(formatValue("allergies", { gluten: 2 }), "(ausgeblendet)");
  const changes = diffRow({
    action: "update",
    old: { type: "normal" },
    new: { type: "krank" },
  });
  assert.equal(JSON.stringify(changes).includes("krank"), false);
});

test("les personnes sont résolues par nom", () => {
  assert.equal(formatValue("employee_id", "e1", new Map([["e1", "Anna"]])), "Anna");
});

test("pageCount vaut au moins 1", () => {
  assert.equal(pageCount(0), 1);
  assert.equal(pageCount(26), 2);
});
