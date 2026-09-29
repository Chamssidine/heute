import React from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "../../../lib/theme";
import { strings } from "../../../strings";

export type ShiftViewMode = "woche" | "monat";

export interface ViewModeSelectorProps {
  mode: ShiftViewMode;
  onChange: (mode: ShiftViewMode) => void;
  style?: StyleProp<ViewStyle>;
}

export const ViewModeSelector: React.FC<ViewModeSelectorProps> = ({ mode, onChange, style }) => {
  const isWoche = mode === "woche";
  const isMonat = mode === "monat";

  return (
    <View accessible={false} style={[styles.container, style]}>
      <Pressable
        testID="view-mode-woche"
        onPress={() => onChange("woche")}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={strings.shifts.week}
        accessibilityState={{ selected: isWoche }}
        hitSlop={6}
        style={({ pressed }) => [
          styles.button,
          isWoche && styles.buttonActive,
          pressed && styles.pressed,
        ]}
      >
        <Text style={[styles.label, isWoche && styles.labelActive]}>{strings.shifts.week}</Text>
      </Pressable>

      <Pressable
        testID="view-mode-monat"
        onPress={() => onChange("monat")}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={strings.shifts.month}
        accessibilityState={{ selected: isMonat }}
        hitSlop={6}
        style={({ pressed }) => [
          styles.button,
          isMonat && styles.buttonActive,
          pressed && styles.pressed,
        ]}
      >
        <Text style={[styles.label, isMonat && styles.labelActive]}>{strings.shifts.month}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.sm,
    padding: 2,
    borderWidth: theme.borders.width,
    borderColor: theme.colors.border,
  },
  button: {
    minHeight: 36,
    minWidth: theme.layout.minTouchTarget,
    paddingHorizontal: theme.space[3],
    justifyContent: "center",
    alignItems: "center",
    borderRadius: theme.radius.sm - 2,
  },
  buttonActive: {
    backgroundColor: theme.colors.surface,
  },
  label: {
    ...theme.typography.label,
    color: theme.colors.textMuted,
  },
  labelActive: {
    color: theme.colors.text,
    fontWeight: theme.fontWeights.bold,
  },
  pressed: {
    opacity: theme.opacities.pressed,
  },
});

export default ViewModeSelector;
