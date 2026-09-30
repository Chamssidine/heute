import React from "react";
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { theme } from "../../../lib/theme";
import { strings } from "../../../strings";
import { shiftDate } from "./dateUtils.ts";

export interface DaySelectorProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  todayDate: string;
  style?: StyleProp<ViewStyle>;
}

export const DaySelector: React.FC<DaySelectorProps> = ({
  currentDate,
  onDateChange,
  todayDate,
  style,
}) => {
  const isToday = currentDate === todayDate;

  return (
    <View style={[styles.container, style]} testID="day-selector">
      <Pressable
        testID="day-selector-prev"
        onPress={() => onDateChange(shiftDate(currentDate, -1))}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={strings.kitchen.previousDay}
        hitSlop={8}
        style={({ pressed }) => [styles.arrowButton, pressed && styles.pressed]}
      >
        <Text style={styles.arrowText}>◀</Text>
      </Pressable>

      <Pressable
        testID="day-selector-today"
        onPress={() => onDateChange(todayDate)}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={strings.kitchen.today}
        accessibilityState={{ selected: isToday }}
        hitSlop={8}
        style={({ pressed }) => [
          styles.todayButton,
          isToday && styles.todayButtonActive,
          pressed && styles.pressed,
        ]}
      >
        <Text style={[styles.todayText, isToday && styles.todayTextActive]}>
          {strings.kitchen.today}
        </Text>
      </Pressable>

      <Pressable
        testID="day-selector-next"
        onPress={() => onDateChange(shiftDate(currentDate, 1))}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={strings.kitchen.nextDay}
        hitSlop={8}
        style={({ pressed }) => [styles.arrowButton, pressed && styles.pressed]}
      >
        <Text style={styles.arrowText}>▶</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.sm,
    borderWidth: theme.borders.width,
    borderColor: theme.colors.border,
    padding: 2,
  },
  arrowButton: {
    minHeight: 32,
    minWidth: 32,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.space[1],
    borderRadius: theme.radius.sm - 2,
  },
  arrowText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontWeight: theme.fontWeights.bold,
  },
  todayButton: {
    minHeight: 32,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.space[2],
    borderRadius: theme.radius.sm - 2,
  },
  todayButtonActive: {
    backgroundColor: theme.colors.surface,
  },
  todayText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontWeight: theme.fontWeights.regular,
  },
  todayTextActive: {
    color: theme.colors.text,
    fontWeight: theme.fontWeights.bold,
  },
  pressed: {
    opacity: theme.opacities.pressed,
  },
});

export default DaySelector;
