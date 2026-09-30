import React from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "../../../lib/theme";
import { strings } from "../../../strings";
import type { TeamGroup } from "../model";
import { TeamShiftRow } from "./TeamShiftRow";

export interface TeamGroupSectionProps {
  group: TeamGroup;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const TeamGroupSection: React.FC<TeamGroupSectionProps> = ({ group, style, testID }) => {
  return (
    <View testID={testID ?? `team-group-${group.id}`} style={[styles.sectionContainer, style]}>
      <Text
        style={styles.groupTitle}
        accessibilityRole="header"
        android_hyphenationFrequency="normal"
      >
        {group.title}
      </Text>

      <View style={styles.cardContainer}>
        {group.shifts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{strings.common.empty}</Text>
          </View>
        ) : (
          group.shifts.map((shift, index) => (
            <TeamShiftRow key={shift.id} shift={shift} isLast={index === group.shifts.length - 1} />
          ))
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginBottom: theme.space[4],
  },
  groupTitle: {
    ...theme.typography.heading,
    color: theme.colors.text,
    marginBottom: theme.space[2],
  },
  cardContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: theme.borders.width,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  emptyContainer: {
    paddingVertical: theme.space[4],
    paddingHorizontal: theme.space[4],
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
});

export default TeamGroupSection;
