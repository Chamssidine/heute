import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Card } from "../../../components/ui";
import { theme } from "../../../lib/theme";
import { strings } from "../../../strings";
import { formatGroupMealsSummary, type KitchenGroupDetail } from "../model.ts";
import { buildGroupDetailLines } from "./groupUtils.ts";

export interface KitchenGroupsSectionProps {
  groups: readonly KitchenGroupDetail[];
  style?: StyleProp<ViewStyle>;
}

export const KitchenGroupsSection: React.FC<KitchenGroupsSectionProps> = ({ groups, style }) => {
  if (groups.length === 0) {
    return null;
  }

  return (
    <Card
      title={strings.kitchen.groupsTitle}
      style={[styles.container, style]}
      testID="kitchen-groups-section"
    >
      <View style={styles.list}>
        {groups.map((group, index) => {
          const isLast = index === groups.length - 1;
          const detailLines = buildGroupDetailLines(group.meals);

          return (
            <View
              key={group.matchcode}
              style={[styles.groupRow, !isLast && styles.groupRowBorder]}
              testID={`kitchen-group-${group.matchcode}`}
            >
              <View style={styles.headerLine}>
                <Text style={styles.matchcode} numberOfLines={1} ellipsizeMode="tail">
                  {group.matchcode}
                </Text>
                <Text style={styles.mealsSummary}>{formatGroupMealsSummary(group.meals)}</Text>
              </View>

              {detailLines.map((detail, lineIdx) => (
                <Text key={lineIdx} style={styles.detailText}>
                  {detail}
                </Text>
              ))}
            </View>
          );
        })}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: theme.space[4],
  },
  list: {
    gap: theme.space[3],
  },
  groupRow: {
    paddingBottom: theme.space[3],
  },
  groupRowBorder: {
    borderBottomWidth: theme.borders.width,
    borderBottomColor: theme.colors.border,
  },
  headerLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.space[2],
  },
  matchcode: {
    ...theme.typography.bodyStrong,
    color: theme.colors.text,
    flex: 1,
  },
  mealsSummary: {
    ...theme.typography.label,
    ...theme.tabularNums,
    color: theme.colors.textMuted,
  },
  detailText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.space[1],
  },
});

export default KitchenGroupsSection;
