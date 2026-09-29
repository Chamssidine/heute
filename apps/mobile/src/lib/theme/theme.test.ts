import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);

const { colors, chipColors } = require("./colors.ts") as typeof import("./colors");
const { typography, tabularNums } = require("./typography.ts") as typeof import("./typography");
const { space, spacing, radius, borders, layout } =
  require("./spacing.ts") as typeof import("./spacing");

test("colors contain all required light tokens from tokens.md §3.1", () => {
  assert.equal(colors.bg, "#F5F6F8");
  assert.equal(colors.surface, "#FFFFFF");
  assert.equal(colors.surfaceMuted, "#EEF0F3");
  assert.equal(colors.border, "#CDD2DA");
  assert.equal(colors.borderStrong, "#8A94A3");
  assert.equal(colors.text, "#111827");
  assert.equal(colors.textMuted, "#4B5563");
  assert.equal(colors.primary, "#1D4ED8");
  assert.equal(colors.onPrimary, "#FFFFFF");
  assert.equal(colors.primarySoft, "#DBEAFE");
  assert.equal(colors.onPrimarySoft, "#1E3A8A");
  assert.equal(colors.success, "#15803D");
  assert.equal(colors.successSoft, "#DCFCE7");
  assert.equal(colors.onSuccessSoft, "#14532D");
  assert.equal(colors.warning, "#B45309");
  assert.equal(colors.warningSoft, "#FEF3C7");
  assert.equal(colors.onWarningSoft, "#78350F");
  assert.equal(colors.danger, "#B91C1C");
  assert.equal(colors.dangerSoft, "#FEE2E2");
  assert.equal(colors.onDangerSoft, "#7F1D1D");
  assert.equal(colors.neutralSoft, "#E5E7EB");
  assert.equal(colors.onNeutralSoft, "#374151");
  assert.equal(colors.marker, "#FDE047");
  assert.equal(colors.onMarker, "#111827");
});

test("chipColors match tokens.md §3.1 and §4.1", () => {
  assert.equal(chipColors.dienst.bg, "#DBEAFE");
  assert.equal(chipColors.dienst.text, "#1E3A8A");
  assert.equal(chipColors.teildienst.bg, "#EDE9FE");
  assert.equal(chipColors.teildienst.text, "#4C1D95");
  assert.equal(chipColors.seminar.bg, "#CCFBF1");
  assert.equal(chipColors.seminar.text, "#115E59");
  assert.equal(chipColors.abwesend.bg, "#E5E7EB");
  assert.equal(chipColors.abwesend.text, "#374151");
  assert.equal(chipColors.frei.bg, "#EEF0F3");
  assert.equal(chipColors.frei.text, "#4B5563");
  assert.equal(chipColors.frei.border, "#CDD2DA");
  assert.equal(chipColors.veg.bg, "#DCFCE7");
  assert.equal(chipColors.veg.text, "#14532D");
  assert.equal(chipColors.vegan.bg, "#ECFCCB");
  assert.equal(chipColors.vegan.text, "#365314");
  assert.equal(chipColors.mos.bg, "#E5E7EB");
  assert.equal(chipColors.mos.text, "#1F2937");
  assert.equal(chipColors.al.bg, "#FEE2E2");
  assert.equal(chipColors.al.text, "#7F1D1D");
  assert.equal(chipColors.lp.bg, "#FFEDD5");
  assert.equal(chipColors.lp.text, "#7C2D12");
  assert.equal(chipColors.gr.bg, "#FEF3C7");
  assert.equal(chipColors.gr.text, "#78350F");
  assert.equal(chipColors.offen.bg, "#E5E7EB");
  assert.equal(chipColors.inArbeit.bg, "#FEF3C7");
  assert.equal(chipColors.erledigt.bg, "#DCFCE7");
});

test("typography tokens match tokens.md §3.3", () => {
  assert.deepEqual(typography.display, {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: "700",
  });
  assert.deepEqual(typography.title, {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "700",
  });
  assert.deepEqual(typography.heading, {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600",
  });
  assert.deepEqual(typography.body, {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "400",
  });
  assert.deepEqual(typography.bodyStrong, {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "600",
  });
  assert.deepEqual(typography.label, {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
  });
  assert.deepEqual(typography.caption, {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
  });
  assert.deepEqual(tabularNums, {
    fontVariant: ["tabular-nums"],
  });
});

test("spacing, radius, and layout tokens match tokens.md §3.4 and §3.5", () => {
  assert.equal(space[1], 4);
  assert.equal(space[2], 8);
  assert.equal(space[3], 12);
  assert.equal(space[4], 16);
  assert.equal(space[5], 24);
  assert.equal(space[6], 32);

  assert.equal(spacing.screenMargin, 16);
  assert.equal(spacing.cardGap, 12);
  assert.equal(spacing.cardPadding, 16);

  assert.equal(radius.sm, 8);
  assert.equal(radius.md, 12);
  assert.equal(radius.full, 999);

  assert.equal(borders.width, 1);

  assert.ok(layout.minTouchTarget >= 48);
  assert.ok(layout.buttonHeightDefault >= 48);
  assert.ok(layout.buttonHeightLarge >= 48);
  assert.equal(layout.chipHeight, 28);
  assert.ok(layout.listRowMinHeight >= 56);
  assert.equal(layout.statusButtonHeight, 56);
});
