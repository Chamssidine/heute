import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Card } from "../../../components/ui";
import { theme } from "../../../lib/theme";
import { strings } from "../../../strings";
import { MEAL_SHORT_LABELS, type KitchenDayMenu, type MenuItem } from "../model.ts";
import { buildMealDisplayInfo } from "./menuUtils.ts";

export interface KitchenMenuSectionProps {
  menu: KitchenDayMenu;
  noLunch?: boolean;
  noDinner?: boolean;
  style?: StyleProp<ViewStyle>;
}

interface MealBlockProps {
  label: string;
  item: MenuItem | null;
  isCancelled: boolean;
  cancelledText: string;
  isLast?: boolean;
}

const MealBlock: React.FC<MealBlockProps> = ({
  label,
  item,
  isCancelled,
  cancelledText,
  isLast = false,
}) => {
  const display = buildMealDisplayInfo({
    label,
    item,
    isCancelled,
    cancelledText,
  });

  return (
    <View style={[styles.mealBlock, !isLast && styles.mealBlockBorder]}>
      <View style={styles.mealHeader}>
        <Text style={styles.mealLabel}>{display.label}</Text>
        <Text style={[styles.mainDish, display.isMuted && styles.cancelledDish]}>
          {display.dishText}
        </Text>
      </View>

      {display.details ? <Text style={styles.detailsText}>{display.details}</Text> : null}
    </View>
  );
};

export const KitchenMenuSection: React.FC<KitchenMenuSectionProps> = ({
  menu,
  noLunch = false,
  noDinner = false,
  style,
}) => {
  const isLunchCancelled = noLunch;
  const isDinnerCancelled = noDinner;

  return (
    <Card
      title={strings.kitchen.menuTitle}
      style={[styles.container, style]}
      testID="kitchen-menu-section"
    >
      <MealBlock
        label={MEAL_SHORT_LABELS.mittag}
        item={menu.mittag}
        isCancelled={isLunchCancelled}
        cancelledText={strings.meals.noLunch}
      />

      <MealBlock
        label={MEAL_SHORT_LABELS.abend}
        item={menu.abend}
        isCancelled={isDinnerCancelled}
        cancelledText={strings.meals.noDinner}
        isLast={true}
      />
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: theme.space[4],
  },
  mealBlock: {
    paddingBottom: theme.space[3],
  },
  mealBlockBorder: {
    borderBottomWidth: theme.borders.width,
    borderBottomColor: theme.colors.border,
    marginBottom: theme.space[3],
  },
  mealHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.space[2],
  },
  mealLabel: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textMuted,
    minWidth: 56,
  },
  mainDish: {
    ...theme.typography.bodyStrong,
    color: theme.colors.text,
    flex: 1,
  },
  cancelledDish: {
    color: theme.colors.textMuted,
    fontWeight: theme.fontWeights.regular,
  },
  detailsText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.space[1],
    marginLeft: 56 + theme.space[2],
  },
});

export default KitchenMenuSection;
