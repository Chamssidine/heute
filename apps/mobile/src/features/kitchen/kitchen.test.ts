import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { useKitchenDay } from "./hooks.ts";
import {
  calculateGroupDiets,
  calculateKitchenTotals,
  DIET_LABELS,
  formatDietsSummary,
  formatGroupMealsSummary,
  kitchenDayFixture,
  kitchenDayNoLunchFixture,
  MEAL_LABELS,
  MEAL_SHORT_LABELS,
  MEAL_TYPES,
  type KitchenGroupDetail,
  type MealType,
} from "./model.ts";

describe("features/kitchen (P2-06 [L])", () => {
  describe("model.ts - types et labels", () => {
    it("définit les 5 types de repas conformes au schéma de base de données", () => {
      assert.deepEqual(MEAL_TYPES, ["frueh", "mittag", "abend", "lunchpaket", "grill"]);
    });

    it("définit les libellés allemands exacts selon docs/design/copy.md §7.1", () => {
      assert.equal(MEAL_LABELS.frueh, "Frühstück");
      assert.equal(MEAL_LABELS.mittag, "Mittagessen");
      assert.equal(MEAL_LABELS.abend, "Abendessen");
      assert.equal(MEAL_LABELS.lunchpaket, "Lunchpaket");
      assert.equal(MEAL_LABELS.grill, "Grillen");
    });

    it("définit les libellés courts pour l'affichage selon screens.md §6.3", () => {
      assert.equal(MEAL_SHORT_LABELS.frueh, "Früh");
      assert.equal(MEAL_SHORT_LABELS.mittag, "Mittag");
      assert.equal(MEAL_SHORT_LABELS.abend, "Abend");
      assert.equal(MEAL_SHORT_LABELS.lunchpaket, "LP");
      assert.equal(MEAL_SHORT_LABELS.grill, "GR");
    });

    it("définit les libellés des régimes selon tokens.md §4.3", () => {
      assert.equal(DIET_LABELS.veg, "Vegetarisch");
      assert.equal(DIET_LABELS.vegan, "Vegan");
      assert.equal(DIET_LABELS.mos, "ohne Schweinefleisch");
      assert.equal(DIET_LABELS.al, "Allergien");
    });
  });

  describe("model.ts - fonctions pures de calcul et formatage", () => {
    it("calcule correctement les régimes d'un groupe", () => {
      const diets = calculateGroupDiets([
        { meal: "mittag", count: 10, veg: 2, vegan: 1, mos: 3, al: 1 },
        { meal: "abend", count: 10, veg: 3, vegan: 0, mos: 2, al: 0 },
      ]);

      assert.deepEqual(diets, {
        veg: 5,
        vegan: 1,
        mos: 5,
        al: 1,
      });
    });

    it("calcule les totaux par repas", () => {
      const groups: KitchenGroupDetail[] = [
        {
          matchcode: "TEST/1",
          meals: [
            { meal: "frueh", count: 20, veg: 2, vegan: 1, mos: 0, al: 0 },
            { meal: "lunchpaket", count: 15, veg: 1, vegan: 0, mos: 2, al: 0 },
          ],
          diets: { veg: 3, vegan: 1, mos: 2, al: 0 },
        },
      ];

      const totals = calculateKitchenTotals(groups);

      assert.equal(totals.frueh.total, 20);
      assert.equal(totals.lunchpaket.total, 15);
      assert.equal(totals.mittag.total, 0);
      assert.equal(totals.abend.total, 0);
      assert.equal(totals.grill.total, 0);
    });

    it("formate le résumé des repas d'un groupe selon screens.md §6.3", () => {
      const summary = formatGroupMealsSummary([
        { meal: "lunchpaket", count: 80, veg: 8, vegan: 0, mos: 4, al: 0 },
        { meal: "abend", count: 68, veg: 8, vegan: 0, mos: 4, al: 0 },
      ]);

      assert.equal(summary, "Mittag LP 80 · Abend 68");

      const grillSummary = formatGroupMealsSummary([
        { meal: "abend", count: 12, veg: 4, vegan: 2, mos: 4, al: 1 },
        { meal: "grill", count: 12, veg: 0, vegan: 0, mos: 0, al: 0, time: 1080 },
      ]);

      assert.equal(grillSummary, "Abend 12 · GR 12 (18:00)");
    });

    it("formate les régimes dans l'ordre strict VEG · vegan · MOS · AL", () => {
      assert.equal(
        formatDietsSummary({ veg: 8, vegan: 2, mos: 4, al: 1 }, { laktose: 1 }),
        "VEG 8 · vegan 2 · MOS 4 · AL 1 (Laktose)",
      );
      assert.equal(formatDietsSummary({ veg: 8, vegan: 0, mos: 4, al: 0 }), "VEG 8 · MOS 4");
    });
  });

  describe("Fixture fictive (Acceptation issue #33)", () => {
    it("comprend un jour avec 80 Lunchpakete", () => {
      assert.equal(kitchenDayFixture.totals.lunchpaket.total, 80);

      const has80LpGroup = kitchenDayFixture.groups.some((g) =>
        g.meals.some((m) => m.meal === "lunchpaket" && m.count === 80),
      );
      assert.equal(has80LpGroup, true);
    });

    it("comprend un Grillen", () => {
      assert.ok(kitchenDayFixture.totals.grill.total > 0);

      const hasGrillGroup = kitchenDayFixture.groups.some((g) =>
        g.meals.some((m) => m.meal === "grill" && m.count > 0),
      );
      assert.equal(hasGrillGroup, true);
    });

    it("comprend une note courte « 1× Nudeln/Müsli » au niveau du groupe", () => {
      const hasNote = kitchenDayFixture.groups.some((g) => g.note?.includes("1× Nudeln/Müsli"));
      assert.equal(hasNote, true);
    });

    it("utilise uniquement des données fictives et matchcodes inventés", () => {
      for (const group of kitchenDayFixture.groups) {
        assert.ok(
          group.matchcode.startsWith("MUSTER") ||
            group.matchcode.startsWith("TSV") ||
            group.matchcode.startsWith("TEST") ||
            group.matchcode.startsWith("Einzelgäste"),
          `Matchcode non conforme : ${group.matchcode}`,
        );
      }
    });

    it("fournit le menu avec plat principal, variante veg et dessert", () => {
      const { mittag, abend } = kitchenDayFixture.menu;

      assert.ok(mittag);
      assert.equal(mittag.meal, "mittag");
      assert.ok(mittag.mainDish.length > 0);
      assert.ok(mittag.vegVariant && mittag.vegVariant.length > 0);
      assert.ok(mittag.dessert && mittag.dessert.length > 0);

      assert.ok(abend);
      assert.equal(abend.meal, "abend");
      assert.ok(abend.mainDish.length > 0);
      assert.ok(abend.vegVariant && abend.vegVariant.length > 0);
      assert.ok(abend.dessert && abend.dessert.length > 0);
    });

    it("gère correctement les indicateurs noLunch et noDinner", () => {
      // Jour standard avec déjeuner et dîner
      assert.equal(kitchenDayFixture.noLunch, false);
      assert.equal(kitchenDayFixture.noDinner, false);

      // Jour sans déjeuner (kitchenDayNoLunchFixture)
      assert.equal(kitchenDayNoLunchFixture.noLunch, true);
      assert.equal(kitchenDayNoLunchFixture.noDinner, false);
      assert.equal(kitchenDayNoLunchFixture.totals.mittag.total, 0);
      assert.equal(kitchenDayNoLunchFixture.menu.mittag, null);
    });
  });

  describe("Cohérence des totaux de la fixture avec le détail par groupe", () => {
    it("valide que chaque total de repas est exactement égal à la somme des groupes", () => {
      const meals: MealType[] = ["frueh", "mittag", "abend", "lunchpaket", "grill"];

      for (const meal of meals) {
        let expectedTotal = 0;
        let expectedVeg = 0;
        let expectedVegan = 0;
        let expectedMos = 0;
        let expectedAl = 0;

        for (const group of kitchenDayFixture.groups) {
          for (const m of group.meals) {
            if (m.meal === meal) {
              expectedTotal += m.count;
              expectedVeg += m.veg;
              expectedVegan += m.vegan;
              expectedMos += m.mos;
              expectedAl += m.al;
            }
          }
        }

        const mealTotal = kitchenDayFixture.totals[meal];
        assert.equal(mealTotal.total, expectedTotal, `Total count pour ${meal} ne correspond pas`);
        assert.equal(mealTotal.veg, expectedVeg, `Total veg pour ${meal} ne correspond pas`);
        assert.equal(mealTotal.vegan, expectedVegan, `Total vegan pour ${meal} ne correspond pas`);
        assert.equal(mealTotal.mos, expectedMos, `Total mos pour ${meal} ne correspond pas`);
        assert.equal(mealTotal.al, expectedAl, `Total al pour ${meal} ne correspond pas`);
      }
    });

    it("vérifie les chiffres exacts de la maquette screens.md §6.3", () => {
      // Früh 121, Mittag 38, LP 80, Abend 25 (VEG 10, vegan 2, MOS 9, AL 1), GR 12
      assert.equal(kitchenDayFixture.totals.frueh.total, 121);
      assert.equal(kitchenDayFixture.totals.mittag.total, 38);
      assert.equal(kitchenDayFixture.totals.lunchpaket.total, 80);
      assert.equal(kitchenDayFixture.totals.abend.total, 25);
      assert.equal(kitchenDayFixture.totals.grill.total, 12);

      // Détail des régimes pour Abend (screens.md §6.3 ligne 74)
      assert.equal(kitchenDayFixture.totals.abend.veg, 10);
      assert.equal(kitchenDayFixture.totals.abend.vegan, 2);
      assert.equal(kitchenDayFixture.totals.abend.mos, 9);
      assert.equal(kitchenDayFixture.totals.abend.al, 1);
    });

    it("valide la cohérence interne des régimes de chaque groupe", () => {
      for (const group of kitchenDayFixture.groups) {
        let sumVeg = 0;
        let sumVegan = 0;
        let sumMos = 0;
        let sumAl = 0;

        for (const m of group.meals) {
          sumVeg += m.veg;
          sumVegan += m.vegan;
          sumMos += m.mos;
          sumAl += m.al;
        }

        assert.equal(group.diets.veg, sumVeg);
        assert.equal(group.diets.vegan, sumVegan);
        assert.equal(group.diets.mos, sumMos);
        assert.equal(group.diets.al, sumAl);
      }
    });
  });

  describe("hooks.ts - useKitchenDay", () => {
    it("renvoie un ViewState success avec la fixture pour la date de démo", () => {
      const state = useKitchenDay("2026-09-30");

      assert.equal(state.status, "success");
      assert.ok(state.data);
      assert.equal(state.data.date, "2026-09-30");
      assert.equal(state.updatedAt, "14:32");
    });

    it("renvoie un ViewState success pour la fixture sans déjeuner", () => {
      const state = useKitchenDay("2026-10-05");

      assert.equal(state.status, "success");
      assert.ok(state.data);
      assert.equal(state.data.date, "2026-10-05");
      assert.equal(state.data.noLunch, true);
    });

    it("renvoie un ViewState empty pour une date inconnue", () => {
      const state = useKitchenDay("2099-01-01");

      assert.equal(state.status, "empty");
      assert.equal(state.data, undefined);
    });
  });
});
