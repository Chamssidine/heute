import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Chip, CountTile } from "../../../components/ui";
import { theme } from "../../../lib/theme";
import type { KitchenTotals } from "../model.ts";
import { buildKitchenMealTiles, type MealChipData } from "./totalsUtils.ts";

export interface KitchenTotalsSectionProps {
  totals: KitchenTotals;
  noLunch?: boolean;
  noDinner?: boolean;
  style?: StyleProp<ViewStyle>;
}

function renderChips(chips: MealChipData[]): React.ReactNode {
  if (chips.length === 0) return null;
  return (
    <>
      {chips.map((chip) => (
        <Chip
          key={chip.key}
          variant={chip.variant}
          label={chip.label}
          testID={`chip-${chip.key}`}
        />
      ))}
    </>
  );
}

export const KitchenTotalsSection: React.FC<KitchenTotalsSectionProps> = ({
  totals,
  noLunch = false,
  noDinner = false,
  style,
}) => {
  const tiles = buildKitchenMealTiles(totals, { noLunch, noDinner });

  return (
    <View style={[styles.container, style]} testID="kitchen-totals">
      <CountTile
        testID="count-tile-frueh"
        label={tiles.frueh.label}
        count={tiles.frueh.count}
        chips={renderChips(tiles.frueh.chips)}
      />

      <CountTile
        testID="count-tile-mittag"
        label={tiles.mittag.label}
        count={tiles.mittag.count}
        isCancelled={tiles.mittag.isCancelled}
        cancelledText={tiles.mittag.cancelledText}
        chips={renderChips(tiles.mittag.chips)}
      />

      <CountTile
        testID="count-tile-abend"
        label={tiles.abend.label}
        count={tiles.abend.count}
        isCancelled={tiles.abend.isCancelled}
        cancelledText={tiles.abend.cancelledText}
        chips={renderChips(tiles.abend.chips)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: theme.space[3],
  },
});

export default KitchenTotalsSection;
