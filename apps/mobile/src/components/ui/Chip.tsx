import React from "react";
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";
import { chipColors, theme, type ChipVariant } from "../../lib/theme";

export interface ChipProps {
  label: string;
  variant?: ChipVariant;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  variant = "dienst",
  icon,
  style,
  textStyle,
  testID,
}) => {
  const isFrei = variant === "frei";
  const colors = chipColors[variant] ?? chipColors.dienst;

  const containerStyle: ViewStyle = {
    backgroundColor: colors.bg,
    borderColor: isFrei ? theme.colors.border : undefined,
    borderWidth: isFrei ? theme.borders.width : theme.borders.none,
    borderStyle: isFrei ? "dashed" : undefined,
  };

  const textTokenStyle: TextStyle = {
    color: colors.text,
  };

  return (
    <View
      testID={testID}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={label}
      style={[styles.container, containerStyle, style]}
    >
      {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
      <Text style={[styles.text, textTokenStyle, textStyle]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: theme.layout.chipHeight,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.space[2],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  iconContainer: {
    marginRight: theme.space[1],
  },
  text: {
    ...theme.typography.caption,
    fontWeight: theme.fontWeights.semibold,
  },
});

export default Chip;
