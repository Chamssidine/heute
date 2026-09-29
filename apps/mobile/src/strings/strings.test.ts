import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const { strings } = require("./de.ts") as typeof import("./de");

test("German strings format placeholders correctly", () => {
  assert.equal(strings.common.offlineStand("14:32"), "Offline – Stand 14:32");
  assert.equal(strings.common.lastUpdated("08:00"), "Stand 08:00");
  assert.equal(strings.meals.modified("14:05", 13), "Geändert 14:05 · vorher 13");
});

test("task action labels match tokens.md §4.1", () => {
  assert.equal(strings.tasks.start, "Starten");
  assert.equal(strings.tasks.done, "Fertig");
  assert.equal(strings.tasks.reopen, "Wieder öffnen");
  assert.equal(strings.common.undo, "Rückgängig");
});
