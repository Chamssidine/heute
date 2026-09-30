import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapTodayError, TODAY_ERROR_MESSAGES } from "./api.ts";
import { combineTodaySources, type TodaySource } from "./hooks.ts";
import {
  rowsToKitchenDay,
  shiftRowToShiftDay,
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
import { applyKitchenDayChanges, kitchenDayFixture } from "../kitchen/model.ts";
import { FIXTURE_TASK_ITEMS, tasksDayFixture } from "../tasks/model.ts";

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

  describe("model.ts - lignes de la base → modèle", () => {
    const shiftRow = {
      date: "2026-10-01",
      type: "td" as const,
      start1: 420,
      end1: 780,
      start2: 1080,
      end2: 1260,
      break_min: 0,
    };
    const totalsRows = [
      {
        date: "2026-10-01",
        meal: "frueh" as const,
        total: 30,
        veg: 3,
        vegan: 1,
        mos: 0,
        allergies: 0,
      },
      {
        date: "2026-10-01",
        meal: "mittag" as const,
        total: 20,
        veg: 2,
        vegan: 0,
        mos: 1,
        allergies: 1,
      },
      {
        date: "2026-10-01",
        meal: "lunchpaket" as const,
        total: 10,
        veg: 0,
        vegan: 0,
        mos: 0,
        allergies: 0,
      },
    ];
    const menuRows = [
      {
        id: "m1",
        date: "2026-10-01",
        meal: "mittag" as const,
        main_dish: "Gemüsesuppe",
        veg_variant: null,
        dessert: "Obst",
        created_at: "2026-09-30T10:00:00Z",
        updated_at: "2026-09-30T10:00:00Z",
      },
    ];

    it("transforme une ligne shifts en service affichable", () => {
      const shift = shiftRowToShiftDay(shiftRow);
      assert.equal(shift.date, "2026-10-01");
      assert.equal(shift.hours, "07:00–13:00\n18:00–21:00");
      assert.equal(shift.badgeLabel, "TD");
    });

    it("transforme meal_totals et menu_items en KitchenDay", () => {
      const day = rowsToKitchenDay("2026-10-01", totalsRows, menuRows, "2026-10-01T12:00:00Z");
      assert.equal(day.totals.frueh.total, 30);
      assert.equal(day.totals.mittag.al, 1);
      assert.equal(day.totals.lunchpaket.total, 10);
      assert.equal(day.totals.abend.total, 0);
      assert.equal(day.noLunch, false);
      assert.equal(day.noDinner, true);
      assert.equal(day.menu.mittag?.mainDish, "Gemüsesuppe");
      assert.equal(day.menu.abend, null);
    });

    it("ignore les lignes d'une autre date", () => {
      const day = rowsToKitchenDay("2026-10-02", totalsRows, menuRows);
      assert.equal(day.totals.frueh.total, 0);
      assert.equal(day.menu.mittag, null);
    });
  });

  describe("hooks.ts - combineTodaySources", () => {
    const ok = <T>(data: T, extra: Partial<TodaySource<T>> = {}): TodaySource<T> => ({
      data,
      isLoading: false,
      isPaused: false,
      updatedAtMs: Date.UTC(2026, 9, 1, 12, 32),
      retry: () => undefined,
      ...extra,
    });
    const base = {
      date: "2026-10-01",
      roleOrDepartment: { department: "housekeeping" },
    };
    const kitchen = rowsToKitchenDay("2026-10-01", [], []);

    it("renvoie success avec « Stand HH:MM » tiré de la dernière réponse du serveur", () => {
      const state = combineTodaySources({
        ...base,
        shift: ok(
          shiftRowToShiftDay({
            date: "2026-10-01",
            type: "normal",
            start1: 480,
            end1: 990,
            start2: null,
            end2: null,
            break_min: 30,
          }),
        ),
        kitchen: ok(kitchen),
        tasks: ok(tasksDayFixture),
      });
      assert.equal(state.status, "success");
      assert.equal(state.data?.date, "2026-10-01");
      assert.equal(state.data?.lastUpdatedLabel, "Stand 14:32");
      assert.equal(state.data?.myTasks?.progressLabel, "2 von 6 erledigt");
    });

    it("renvoie loading tant qu'une source charge", () => {
      const state = combineTodaySources({
        ...base,
        shift: { isLoading: true, isPaused: false, retry: () => undefined },
        kitchen: ok(kitchen),
        tasks: null,
      });
      assert.equal(state.status, "loading");
    });

    it("renvoie empty sans service, tâche, repas ni menu", () => {
      const state = combineTodaySources({
        ...base,
        shift: ok(null),
        kitchen: ok(kitchen),
        tasks: ok(null),
      });
      assert.equal(state.status, "empty");
    });

    it("renvoie error avec le message allemand, sans texte brut de la base", () => {
      const state = combineTodaySources({
        ...base,
        shift: ok(null),
        kitchen: {
          isLoading: false,
          isPaused: false,
          error: mapTodayError({ message: "row for user 42 krank" }),
          retry: () => undefined,
        },
        tasks: null,
      });
      assert.equal(state.status, "error");
      assert.equal(state.message, TODAY_ERROR_MESSAGES.fetchFailed);
    });

    it("renvoie offline avec les données en cache quand le réseau manque", () => {
      const state = combineTodaySources({
        ...base,
        shift: ok(null),
        kitchen: ok(kitchen, { isPaused: true }),
        tasks: ok(tasksDayFixture),
      });
      assert.equal(state.status, "offline");
      assert.ok(state.data);
    });

    it("n'attend pas les tâches pour un rôle cuisine", () => {
      const state = combineTodaySources({
        date: "2026-10-01",
        roleOrDepartment: { department: "kueche" },
        shift: ok(null),
        kitchen: ok(rowsToKitchenDay("2026-10-01", [], [])),
        tasks: null,
      });
      assert.equal(state.status, "empty");
    });

    describe("Indicateurs changed et previous dans Heute (P4-07 [L])", () => {
      const todayWith = (lastSeen: string | null) =>
        combineTodaySources({
          date: "2026-09-30",
          roleOrDepartment: { department: "kueche" },
          shift: ok(null),
          kitchen: ok(applyKitchenDayChanges(kitchenDayFixture, lastSeen)),
          tasks: null,
        });

      it("première ouverture : rien n'est marqué (changed: false, changeNotice: null)", () => {
        const state = todayWith(null);
        assert.equal(state.status, "success");
        assert.ok(state.data);

        // Repas du soir
        assert.equal(state.data.guests.abend.changed, false);
        assert.equal(state.data.guests.abend.changeNotice, null);

        // Menu
        assert.equal(state.data.menu.changed, false);
        assert.equal(state.data.menu.abend?.changed, false);
      });

      it("repas et menu modifiés : portent changed: true, highlight et la mention Geändert", () => {
        // Dernière consultation à 13:00 Berlin, modification à 14:05 Berlin
        const state = todayWith("2026-09-30T11:00:00Z");
        assert.equal(state.status, "success");
        assert.ok(state.data);

        // Repas Abend
        assert.equal(state.data.guests.abend.changed, true);
        assert.equal(state.data.guests.abend.highlight, true);
        assert.equal(state.data.guests.abend.changeNotice, "Geändert 14:05 · vorher 13");
        assert.deepEqual(state.data.guests.abend.previous, { count: 13 });

        // Menu Abend
        assert.equal(state.data.menu.abend?.changed, true);
        assert.equal(state.data.menu.abend?.previous?.mainDish, "Hähnchenschenkel");
      });

      it("consultation postérieure : le marquage disparaît (changed: false, changeNotice: null)", () => {
        const state = todayWith("2026-09-30T12:30:00Z");
        assert.equal(state.status, "success");
        assert.ok(state.data);

        assert.equal(state.data.guests.abend.changed, false);
        assert.equal(state.data.guests.abend.changeNotice, null);
        assert.equal(state.data.menu.abend?.changed, false);
      });
    });
  });
});
