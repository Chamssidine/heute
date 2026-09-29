import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, it } from "node:test";

const require = createRequire(import.meta.url);
const { toViewState } = require("./viewState.ts") as typeof import("./viewState");

describe("toViewState", () => {
  describe("loading", () => {
    it("returns loading status when isLoading is true", () => {
      const state = toViewState({ isLoading: true });
      assert.equal(state.status, "loading");
    });

    it("returns loading status when data is undefined without error", () => {
      const state = toViewState<string>({ data: undefined });
      assert.equal(state.status, "loading");
    });

    it("passes updatedAt in loading state if provided", () => {
      const state = toViewState({ isLoading: true, updatedAt: "08:30" });
      assert.equal(state.status, "loading");
      assert.equal(state.updatedAt, "08:30");
    });
  });

  describe("empty", () => {
    it("returns empty status for empty array by default", () => {
      const state = toViewState<string[]>({ data: [] });
      assert.equal(state.status, "empty");
    });

    it("returns empty status when isEmpty boolean is true", () => {
      const state = toViewState({ data: { count: 0 }, isEmpty: true });
      assert.equal(state.status, "empty");
    });

    it("returns empty status when isEmpty predicate returns true", () => {
      const state = toViewState({
        data: { items: [] },
        isEmpty: (d) => d.items.length === 0,
      });
      assert.equal(state.status, "empty");
    });

    it("includes custom emptyMessage and updatedAt", () => {
      const state = toViewState({
        data: [],
        emptyMessage: "Keine Aufgaben vorhanden",
        updatedAt: "10:15",
      });
      assert.equal(state.status, "empty");
      assert.equal(state.message, "Keine Aufgaben vorhanden");
      assert.equal(state.updatedAt, "10:15");
    });
  });

  describe("error", () => {
    it("returns error status with message from Error instance", () => {
      const error = new Error("Netzwerkfehler");
      const state = toViewState({ error });
      assert.equal(state.status, "error");
      assert.equal(state.message, "Netzwerkfehler");
    });

    it("returns error status with custom errorMessage override", () => {
      const state = toViewState({
        error: new Error("Technischer Fehler"),
        errorMessage: "Dienstplan konnte nicht geladen werden",
      });
      assert.equal(state.status, "error");
      assert.equal(state.message, "Dienstplan konnte nicht geladen werden");
    });

    it("includes onRetry callback and updatedAt", () => {
      let retried = false;
      const onRetry = () => {
        retried = true;
      };
      const state = toViewState({
        error: new Error("Fehler"),
        onRetry,
        updatedAt: "11:00",
      });
      assert.equal(state.status, "error");
      assert.equal(state.updatedAt, "11:00");
      state.onRetry?.();
      assert.equal(retried, true);
    });

    it("falls back to error if isOffline is true but no cached data exists", () => {
      const state = toViewState({
        isOffline: true,
        errorMessage: "Offline ohne Daten",
      });
      assert.equal(state.status, "error");
      assert.equal(state.message, "Offline ohne Daten");
    });
  });

  describe("offline", () => {
    it("returns offline status when isOffline is true and cached data exists", () => {
      const data = [{ id: 1, name: "Frühschicht" }];
      let retried = false;
      const state = toViewState({
        data,
        isOffline: true,
        updatedAt: "07:00",
        onRetry: () => {
          retried = true;
        },
      });

      assert.equal(state.status, "offline");
      assert.deepEqual(state.data, data);
      assert.equal(state.updatedAt, "07:00");
      state.onRetry?.();
      assert.equal(retried, true);
    });

    it("detects offline status from network error when data is present", () => {
      const data = { meals: 42 };
      const networkError = new Error("Network request failed");
      const state = toViewState({
        data,
        error: networkError,
        updatedAt: "09:45",
      });

      assert.equal(state.status, "offline");
      assert.deepEqual(state.data, data);
      assert.equal(state.updatedAt, "09:45");
    });
  });

  describe("unauthorized", () => {
    it("returns unauthorized status when isUnauthorized is true", () => {
      let loggedIn = false;
      const state = toViewState({
        isUnauthorized: true,
        errorMessage: "Sitzung abgelaufen",
        onLogin: () => {
          loggedIn = true;
        },
      });

      assert.equal(state.status, "unauthorized");
      assert.equal(state.message, "Sitzung abgelaufen");
      state.onLogin?.();
      assert.equal(loggedIn, true);
    });

    it("detects unauthorized error from status 401 object", () => {
      const state = toViewState({
        error: { status: 401, message: "Invalid JWT token" },
      });

      assert.equal(state.status, "unauthorized");
      assert.equal(state.message, "Invalid JWT token");
    });

    it("detects unauthorized error from PGRST301 code", () => {
      const state = toViewState({
        error: { code: "PGRST301", message: "JWT expired" },
      });

      assert.equal(state.status, "unauthorized");
      assert.equal(state.message, "JWT expired");
    });
  });

  describe("success", () => {
    it("returns success status with data and updatedAt", () => {
      const data = { id: 1, role: "chef" };
      const state = toViewState({ data, updatedAt: "12:00" });

      assert.equal(state.status, "success");
      assert.deepEqual(state.data, data);
      assert.equal(state.updatedAt, "12:00");
    });

    it("handles non-empty array as success", () => {
      const data = ["Zimmer 101", "Zimmer 102"];
      const state = toViewState({ data });

      assert.equal(state.status, "success");
      assert.deepEqual(state.data, data);
    });

    it("handles falsy non-null values (0, false) as success", () => {
      const stateZero = toViewState({ data: 0 });
      assert.equal(stateZero.status, "success");
      assert.equal(stateZero.data, 0);

      const stateFalse = toViewState({ data: false });
      assert.equal(stateFalse.status, "success");
      assert.equal(stateFalse.data, false);
    });
  });
});
