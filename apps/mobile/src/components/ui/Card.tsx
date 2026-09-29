import React from "react";
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { theme } from "../../lib/theme";

export interface CardProps {
  title?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
}

export const Card: React.FC<CardProps> = ({
  title,
  headerRight,
  children,
  onPress,
  style,
  testID,
  accessibilityLabel,
}) => {
  const hasHeader = Boolean(title || headerRight);

  const content = (
    <>
      {hasHeader ? (
        <View style={styles.header}>
          {title ? (
            <Text
              style={styles.title}
              accessibilityRole="header"
              android_hyphenationFrequency="normal"
            >
              {title}
            </Text>
          ) : (
            <View />
          )}
          {headerRight}
        </View>
      ) : null}
      {children}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        testID={testID}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        style={({ pressed }) => [styles.container, pressed && styles.pressed, style]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      testID={testID}
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      style={[styles.container, style]}
    >
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: theme.borders.width,
    borderColor: theme.colors.border,
    padding: theme.spacing.cardPadding,
  },
  pressed: {
    opacity: theme.opacities.pressed,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.space[3],
  },
  title: {
    ...theme.typography.heading,
    color: theme.colors.text,
    flexShrink: 1,
  },
});

export default Card;
