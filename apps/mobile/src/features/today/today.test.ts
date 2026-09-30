import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { useToday } from "./hooks.ts";
import {
  createTodayView,
  formatStandLabel,
  formatTodayDateHeader,
  formatTodayNextTask,
  getTodayCardOrder,
  HOUSEKEEPING_BFD_CARD_ORDER,
  isTodayShift,
  KITCHEN_CARD_ORDER,
  MENU_DISCLAIMER,
  TODAY_FIXTURE_SHIFT_INPUT,
  todayFixtureHousekeeping,
  todayFixtureKitchen,
  todayGuestsFixture,
  todayMenuFixture,
  todayShiftFixture,
  todayTasksFixture,
  type TodayCardId,
} from "./model.ts";
import { FIXTURE_TASK_ITEMS } from "../tasks/model.ts";

describe("features/today (P2-07 [L])", () => {
  describe("model.ts - Ordre des cartes par rôle (screens.md §6.1)", () => {
    it("définit l'ordre strict pour Housekeeping et BFD : Mein Dienst → Meine Aufgaben → Gäste heute → Menü", () => {
      const expected: TodayCardId[] = ["my_shift", "my_tasks", "guests", "menu"];
      assert.deepEqual(HOUSEKEEPING_BFD_CARD_ORDER, expected);

      assert.deepEqual(getTodayCardOrder("housekeeping"), expected);
      assert.deepEqual(getTodayCardOrder("bfd"), expected);
      assert.deepEqual(getTodayCardOrder({ department: "housekeeping", role: "staff" }), expected);
      assert.deepEqual(getTodayCardOrder({ department: "bfd", role: "staff" }), expected);
    });

    it("définit l'ordre strict pour Küche et Küchenleitung : Mein Dienst → Gäste heute → Menü", () => {
      const expected: TodayCardId[] = ["my_shift", "guests", "menu"];
      assert.deepEqual(KITCHEN_CARD_ORDER, expected);

      assert.deepEqual(getTodayCardOrder("kueche"), expected);
      assert.deepEqual(getTodayCardOrder("kitchen_lead"), expected);
      assert.deepEqual(getTodayCardOrder({ department: "kueche", role: "staff" }), expected);
      assert.deepEqual(getTodayCardOrder({ department: "kueche", role: "kitchen_lead" }), expected);
    });

    it("vérifie l'ordre des cartes dans les fixtures dédiées", () => {
      assert.deepEqual(todayFixtureHousekeeping.cardOrder, HOUSEKEEPING_BFD_CARD_ORDER);
      assert.equal(todayFixtureHousekeeping.isHousekeepingRole, true);
      assert.equal(todayFixtureHousekeeping.isKitchenRole, false);

      assert.deepEqual(todayFixtureKitchen.cardOrder, KITCHEN_CARD_ORDER);
      assert.equal(todayFixtureKitchen.isKitchenRole, true);
      assert.equal(todayFixtureKitchen.isHousekeepingRole, false);
    });
  });

  describe("model.ts - Composition du modèle TodayView (screens.md §6.1)", () => {
    it("compose « Mein Dienst » avec les horaires exacts et le badge", () => {
      assert.ok(todayFixtureHousekeeping.myShift);
      assert.equal(todayFixtureHousekeeping.myShift.date, "2026-09-30");
      assert.equal(todayFixtureHousekeeping.myShift.hours, "08:00–16:30");
      assert.equal(todayFixtureHousekeeping.myShift.badgeLabel, "Dienst");
      assert.equal(todayFixtureHousekeeping.myShift.label, "Dienst");
    });

    it("compose « Meine Aufgaben » avec la progression et la tâche suivante (HK-04)", () => {
      assert.ok(todayFixtureHousekeeping.myTasks);
      assert.equal(todayFixtureHousekeeping.myTasks.total, 6);
      assert.equal(todayFixtureHousekeeping.myTasks.completed, 2);
      assert.equal(todayFixtureHousekeeping.myTasks.progressLabel, "2 von 6 erledigt");

      assert.ok(todayFixtureHousekeeping.myTasks.nextTask);
      assert.equal(todayFixtureHousekeeping.myTasks.nextTask.title, "Zimmer 412");
      assert.equal(todayFixtureHousekeeping.myTasks.nextTask.floorLabel, "4. OG");
      assert.equal(todayFixtureHousekeeping.myTasks.nextTask.typeLabel, "Abreise");
      assert.equal(todayFixtureHousekeeping.myTasks.nextTask.label, "Zimmer 412 · 4. OG · Abreise");
    });

    it("compose « Gäste heute » avec les chiffres de Früh, Mittag (LP) et Abend", () => {
      const guests = todayFixtureHousekeeping.guests;
      assert.equal(guests.frueh.count, 121);
      assert.equal(guests.mittag.count, 38);
      assert.equal(guests.mittag.subCount, 80);
      assert.equal(guests.mittag.subLabel, "LP 80");
      assert.equal(guests.abend.count, 25);
      assert.equal(guests.lunchpaketCount, 80);
      assert.equal(guests.grillCount, 12);

      // Détails régimes et notification de changement dérivée du modèle
      assert.equal(guests.abend.dietsSummary, "VEG 10 · vegan 2 · MOS 9 · AL 1");
      assert.equal(guests.abend.changeNotice, null);
    });

    it("compose « Menü » avec les plats, variantes végétariennes et le disclaimer d'allergies", () => {
      const menu = todayFixtureHousekeeping.menu;
      assert.ok(menu.mittag);
      assert.equal(menu.mittag.mainDish, "Chili con Carne mit Nudeln");
      assert.equal(menu.mittag.vegVariant, "Chili sin Carne");
      assert.equal(menu.mittag.formatted, "Chili con Carne mit Nudeln · Veg: Chili sin Carne");

      assert.ok(menu.abend);
      assert.equal(menu.abend.mainDish, "Zitronenhähnchen mit Kartoffeln");
      assert.equal(menu.abend.vegVariant, "Gemüsebratling");
      assert.equal(menu.abend.formatted, "Zitronenhähnchen mit Kartoffeln · Veg: Gemüsebratling");

      assert.equal(menu.disclaimer, MENU_DISCLAIMER);
      assert.equal(menu.disclaimer, "Änderungen vorbehalten – bei Allergien Küchenpersonal fragen");
    });

    it("expose « Stand HH:MM » et calcule dynamiquement le jour de semaine", () => {
      assert.equal(todayFixtureHousekeeping.lastUpdatedAt, "14:32");
      assert.equal(todayFixtureHousekeeping.lastUpdatedLabel, "Stand 14:32");
      assert.equal(todayFixtureHousekeeping.dateLabel, "Mi, 30.09.");

      assert.equal(formatStandLabel("14:32"), "Stand 14:32");
      assert.equal(formatStandLabel(null), "Stand —");
      assert.equal(formatStandLabel(undefined), "Stand —");
      assert.equal(formatTodayDateHeader("2026-09-30"), "Mi, 30.09.");
    });

    it("ne force pas un Stand arbitraire si aucune date de mise à jour n'est fournie", () => {
      const viewWithoutUpdate = createTodayView({
        date: "2026-10-01",
        shift: null,
        tasks: null,
        kitchen: null,
      });

      assert.equal(viewWithoutUpdate.lastUpdatedAt, undefined);
      assert.equal(viewWithoutUpdate.lastUpdatedLabel, "Stand —");
    });

    it("valide le type guard isTodayShift", () => {
      assert.equal(isTodayShift(todayShiftFixture), true);
      assert.equal(isTodayShift(TODAY_FIXTURE_SHIFT_INPUT), false);
    });

    it("valide les fixtures modulaires indépendantes (shift, tasks, guests, menu)", () => {
      assert.equal(todayShiftFixture.hours, "08:00–16:30");
      assert.ok(todayTasksFixture);
      assert.equal(todayTasksFixture.progressLabel, "2 von 6 erledigt");
      assert.equal(todayGuestsFixture.frueh.count, 121);
      assert.equal(todayMenuFixture.disclaimer, MENU_DISCLAIMER);

      const sampleTask = FIXTURE_TASK_ITEMS[3];
      assert.ok(sampleTask);
      const nextTask = formatTodayNextTask(sampleTask);
      assert.equal(nextTask.label, "Zimmer 412 · 4. OG · Abreise");
    });
  });

  describe("model.ts - Confidentialité et absence de donnée sensible (AGENTS.md)", () => {
    it("ne contient aucun motif sensible de santé (jamais « krank ») dans les données exposées", () => {
      const hkJson = JSON.stringify(todayFixtureHousekeeping).toLowerCase();
      const kitchenJson = JSON.stringify(todayFixtureKitchen).toLowerCase();

      assert.equal(
        hkJson.includes('"krank"'),
        false,
        "todayFixtureHousekeeping contient le mot interdit 'krank'",
      );
      assert.equal(
        kitchenJson.includes('"krank"'),
        false,
        "todayFixtureKitchen contient le mot interdit 'krank'",
      );
    });

    it("ne contient aucun détail d'allergie médicale nominative mais seulement les totaux chiffrés", () => {
      const json = JSON.stringify(todayFixtureHousekeeping);

      // Aucun détail médical de patient/client : seul le rappel générique et AL 1 sont autorisés
      assert.equal(json.includes("Patient"), false);
      assert.equal(json.includes("Diagnose"), false);
      assert.equal(json.includes("Schock"), false);
      assert.equal(json.includes("Krankenhaus"), false);
    });

    it("ne divulgue aucun secret, token, ni mot de passe dans le modèle", () => {
      const json = JSON.stringify(todayFixtureHousekeeping);
      assert.equal(json.includes("password"), false);
      assert.equal(json.includes("token"), false);
      assert.equal(json.includes("secret"), false);
    });
  });

  describe("hooks.ts - useToday(date: string)", () => {
    it("renvoie ViewState<TodayView> avec status success pour la date de référence en composant les hooks", () => {
      const state = useToday("2026-09-30");

      assert.equal(state.status, "success");
      assert.ok(state.data);
      assert.equal(state.data.date, "2026-09-30");
      assert.equal(state.data.lastUpdatedLabel, "Stand 14:32");
      assert.equal(state.updatedAt, "14:32");
    });

    it("applique l'ordre Housekeeping / BFD lorsque le rôle correspondant est passé", () => {
      const state = useToday("2026-09-30", { department: "housekeeping" });

      assert.equal(state.status, "success");
      assert.ok(state.data);
      assert.deepEqual(state.data.cardOrder, ["my_shift", "my_tasks", "guests", "menu"]);
      assert.equal(state.data.isHousekeepingRole, true);
    });

    it("applique l'ordre Küche / Küchenleitung lorsque le département cuisine est passé", () => {
      const state = useToday("2026-09-30", { department: "kueche" });

      assert.equal(state.status, "success");
      assert.ok(state.data);
      assert.deepEqual(state.data.cardOrder, ["my_shift", "guests", "menu"]);
      assert.equal(state.data.isKitchenRole, true);
    });

    it("renvoie status empty pour une date inconnue sans données sans message arbitraire", () => {
      const state = useToday("2099-01-01");

      assert.equal(state.status, "empty");
      assert.equal(state.data, undefined);
    });
  });
});
