import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { strings } from "../../../strings/index.ts";
import { calculateKitchenTotals } from "../model.ts";
import { berlinToday, formatDayLabel, shiftDate } from "./dateUtils.ts";
import { buildGroupDetailLines } from "./groupUtils.ts";
import { buildMealDisplayInfo } from "./menuUtils.ts";
import { buildKitchenMealTiles, buildMealChips } from "./totalsUtils.ts";

describe("features/kitchen/components (P2-06 [U])", () => {
  describe("DaySelector - shiftDate", () => {
    it("décale la date d'un jour en avant et franchit la fin de mois", () => {
      assert.equal(shiftDate("2026-09-30", 1), "2026-10-01");
      assert.equal(shiftDate("2026-10-01", 1), "2026-10-02");
    });

    it("décale la date d'un jour en arrière", () => {
      assert.equal(shiftDate("2026-10-01", -1), "2026-09-30");
      assert.equal(shiftDate("2026-09-30", -1), "2026-09-29");
    });

    it("gère les décalages de plusieurs jours", () => {
      assert.equal(shiftDate("2026-09-30", 5), "2026-10-05");
      assert.equal(shiftDate("2026-10-05", -5), "2026-09-30");
    });

    it("fournit la date courante Europe/Berlin au format YYYY-MM-DD", () => {
      const today = berlinToday();
      assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("formatDayLabel", () => {
    it("formate la date au format court allemand avec jour de la semaine (screens.md §6.3)", () => {
      assert.equal(formatDayLabel("2026-09-30"), "Mi, 30.09.");
      assert.equal(formatDayLabel("2026-10-05"), "Mo, 05.10.");
    });
  });

  describe("KitchenTotalsSection - buildKitchenMealTiles & chips", () => {
    it("conserve le chip LP sur la tuile Mittag lorsque noLunch=true et lunchpaket.total > 0", () => {
      const totals = calculateKitchenTotals([
        {
          matchcode: "AUSFLUG/50001",
          meals: [
            {
              meal: "lunchpaket",
              count: 80,
              veg: 10,
              vegan: 0,
              mos: 5,
              al: 0,
            },
          ],
        },
      ]);

      assert.equal(totals.lunchpaket.total, 80);
      assert.equal(totals.mittag.total, 0);

      const tiles = buildKitchenMealTiles(totals, { noLunch: true, noDinner: false });

      // La tuile Mittag est annulée (« Kein Mittagessen »)
      assert.equal(tiles.mittag.isCancelled, true);
      assert.equal(tiles.mittag.cancelledText, strings.meals.noLunch);

      // Le chip LP est bien présent dans les chips de la tuile
      const lpChip = tiles.mittag.chips.find((c) => c.variant === "lp");
      assert.ok(lpChip, "Le chip LP doit être présent même si le déjeuner est annulé");
      assert.equal(lpChip.label, "LP 80");
      assert.equal(lpChip.count, 80);
    });

    it("aligne l'annulation strictement sur noLunch et noDinner (et non sur total === 0)", () => {
      const totals = calculateKitchenTotals([
        {
          matchcode: "TEST/10001",
          meals: [{ meal: "abend", count: 15, veg: 0, vegan: 0, mos: 0, al: 0 }],
        },
      ]);

      // Cas 1 : noLunch=false et total midi = 0 -> ne doit PAS être marqué « Kein Mittagessen »
      const tilesNoLunchFalse = buildKitchenMealTiles(totals, { noLunch: false, noDinner: true });
      assert.equal(tilesNoLunchFalse.mittag.isCancelled, false);

      // Cas 2 : noDinner=true et total soir > 0 -> doit être marqué « Kein Abendessen »
      assert.equal(tilesNoLunchFalse.abend.isCancelled, true);
      assert.equal(tilesNoLunchFalse.abend.cancelledText, strings.meals.noDinner);

      // Cas 3 : noDinner=false et total soir > 0 -> non annulé
      const tilesNoDinnerFalse = buildKitchenMealTiles(totals, { noLunch: false, noDinner: false });
      assert.equal(tilesNoDinnerFalse.abend.isCancelled, false);
    });

    it("respecte l'ordre conventionnel des chips : VEG · vegan · MOS · AL · LP / GR (tokens.md §4.3)", () => {
      const mealTotal = {
        meal: "mittag" as const,
        total: 50,
        veg: 12,
        vegan: 4,
        mos: 8,
        al: 2,
      };

      const chips = buildMealChips(mealTotal, {
        key: "lp",
        variant: "lp",
        label: "LP 20",
        count: 20,
      });

      assert.deepEqual(
        chips.map((c) => c.variant),
        ["veg", "vegan", "mos", "al", "lp"],
      );
      assert.deepEqual(
        chips.map((c) => c.label),
        ["VEG 12", "vegan 4", "MOS 8", "AL 2", "LP 20"],
      );
    });
  });

  describe("KitchenMenuSection - buildMealDisplayInfo", () => {
    it("affiche « Menü noch nicht eingetragen » avec style atténué quand le menu n'est pas saisi sans annulation", () => {
      const display = buildMealDisplayInfo({
        label: "Mittag",
        item: null,
        isCancelled: false,
        cancelledText: strings.meals.noLunch,
      });

      assert.equal(display.dishText, "Menü noch nicht eingetragen");
      assert.equal(display.dishText, strings.kitchen.menuNotEntered);
      assert.equal(display.isMuted, true);
      assert.equal(display.details, "");
    });

    it("affiche le texte d'annulation quand isCancelled=true même si aucun menu n'est saisi", () => {
      const display = buildMealDisplayInfo({
        label: "Mittag",
        item: null,
        isCancelled: true,
        cancelledText: strings.meals.noLunch,
      });

      assert.equal(display.dishText, "Kein Mittagessen");
      assert.equal(display.isMuted, true);
      assert.equal(display.details, "");
    });

    it("affiche le plat principal et les détails quand le menu est saisi et non annulé", () => {
      const display = buildMealDisplayInfo({
        label: "Mittag",
        item: {
          meal: "mittag",
          mainDish: "Chili con Carne mit Nudeln",
          vegVariant: "Chili sin Carne",
          dessert: "Obstsalat",
        },
        isCancelled: false,
        cancelledText: strings.meals.noLunch,
      });

      assert.equal(display.dishText, "Chili con Carne mit Nudeln");
      assert.equal(display.isMuted, false);
      assert.equal(display.details, "Veg: Chili sin Carne · Nachspeise: Obstsalat");
    });
  });

  describe("KitchenGroupsSection - buildGroupDetailLines", () => {
    it("préfixe chaque ligne par le libellé court du repas pour éviter toute ambiguïté", () => {
      const lines = buildGroupDetailLines([
        {
          meal: "lunchpaket",
          count: 80,
          veg: 8,
          vegan: 0,
          mos: 4,
          al: 0,
          note: "1× Nudeln/Müsli",
        },
        {
          meal: "abend",
          count: 12,
          veg: 5,
          vegan: 0,
          mos: 4,
          al: 0,
        },
      ]);

      assert.deepEqual(lines, ["LP: VEG 8 · MOS 4 · „1× Nudeln/Müsli“", "Abend: VEG 5 · MOS 4"]);
    });

    it("indique précisément les allergies par repas", () => {
      const lines = buildGroupDetailLines([
        {
          meal: "abend",
          count: 12,
          veg: 4,
          vegan: 2,
          mos: 4,
          al: 1,
          allergies: { laktose: 1 },
        },
        {
          meal: "grill",
          count: 12,
          veg: 0,
          vegan: 0,
          mos: 0,
          al: 0,
        },
      ]);

      assert.deepEqual(lines, ["Abend: VEG 4 · vegan 2 · MOS 4 · AL 1 (Laktose)"]);
    });

    it("ne produit aucune ligne de détail si aucun repas n'a de régime, allergie ou note", () => {
      const lines = buildGroupDetailLines([
        {
          meal: "frueh",
          count: 30,
          veg: 0,
          vegan: 0,
          mos: 0,
          al: 0,
        },
      ]);

      assert.deepEqual(lines, []);
    });
  });
});
