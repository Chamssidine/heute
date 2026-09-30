import React from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Chip } from "../../../components/ui/Chip";
import { theme, type ChipVariant } from "../../../lib/theme";
import type { TeamShift, TeamShiftType } from "../model";

const SHIFT_TYPE_TO_CHIP_VARIANT: Partial<Record<TeamShiftType, ChipVariant>> = {
  td: "teildienst",
  sem: "seminar",
};

export interface TeamShiftRowProps {
  shift: TeamShift;
  isLast?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const TeamShiftRow: React.FC<TeamShiftRowProps> = ({
  shift,
  isLast = false,
  style,
  testID,
}) => {
  const isAbsentOrFrei = shift.type === "abwesend" || shift.type === "frei";
  const chipVariant = SHIFT_TYPE_TO_CHIP_VARIANT[shift.type] ?? "teildienst";

  const a11yLabel = `${shift.name}, ${shift.hours}${
    shift.badgeLabel ? `, ${shift.badgeLabel}` : ""
  }`;

  return (
    <View
      testID={testID ?? `team-shift-${shift.id}`}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={a11yLabel}
      style={[styles.container, !isLast && styles.bottomBorder, style]}
    >
      <View style={styles.nameContainer}>
        <Text style={styles.nameText} android_hyphenationFrequency="normal">
          {shift.name}
        </Text>
      </View>

      <View style={styles.detailsContainer}>
        <Text
          style={[styles.hoursText, isAbsentOrFrei && styles.mutedText]}
          android_hyphenationFrequency="normal"
        >
          {shift.hours}
        </Text>

        {shift.badgeLabel ? (
          <View style={styles.chipContainer}>
            <Chip label={shift.badgeLabel} variant={chipVariant} />
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: theme.layout.listRowMinHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.space[3],
    paddingHorizontal: theme.space[4],
    backgroundColor: theme.colors.surface,
  },
  bottomBorder: {
    borderBottomWidth: theme.borders.width,
    borderBottomColor: theme.colors.border,
  },
  nameContainer: {
    flex: 1,
    marginRight: theme.space[3],
    justifyContent: "center",
  },
  nameText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  detailsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: theme.space[2],
  },
  hoursText: {
    ...theme.typography.bodyStrong,
    ...theme.tabularNums,
    color: theme.colors.text,
  },
  mutedText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  chipContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
});

export default TeamShiftRow;
