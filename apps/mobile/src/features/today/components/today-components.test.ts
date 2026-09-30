import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { chipColors } from "../../../lib/theme/colors.ts";
import { strings } from "../../../strings/de.ts";
import {
  MENU_DISCLAIMER,
  todayFixtureHousekeeping,
  todayFixtureKitchen,
  todayGuestsFixture,
  todayMenuFixture,
  todayShiftFixture,
  todayTasksFixture,
} from "../model.ts";
import { berlinToday } from "./helpers.ts";

describe("features/today/components (P2-07 [U])", () => {
  describe("helpers", () => {
    it("berlinToday renvoie une date au format YYYY-MM-DD", () => {
      const today = berlinToday();
      assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("ordre des cartes selon le rôle (screens.md §6.1)", () => {
    it("affiche Mein Dienst, Meine Aufgaben, Gäste heute et Menü pour Housekeeping", () => {
      assert.deepEqual(todayFixtureHousekeeping.cardOrder, [
        "my_shift",
        "my_tasks",
        "guests",
        "menu",
      ]);
    });

    it("affiche Mein Dienst, Gäste heute et Menü pour la cuisine (pas de tâches)", () => {
      assert.deepEqual(todayFixtureKitchen.cardOrder, ["my_shift", "guests", "menu"]);
    });
  });

  describe("conformité visuelle et textuelle (screens.md §6.1 & tokens.md)", () => {
    it("les libellés des cartes correspondent aux textes de référence", () => {
      assert.equal(strings.today.myShift, "Mein Dienst");
      assert.equal(strings.today.myTasks, "Meine Aufgaben");
      assert.equal(strings.today.allTasks, "Alle Aufgaben");
      assert.equal(strings.today.guestsToday, "Gäste heute");
      assert.equal(strings.today.menu, "Menü");
      assert.equal(strings.today.frueh, "Früh");
      assert.equal(strings.today.mittag, "Mittag");
      assert.equal(strings.today.abend, "Abend");
      assert.equal(strings.today.nextPrefix, "Nächste: ");
    });

    it("le rappel permanent d'allergies / modifications est exact", () => {
      assert.equal(MENU_DISCLAIMER, "Änderungen vorbehalten – bei Allergien Küchenpersonal fragen");
      assert.equal(
        todayMenuFixture.disclaimer,
        "Änderungen vorbehalten – bei Allergien Küchenpersonal fragen",
      );
    });

    it("vérifie la neutralité visuelle d'absence (Urlaub et Krank identiques)", () => {
      assert.deepEqual(chipColors.urlaub, chipColors.abwesend);
      assert.deepEqual(chipColors.krank, chipColors.abwesend);
    });
  });

  describe("contenu des cartes de référence", () => {
    it("carte Mein Dienst : horaires et badge", () => {
      assert.equal(todayShiftFixture.hours, "08:00–16:30");
      assert.equal(todayShiftFixture.badgeLabel, "Dienst");
    });

    it("carte Meine Aufgaben : progression et libellé de prochaine tâche", () => {
      assert.ok(todayTasksFixture);
      assert.equal(todayTasksFixture.progressLabel, "2 von 6 erledigt");
      assert.equal(todayTasksFixture.nextTask?.label, "Zimmer 412 · 4. OG · Abreise");
    });

    it("carte Gäste heute : totaux repas et Lunchpaket", () => {
      assert.equal(todayGuestsFixture.frueh.count, 121);
      assert.equal(todayGuestsFixture.mittag.count, 38);
      assert.equal(todayGuestsFixture.mittag.subLabel, "LP 80");
      assert.equal(todayGuestsFixture.lunchpaketCount, 80);
      assert.equal(todayGuestsFixture.abend.count, 25);
    });

    it("carte Menü : détail midi et soir avec variantes végé", () => {
      assert.ok(todayMenuFixture.mittag);
      assert.equal(todayMenuFixture.mittag.mainDish, "Chili con Carne mit Nudeln");
      assert.equal(todayMenuFixture.mittag.vegVariant, "Chili sin Carne");
      assert.ok(todayMenuFixture.abend);
      assert.equal(todayMenuFixture.abend.mainDish, "Zitronenhähnchen mit Kartoffeln");
      assert.equal(todayMenuFixture.abend.vegVariant, "Gemüsebratling");
    });
  });
});
