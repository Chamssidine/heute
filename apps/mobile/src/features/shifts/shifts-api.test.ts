import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapShiftsError, monthRange, SHIFTS_ERROR_MESSAGES, toMyShiftsView } from "./api.ts";
import type { ShiftRow } from "./api.ts";
import { shiftsViewStateFromQuery } from "./hooks.ts";
import type { MyShiftsView } from "./model.ts";

const row = (partial: Partial<ShiftRow> & Pick<ShiftRow, "date" | "type">): ShiftRow => ({
  start1: null,
  end1: null,
  start2: null,
  end2: null,
  break_min: 0,
  updated_at: "2026-09-30T10:00:00Z",
  ...partial,
});

describe("features/shifts api (R-2 [L])", () => {
  it("calcule les bornes d'un mois, y compris décembre", () => {
    assert.deepEqual(monthRange("2026-10"), { from: "2026-10-01", to: "2026-11-01" });
    assert.deepEqual(monthRange("2026-12"), { from: "2026-12-01", to: "2027-01-01" });
    assert.throws(() => monthRange("2026-13"), { message: SHIFTS_ERROR_MESSAGES.invalidMonth });
  });

  it("transforme les lignes de la base en modèle avec IST/Soll/solde du domaine", () => {
    const view = toMyShiftsView(
      "2026-10",
      [
        // Dimanche (2026-10-04) : 8 h 30 − 30 min = 480 min × 1,5 = 720
        row({ date: "2026-10-04", type: "normal", start1: 360, end1: 870, break_min: 30 }),
        row({ date: "2026-10-01", type: "normal", start1: 360, end1: 870, break_min: 30 }),
        row({ date: "2026-10-12", type: "krank" }),
        row({ date: "2026-10-08", type: "urlaub" }),
        row({ date: "2026-10-03", type: "frei" }),
      ],
      10440,
    );
    assert.deepEqual(
      view.days.map((d) => d.date),
      ["2026-10-01", "2026-10-03", "2026-10-04", "2026-10-08", "2026-10-12"],
    );
    const sunday = view.days.find((d) => d.date === "2026-10-04");
    assert.equal(sunday?.isSunday, true);
    assert.equal(sunday?.istMinutes, 720);
    assert.equal(view.days.find((d) => d.date === "2026-10-12")?.istMinutes, 0);
    assert.equal(view.ist, 480 + 720 + 480);
    assert.equal(view.soll, 10440);
    assert.equal(view.diff, view.ist - 10440);
  });

  it("n'expose ni note ni motif : le modèle ne garde que les champs d'horaire", () => {
    const view = toMyShiftsView("2026-10", [row({ date: "2026-10-12", type: "krank" })], 0);
    assert.equal("note" in (view.days[0] ?? {}), false);
  });

  it("mappe les erreurs sans texte brut de la base", () => {
    const leaked = mapShiftsError({ code: "XX000", message: "krank: détail confidentiel" });
    assert.equal(leaked.message, SHIFTS_ERROR_MESSAGES.fetchFailed);
    assert.equal(
      mapShiftsError(new Error("Failed to fetch")).message,
      SHIFTS_ERROR_MESSAGES.networkError,
    );
    assert.equal(
      (mapShiftsError({ code: "PGRST301" }) as Error & { code?: string }).code,
      "PGRST301",
    );
  });

  describe("shiftsViewStateFromQuery", () => {
    const view: MyShiftsView = toMyShiftsView(
      "2026-10",
      [row({ date: "2026-10-01", type: "normal", start1: 360, end1: 870, break_min: 30 })],
      10440,
    );
    const base = { isLoading: false, isPaused: false, dataUpdatedAt: 0, refetch: () => {} };

    it("loading, empty, error, offline, success", () => {
      assert.equal(shiftsViewStateFromQuery({ ...base, isLoading: true }).status, "loading");
      assert.equal(
        shiftsViewStateFromQuery({ ...base, data: { ...view, days: [] } }).status,
        "empty",
      );
      assert.equal(shiftsViewStateFromQuery({ ...base, error: new Error("boom") }).status, "error");
      assert.equal(
        shiftsViewStateFromQuery({ ...base, data: view, isPaused: true }).status,
        "offline",
      );
      assert.equal(shiftsViewStateFromQuery({ ...base, data: view }).status, "success");
    });

    it("« Stand » = heure Europe/Berlin de la dernière réponse", () => {
      const state = shiftsViewStateFromQuery({
        ...base,
        data: view,
        dataUpdatedAt: Date.parse("2026-10-01T12:34:00Z"),
      });
      assert.equal(state.updatedAt, "14:34");
    });
  });
});
