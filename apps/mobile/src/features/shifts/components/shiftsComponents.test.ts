import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { chipColors } from "../../../lib/theme/colors.ts";
import { strings } from "../../../strings/de.ts";
import { myShiftsFixture } from "../model.ts";
import { formatShiftDate, formatShiftMonth } from "./formatters.ts";

describe("features/shifts/components (P2-04 [U])", () => {
  describe("formatShiftDate", () => {
    it("formate correctement une date YYYY-MM-DD selon screens.md §6.5", () => {
      // 2026-10-01 est un jeudi (Do)
      assert.equal(formatShiftDate("2026-10-01"), "Do 01.10.");
      // 2026-10-02 est un vendredi (Fr)
      assert.equal(formatShiftDate("2026-10-02"), "Fr 02.10.");
      // 2026-10-04 est un dimanche (So)
      assert.equal(formatShiftDate("2026-10-04"), "So 04.10.");
      // 2026-10-05 est un lundi (Mo)
      assert.equal(formatShiftDate("2026-10-05"), "Mo 05.10.");
    });

    it("lève une erreur explicite si le format est invalide", () => {
      assert.throws(() => formatShiftDate("invalid"), /Invalid shift date/);
    });
  });

  describe("formatShiftMonth", () => {
    it("extrait le nom du mois en allemand à partir de YYYY-MM", () => {
      assert.equal(formatShiftMonth("2026-10"), "Oktober");
      assert.equal(formatShiftMonth("2026-01"), "Januar");
      assert.equal(formatShiftMonth("2026-12"), "Dezember");
    });

    it("lève une erreur explicite si le format ou le mois est invalide", () => {
      assert.throws(() => formatShiftMonth("unknown"), /Invalid shift month/);
      assert.throws(() => formatShiftMonth("2026-13"), /Invalid shift month/);
      assert.throws(() => formatShiftMonth("2026-00"), /Invalid shift month/);
    });
  });

  describe("conformité tokens §4.2 (neutralité des absences)", () => {
    it("applique le même style neutre pour Urlaub et Krank", () => {
      const urlaubStyle = chipColors.urlaub;
      const krankStyle = chipColors.krank;
      const abwesendStyle = chipColors.abwesend;

      assert.deepEqual(urlaubStyle, abwesendStyle);
      assert.deepEqual(krankStyle, abwesendStyle);
      assert.equal(urlaubStyle.bg, krankStyle.bg);
      assert.equal(urlaubStyle.text, krankStyle.text);
    });
  });

  describe("en-tête de balance IST / Soll", () => {
    it("formate le libellé d'en-tête selon screens.md §6.5", () => {
      const header = strings.shifts.balanceHeader("184:00", "174:00");
      assert.equal(header, "IST 184:00 / Soll 174:00 Std.");
    });
  });

  describe("vues Woche et Monat", () => {
    it("la vue Woche extrait les 7 premiers jours et Monat tous les jours", () => {
      const weekDays = myShiftsFixture.days.slice(0, 7);
      assert.equal(weekDays.length, 7);
      assert.equal(weekDays[0]?.date, "2026-10-01");
      assert.equal(weekDays[6]?.date, "2026-10-07");

      const monthDays = myShiftsFixture.days;
      assert.equal(monthDays.length, 31);
    });

    it("identifie les dimanches travaillés pour le bonus dimanche", () => {
      const sundayWork = myShiftsFixture.days.find((d) => d.isSunday && d.istMinutes > 0);
      assert.ok(sundayWork, "Il doit y avoir au moins un dimanche travaillé");
      assert.equal(sundayWork.isSunday, true);
      assert.ok(sundayWork.istMinutes > 0);

      const sundayFree = myShiftsFixture.days.find((d) => d.isSunday && d.istMinutes === 0);
      assert.ok(sundayFree, "Il doit y avoir au moins un dimanche libre");
      assert.equal(sundayFree.isSunday, true);
      assert.equal(sundayFree.istMinutes, 0);
    });
  });
});
