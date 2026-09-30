import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { useMyShifts } from "./hooks.ts";
import {
  applyMyShiftsChanges,
  formatShiftHours,
  myShiftsFixture,
  SHIFT_BADGE_LABELS,
  SHIFT_LABELS,
  toShiftDay,
  type ShiftDay,
} from "./model.ts";

describe("features/shifts (P2-04 [L])", () => {
  describe("model.ts - types et labels", () => {
    it("définit les libellés allemands exacts selon docs/design/copy.md §7.1", () => {
      assert.equal(SHIFT_LABELS.normal, "Dienst");
      assert.equal(SHIFT_LABELS.td, "Teildienst");
      assert.equal(SHIFT_LABELS.sem, "Seminar");
      assert.equal(SHIFT_LABELS.urlaub, "Urlaub");
      assert.equal(SHIFT_LABELS.krank, "Krank");
      assert.equal(SHIFT_LABELS.frei, "Frei");
    });

    it("définit les libellés de badges/chips selon copy.md §7.1 et screens.md §6.5", () => {
      assert.equal(SHIFT_BADGE_LABELS.normal, "Dienst");
      assert.equal(SHIFT_BADGE_LABELS.td, "TD");
      assert.equal(SHIFT_BADGE_LABELS.sem, "Seminar");
      assert.equal(SHIFT_BADGE_LABELS.urlaub, "Urlaub");
      assert.equal(SHIFT_BADGE_LABELS.krank, "Krank");
      assert.equal(SHIFT_BADGE_LABELS.frei, "Frei");
    });

    it("formate correctement les plages horaires avec tiret demi-cadratin et saut de ligne TD", () => {
      assert.equal(formatShiftHours({ type: "normal", start1: 360, end1: 870 }), "06:00–14:30");
      assert.equal(
        formatShiftHours({
          type: "td",
          start1: 480,
          end1: 780,
          start2: 1080,
          end2: 1260,
        }),
        "08:00–13:00\n18:00–21:00",
      );
      assert.equal(formatShiftHours({ type: "frei" }), "—");
      assert.equal(formatShiftHours({ type: "sem" }), "—");
      assert.equal(formatShiftHours({ type: "urlaub" }), "—");
      assert.equal(formatShiftHours({ type: "krank" }), "—");
    });

    it("transforme correctement un ShiftInput en ShiftDay", () => {
      const day = toShiftDay({
        date: "2026-10-01",
        type: "normal",
        start1: 360,
        end1: 870,
        break_min: 30,
      });

      assert.equal(day.date, "2026-10-01");
      assert.equal(day.type, "normal");
      assert.equal(day.label, "Dienst");
      assert.equal(day.badgeLabel, "Dienst");
      assert.equal(day.hours, "06:00–14:30");
      assert.equal(day.isSunday, false);
      assert.equal(day.istMinutes, 480);
    });

    it("lève une erreur explicite si date est absente", () => {
      assert.throws(
        () => toShiftDay({ type: "normal", start1: 360, end1: 870 }),
        /ShiftDay requires a valid date/,
      );
    });
  });

  describe("fixture réaliste d'un mois (Octobre 2026)", () => {
    it("contient 31 jours pour le mois d'octobre 2026", () => {
      assert.equal(myShiftsFixture.month, "2026-10");
      assert.equal(myShiftsFixture.days.length, 31);
    });

    it("donne le total attendu : IST 184:00 (11 040 min), Soll 174:00 (10 440 min), Diff +10:00 (600 min)", () => {
      // 16 jours normaux en semaine * 480 = 7 680 min
      // 1 jour TD en semaine * 480         =   480 min
      // 1 jour SEM * 480                   =   480 min
      // 2 jours Urlaub * 480               =   960 min
      // 1 jour Krank * 0                   =     0 min
      // 8 jours Frei * 0                   =     0 min
      // 2 dimanches travaillés * 720       = 1 440 min (480 * 1,5)
      // ----------------------------------------------------
      // Total IST                          = 11 040 min (184:00 Std.)
      // Soll VZ (174h)                     = 10 440 min (174:00 Std.)
      // Diff                               =   +600 min (+10:00 Std.)

      assert.equal(myShiftsFixture.ist, 11040);
      assert.equal(myShiftsFixture.soll, 10440);
      assert.equal(myShiftsFixture.diff, 600);
    });

    it("comprend un Teildienst (TD) en semaine calculé à 8:00 (480 min) sans pause déduite", () => {
      const tdDay = myShiftsFixture.days.find((d: ShiftDay) => d.date === "2026-10-05");
      assert.ok(tdDay, "Jour 2026-10-05 présent");
      assert.equal(tdDay.type, "td");
      assert.equal(tdDay.label, "Teildienst");
      assert.equal(tdDay.badgeLabel, "TD");
      assert.equal(tdDay.hours, "08:00–13:00\n18:00–21:00");
      assert.equal(tdDay.istMinutes, 480);
      assert.equal(tdDay.isSunday, false);
    });

    it("comprend un Seminar (SEM) compté à 8:00 (480 min forfaitaires)", () => {
      const semDay = myShiftsFixture.days.find((d: ShiftDay) => d.date === "2026-10-07");
      assert.ok(semDay, "Jour 2026-10-07 présent");
      assert.equal(semDay.type, "sem");
      assert.equal(semDay.label, "Seminar");
      assert.equal(semDay.badgeLabel, "Seminar");
      assert.equal(semDay.hours, "—");
      assert.equal(semDay.istMinutes, 480);
      assert.equal(semDay.isSunday, false);
    });

    it("comprend des congés (Urlaub) comptés à 8:00 (480 min forfaitaires)", () => {
      const urlaubDay = myShiftsFixture.days.find((d: ShiftDay) => d.date === "2026-10-08");
      assert.ok(urlaubDay, "Jour 2026-10-08 présent");
      assert.equal(urlaubDay.type, "urlaub");
      assert.equal(urlaubDay.label, "Urlaub");
      assert.equal(urlaubDay.badgeLabel, "Urlaub");
      assert.equal(urlaubDay.hours, "—");
      assert.equal(urlaubDay.istMinutes, 480);
      assert.equal(urlaubDay.isSunday, false);
    });

    it("comprend un arrêt maladie (Krank) compté à 0:00 (0 min selon l'Excel papier Q3)", () => {
      const krankDay = myShiftsFixture.days.find((d: ShiftDay) => d.date === "2026-10-12");
      assert.ok(krankDay, "Jour 2026-10-12 présent");
      assert.equal(krankDay.type, "krank");
      assert.equal(krankDay.label, "Krank");
      assert.equal(krankDay.badgeLabel, "Krank");
      assert.equal(krankDay.hours, "—");
      assert.equal(krankDay.istMinutes, 0);
      assert.equal(krankDay.isSunday, false);
    });

    it("comprend des jours de repos (Frei) comptés à 0:00 (0 min)", () => {
      const freiDay = myShiftsFixture.days.find((d: ShiftDay) => d.date === "2026-10-03");
      assert.ok(freiDay, "Jour 2026-10-03 présent");
      assert.equal(freiDay.type, "frei");
      assert.equal(freiDay.label, "Frei");
      assert.equal(freiDay.badgeLabel, "Frei");
      assert.equal(freiDay.hours, "—");
      assert.equal(freiDay.istMinutes, 0);
      assert.equal(freiDay.isSunday, false);
    });

    it("comprend des dimanches travaillés avec majoration de 50 % (facteur 1,5 = 720 min)", () => {
      // Dimanche normal
      const sundayNormal = myShiftsFixture.days.find((d: ShiftDay) => d.date === "2026-10-04");
      assert.ok(sundayNormal, "Jour 2026-10-04 présent");
      assert.equal(sundayNormal.type, "normal");
      assert.equal(sundayNormal.isSunday, true);
      assert.equal(sundayNormal.istMinutes, 720); // 480 * 1,5 = 720 min = 12h

      // Dimanche TD
      const sundayTD = myShiftsFixture.days.find((d: ShiftDay) => d.date === "2026-10-18");
      assert.ok(sundayTD, "Jour 2026-10-18 présent");
      assert.equal(sundayTD.type, "td");
      assert.equal(sundayTD.isSunday, true);
      assert.equal(sundayTD.istMinutes, 720); // 480 * 1,5 = 720 min = 12h
    });

    it("comprend un dimanche chômé (Frei) restant à 0 min", () => {
      const sundayFrei = myShiftsFixture.days.find((d: ShiftDay) => d.date === "2026-10-11");
      assert.ok(sundayFrei, "Jour 2026-10-11 présent");
      assert.equal(sundayFrei.type, "frei");
      assert.equal(sundayFrei.isSunday, true);
      assert.equal(sundayFrei.istMinutes, 0);
    });
  });

  describe("hooks.ts - useMyShifts", () => {
    it("renvoie un ViewState<MyShiftsView> avec statut success pour le mois de la fixture", () => {
      const state = useMyShifts("2026-10");
      assert.equal(state.status, "success");
      assert.deepEqual(state.data, applyMyShiftsChanges(myShiftsFixture, null));
      assert.equal(state.data.days.length, 31);
      assert.equal(state.data.ist, 11040);
      assert.equal(state.data.soll, 10440);
      assert.equal(state.data.diff, 600);
    });

    it("renvoie un statut empty si le mois demandé n'est pas celui de la fixture", () => {
      const state = useMyShifts("2026-11");
      assert.equal(state.status, "empty");
    });

    describe("Indicateurs changed et previous (P4-07 [L])", () => {
      it("première ouverture : rien n'est marqué (changed: false, previous: undefined)", () => {
        const state = useMyShifts("2026-10", { lastSeen: null });
        assert.equal(state.status, "success");
        assert.ok(state.data);

        // Aucun jour ne doit être marqué changed: true
        for (const day of state.data.days) {
          assert.equal(day.changed, false);
          assert.equal(day.previous, undefined);
        }
      });

      it("élément modifié postérieurement à lastSeen : porte changed: true et previous", () => {
        // Dernière consultation antérieure à la modification du 14 octobre (14:05)
        const lastSeen = "2026-10-01T10:00:00Z";
        const state = useMyShifts("2026-10", { lastSeen });
        assert.equal(state.status, "success");
        assert.ok(state.data);

        const modifiedDay = state.data.days.find((d) => d.date === "2026-10-14");
        assert.ok(modifiedDay, "Jour du 14 octobre présent");
        assert.equal(modifiedDay.changed, true);
        assert.deepEqual(modifiedDay.previous, {
          hours: "08:00–16:00",
          label: "Dienst",
          istMinutes: 450,
        });

        // Les autres jours non modifiés ont changed: false
        const otherDay = state.data.days.find((d) => d.date === "2026-10-01");
        assert.ok(otherDay);
        assert.equal(otherDay.changed, false);
        assert.equal(otherDay.previous, undefined);
      });

      it("consultation postérieure à updated_at : changed redevient false sans previous", () => {
        // Dernière consultation postérieure à la modification (15:00 > 14:05)
        const lastSeen = "2026-10-01T15:00:00Z";
        const state = useMyShifts("2026-10", { lastSeen });
        assert.equal(state.status, "success");
        assert.ok(state.data);

        const modifiedDay = state.data.days.find((d) => d.date === "2026-10-14");
        assert.ok(modifiedDay);
        assert.equal(modifiedDay.changed, false);
        assert.equal(modifiedDay.previous, undefined);
      });
    });
  });
});
