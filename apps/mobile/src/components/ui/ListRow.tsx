import React from "react";
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { theme } from "../../lib/theme";

export interface ListRowProps {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  bottomBorder?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
}

export const ListRow: React.FC<ListRowProps> = ({
  title,
  subtitle,
  left,
  right,
  onPress,
  bottomBorder = true,
  style,
  testID,
  accessibilityLabel,
}) => {
  const content = (
    <>
      {left ? <View style={styles.leftContainer}>{left}</View> : null}

      <View style={styles.contentContainer}>
        <Text style={styles.title} android_hyphenationFrequency="normal">
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} android_hyphenationFrequency="normal">
            {subtitle}
          </Text>
        ) : null}
      </View>

      {right ? <View style={styles.rightContainer}>{right}</View> : null}
    </>
  );

  const containerStyle = [styles.container, bottomBorder && styles.bottomBorder, style];

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        style={({ pressed }) => [...containerStyle, pressed && styles.pressed]}
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
      style={containerStyle}
    >
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: theme.layout.listRowMinHeight,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.space[3],
    paddingHorizontal: theme.spacing.screenMargin,
    backgroundColor: theme.colors.surface,
  },
  bottomBorder: {
    borderBottomWidth: theme.borders.width,
    borderBottomColor: theme.colors.border,
  },
  leftContainer: {
    marginRight: theme.space[3],
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
  },
  rightContainer: {
    marginLeft: theme.space[3],
    justifyContent: "center",
    alignItems: "flex-end",
  },
  title: {
    ...theme.typography.bodyStrong,
    color: theme.colors.text,
  },
  subtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.space[1],
  },
  pressed: {
    opacity: theme.opacities.pressed,
  },
});

export default ListRow;
