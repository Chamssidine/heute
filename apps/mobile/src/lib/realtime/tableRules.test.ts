import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { queryKeys } from "../query/keys.ts";
import {
  getTableInvalidationKeys,
  isRealtimeTable,
  REALTIME_TABLES,
  TABLE_INVALIDATION_MAP,
} from "./tableRules.ts";

describe("Règles d'invalidation temps réel (P4-01)", () => {
  it("contient exactement les quatre tables requises par la spécification", () => {
    assert.deepEqual(REALTIME_TABLES, ["shifts", "room_tasks", "meal_counts", "menu_items"]);
  });

  describe("getTableInvalidationKeys", () => {
    it("invalide ['shifts'], ['today'] et ['team'] lors d'une modification de 'shifts'", () => {
      const keys = getTableInvalidationKeys("shifts");
      assert.deepEqual(keys, [queryKeys.shifts.all, queryKeys.today.all, queryKeys.team.all]);
      assert.deepEqual(keys, [["shifts"], ["today"], ["team"]]);
    });

    it("invalide ['tasks'] et ['today'] lors d'une modification de 'room_tasks'", () => {
      const keys = getTableInvalidationKeys("room_tasks");
      assert.deepEqual(keys, [queryKeys.tasks.all, queryKeys.today.all]);
      assert.deepEqual(keys, [["tasks"], ["today"]]);
    });

    it("invalide ['kitchen'] et ['today'] lors d'une modification de 'meal_counts'", () => {
      const keys = getTableInvalidationKeys("meal_counts");
      assert.deepEqual(keys, [queryKeys.kitchen.all, queryKeys.today.all]);
      assert.deepEqual(keys, [["kitchen"], ["today"]]);
    });

    it("invalide ['kitchen'] et ['today'] lors d'une modification de 'menu_items'", () => {
      const keys = getTableInvalidationKeys("menu_items");
      assert.deepEqual(keys, [queryKeys.kitchen.all, queryKeys.today.all]);
      assert.deepEqual(keys, [["kitchen"], ["today"]]);
    });

    it("renvoie une liste vide pour une table non surveillée", () => {
      assert.deepEqual(getTableInvalidationKeys("employees"), []);
      assert.deepEqual(getTableInvalidationKeys("unknown_table"), []);
    });
  });

  describe("isRealtimeTable", () => {
    it("identifie correctement les tables gérées", () => {
      assert.equal(isRealtimeTable("shifts"), true);
      assert.equal(isRealtimeTable("room_tasks"), true);
      assert.equal(isRealtimeTable("meal_counts"), true);
      assert.equal(isRealtimeTable("menu_items"), true);
      assert.equal(isRealtimeTable("audit_log"), false);
      assert.equal(isRealtimeTable("push_tokens"), false);
    });
  });

  describe("TABLE_INVALIDATION_MAP", () => {
    it("chaque table a au moins une clé de requête associée", () => {
      for (const table of REALTIME_TABLES) {
        const keys = TABLE_INVALIDATION_MAP[table];
        assert.ok(keys.length > 0, `La table ${table} doit avoir au moins une clé`);
      }
    });
  });
});
