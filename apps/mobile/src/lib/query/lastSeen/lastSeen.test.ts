import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  applyChangeIndicator,
  clearLastSeen,
  getLastSeen,
  getLastSeenSync,
  isItemChanged,
  markSeen,
  parseTimestamp,
  resetStorageBackend,
  setLastSeen,
  setStorageBackend,
  type StorageBackend,
} from "./index.ts";

function createMemoryBackend(): StorageBackend {
  const store = new Map<string, string>();
  return {
    async getItem(k) {
      return store.get(k) ?? null;
    },
    async setItem(k, v) {
      store.set(k, v);
    },
    async removeItem(k) {
      store.delete(k);
    },
  };
}

describe("lib/lastSeen (P4-07 [L])", () => {
  beforeEach(() => {
    setStorageBackend(createMemoryBackend());
  });

  afterEach(() => {
    resetStorageBackend();
  });

  describe("storage.ts - Persistance de la dernière consultation", () => {
    it("renvoie null à la première ouverture d'un écran", async () => {
      const seen = await getLastSeen("dienstplan");
      assert.equal(seen, null);
      assert.equal(getLastSeenSync("dienstplan"), null);
    });

    it("mémorise la consultation d'un écran et permet de la relire", async () => {
      const timestamp = "2026-10-01T10:00:00.000Z";
      await setLastSeen("dienstplan", timestamp);

      const seen = await getLastSeen("dienstplan");
      assert.equal(seen, timestamp);
      assert.equal(getLastSeenSync("dienstplan"), timestamp);
    });

    it("supporte markSeen comme alias impératif", async () => {
      const timestamp = "2026-10-01T12:00:00.000Z";
      await markSeen("kueche", timestamp);

      const seen = await getLastSeen("kueche");
      assert.equal(seen, timestamp);
    });

    it("gère des écrans distincts de façon indépendante", async () => {
      await setLastSeen("dienstplan", "2026-10-01T08:00:00Z");
      await setLastSeen("kueche", "2026-10-01T09:00:00Z");

      assert.equal(await getLastSeen("dienstplan"), "2026-10-01T08:00:00Z");
      assert.equal(await getLastSeen("kueche"), "2026-10-01T09:00:00Z");
      assert.equal(await getLastSeen("menu"), null);
    });

    it("permet d'effacer la date de consultation", async () => {
      await setLastSeen("dienstplan", "2026-10-01T08:00:00Z");
      await clearLastSeen("dienstplan");

      assert.equal(await getLastSeen("dienstplan"), null);
    });

    it("propage l'erreur du backend au lieu de la masquer", async () => {
      setStorageBackend({
        async getItem() {
          throw new Error("storage unavailable");
        },
        async setItem() {
          throw new Error("storage unavailable");
        },
        async removeItem() {
          throw new Error("storage unavailable");
        },
      });

      await assert.rejects(setLastSeen("menu", "2026-10-01T11:00:00Z"), /storage unavailable/);
      assert.equal(getLastSeenSync("menu"), null);
      await assert.rejects(getLastSeen("menu"), /storage unavailable/);
    });
  });

  describe("comparator.ts - parseTimestamp & isItemChanged", () => {
    it("parse les timestamps ISO standard", () => {
      const parsed = parseTimestamp("2026-10-01T14:05:00.000Z");
      assert.equal(typeof parsed, "number");
      assert.ok(parsed !== null && !isNaN(parsed));
    });

    it("refuse les horaires simples HH:MM (ambigus : date et fuseau)", () => {
      assert.equal(parseTimestamp("14:05"), null);
      assert.equal(isItemChanged("14:05", "13:00"), false);
    });

    it("Règle d'acceptation 1 : première ouverture -> rien n'est marqué (lastSeen null)", () => {
      const isChanged = isItemChanged("2026-10-01T14:05:00Z", null);
      assert.equal(isChanged, false);

      const isChangedEmpty = isItemChanged("2026-10-01T14:05:00Z", undefined);
      assert.equal(isChangedEmpty, false);
    });

    it("Règle d'acceptation 2 : updated_at postérieur à lastSeen -> porte changed: true", () => {
      const lastSeen = "2026-10-01T10:00:00Z";
      const updatedAt = "2026-10-01T14:05:00Z";

      assert.equal(isItemChanged(updatedAt, lastSeen), true);
    });

    it("updated_at antérieur ou égal à lastSeen -> changed: false", () => {
      const lastSeen = "2026-10-01T15:00:00Z";
      const updatedAt = "2026-10-01T14:05:00Z";

      assert.equal(isItemChanged(updatedAt, lastSeen), false);
      assert.equal(isItemChanged(lastSeen, lastSeen), false);
    });

    it("compare des instants de fuseaux différents (14:05 Berlin = 12:05 UTC)", () => {
      assert.equal(isItemChanged("2026-09-30T14:05:00+02:00", "2026-09-30T12:00:00Z"), true);
      assert.equal(isItemChanged("2026-09-30T14:05:00+02:00", "2026-09-30T12:30:00Z"), false);
    });
  });

  describe("comparator.ts - applyChangeIndicator", () => {
    it("première ouverture : conserve les données et force changed: false sans previous", () => {
      const item = {
        title: "Dienst",
        updated_at: "2026-10-01T14:05:00Z",
        previous: { hours: "08:00–16:00" },
      };

      const result = applyChangeIndicator(item, null);
      assert.equal(result.changed, false);
      assert.equal(result.previous, undefined);
      assert.equal(result.title, "Dienst");
    });

    it("élément modifié : porte changed: true et previous", () => {
      const item = {
        title: "Dienst",
        updated_at: "2026-10-01T14:05:00Z",
        previous: { hours: "08:00–16:00" },
      };

      const result = applyChangeIndicator(item, "2026-10-01T10:00:00Z");
      assert.equal(result.changed, true);
      assert.deepEqual(result.previous, { hours: "08:00–16:00" });
    });

    it("élément non modifié : porte changed: false et efface previous", () => {
      const item = {
        title: "Dienst",
        updated_at: "2026-10-01T09:00:00Z",
        previous: { hours: "08:00–16:00" },
      };

      const result = applyChangeIndicator(item, "2026-10-01T10:00:00Z");
      assert.equal(result.changed, false);
      assert.equal(result.previous, undefined);
    });
  });
});
