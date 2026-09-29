import React from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { formatHours } from "@heute/domain";
import { Chip } from "../../../components/ui/Chip";
import { theme, type ChipVariant } from "../../../lib/theme";
import { strings } from "../../../strings";
import type { ShiftDay } from "../model";
import { formatShiftDate } from "./formatters";

const SHIFT_TYPE_TO_CHIP_VARIANT: Record<ShiftDay["type"], ChipVariant> = {
  normal: "dienst",
  td: "teildienst",
  sem: "seminar",
  urlaub: "urlaub",
  krank: "krank",
  frei: "frei",
};

export interface ShiftRowProps {
  day: ShiftDay;
  isLast?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const ShiftRow: React.FC<ShiftRowProps> = ({ day, isLast = false, style, testID }) => {
  const formattedDate = formatShiftDate(day.date);
  const chipVariant = SHIFT_TYPE_TO_CHIP_VARIANT[day.type];
  const formattedDuration = formatHours(day.istMinutes);
  const showSundayBonus = day.isSunday && day.istMinutes > 0;

  const a11yLabel = `${formattedDate}, ${day.label}, ${day.hours}, ${formattedDuration}${
    showSundayBonus ? ` ${strings.shifts.sundayBonus}` : ""
  }`;

  return (
    <View
      testID={testID ?? `shift-day-${day.date}`}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={a11yLabel}
      style={[styles.container, !isLast && styles.bottomBorder, style]}
    >
      <View style={styles.dateContainer}>
        <Text style={styles.dateText}>{formattedDate}</Text>
      </View>

      <View style={styles.hoursContainer}>
        <Text style={styles.hoursText} android_hyphenationFrequency="normal">
          {day.hours}
        </Text>
      </View>

      <View style={styles.chipContainer}>
        <Chip label={day.badgeLabel} variant={chipVariant} />
      </View>

      <View style={styles.durationContainer}>
        <Text style={styles.durationText}>{formattedDuration}</Text>
        {showSundayBonus ? (
          <Text style={styles.sundayBonusText}>{strings.shifts.sundayBonus}</Text>
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
    paddingVertical: theme.space[3],
    paddingHorizontal: theme.space[3],
    backgroundColor: theme.colors.surface,
  },
  bottomBorder: {
    borderBottomWidth: theme.borders.width,
    borderBottomColor: theme.colors.border,
  },
  dateContainer: {
    width: 76,
    justifyContent: "center",
  },
  dateText: {
    ...theme.typography.bodyStrong,
    ...theme.tabularNums,
    color: theme.colors.text,
  },
  hoursContainer: {
    flex: 1,
    paddingHorizontal: theme.space[2],
    justifyContent: "center",
  },
  hoursText: {
    ...theme.typography.body,
    ...theme.tabularNums,
    color: theme.colors.text,
  },
  chipContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.space[2],
  },
  durationContainer: {
    minWidth: 70,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  durationText: {
    ...theme.typography.bodyStrong,
    ...theme.tabularNums,
    color: theme.colors.text,
    textAlign: "right",
  },
  sundayBonusText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textAlign: "right",
    marginTop: theme.space[1],
  },
});

export default ShiftRow;
