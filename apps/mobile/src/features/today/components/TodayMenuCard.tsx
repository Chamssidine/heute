import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Card } from "../../../components/ui/Card";
import { theme } from "../../../lib/theme";
import { strings } from "../../../strings";
import type { TodayMenu } from "../model";

export interface TodayMenuCardProps {
  menu: TodayMenu;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const TodayMenuCard: React.FC<TodayMenuCardProps> = ({
  menu,
  style,
  testID = "today-card-menu",
}) => {
  const mittagText = menu.noLunch || !menu.mittag ? strings.meals.noLunch : menu.mittag.formatted;

  const abendText = menu.noDinner || !menu.abend ? strings.today.noDinner : menu.abend.formatted;

  return (
    <Card testID={testID} title={strings.today.menu} style={style}>
      <View style={styles.content}>
        {/* Ligne Mittag */}
        <View style={styles.menuRow}>
          <Text style={styles.mealLabel}>{strings.today.mittag}</Text>
          <Text
            testID="today-menu-mittag"
            style={styles.dishDescription}
            android_hyphenationFrequency="normal"
          >
            {mittagText}
          </Text>
        </View>

        {/* Ligne Abend */}
        <View style={styles.menuRow}>
          <Text style={styles.mealLabel}>{strings.today.abend}</Text>
          <Text
            testID="today-menu-abend"
            style={styles.dishDescription}
            android_hyphenationFrequency="normal"
          >
            {abendText}
          </Text>
        </View>

        {/* Rappel permanent allergies / modifications */}
        <Text
          testID="today-menu-disclaimer"
          style={styles.disclaimer}
          android_hyphenationFrequency="normal"
        >
          {menu.disclaimer}
        </Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: theme.space[2],
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  mealLabel: {
    ...theme.typography.bodyStrong,
    color: theme.colors.text,
    width: 68,
  },
  dishDescription: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
  },
  disclaimer: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.space[2],
  },
});

export default TodayMenuCard;
