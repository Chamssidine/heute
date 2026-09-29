import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { theme } from "../../lib/theme";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "default" | "large";

export interface ButtonProps {
  title: string;
  onPress: () => void | Promise<void>;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  size = "default",
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  style,
  testID,
  accessibilityLabel,
}) => {
  const isInteractive = !disabled && !loading;

  const spinnerColor = variant === "primary" ? theme.colors.onPrimary : theme.colors.primary;

  const heightStyle = size === "large" ? styles.heightLarge : styles.heightDefault;

  return (
    <Pressable
      testID={testID}
      onPress={isInteractive ? onPress : undefined}
      disabled={!isInteractive}
      accessible={true}
      accessibilityRole="button"
      accessibilityState={{ disabled: !isInteractive, busy: loading }}
      accessibilityLabel={accessibilityLabel ?? title}
      style={({ pressed }) => [
        styles.base,
        heightStyle,
        styles[variant],
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        pressed && isInteractive && styles.pressed,
        style,
      ]}
    >
      <View style={[styles.contentRow, loading && styles.hiddenContent]}>
        {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
        <Text
          style={[
            styles.label,
            variant === "primary" && styles.labelPrimary,
            variant === "secondary" && styles.labelSecondary,
            variant === "ghost" && styles.labelGhost,
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>

      {loading ? (
        <View style={styles.spinnerOverlay} pointerEvents="none">
          <ActivityIndicator color={spinnerColor} />
        </View>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.sm,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.space[4],
    minWidth: theme.layout.minTouchTarget,
    position: "relative",
  },
  heightDefault: {
    height: theme.layout.buttonHeightDefault,
  },
  heightLarge: {
    height: theme.layout.buttonHeightLarge,
  },
  fullWidth: {
    width: "100%",
  },
  primary: {
    backgroundColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borders.width,
    borderColor: theme.colors.borderStrong,
  },
  ghost: {
    backgroundColor: theme.colors.transparent,
  },
  disabled: {
    opacity: theme.opacities.disabled,
  },
  pressed: {
    opacity: theme.opacities.pressed,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    marginRight: theme.space[2],
  },
  hiddenContent: {
    opacity: theme.opacities.transparent,
  },
  spinnerOverlay: {
    position: "absolute",
    top: theme.insets.zero,
    left: theme.insets.zero,
    right: theme.insets.zero,
    bottom: theme.insets.zero,
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    ...theme.typography.label,
  },
  labelPrimary: {
    color: theme.colors.onPrimary,
  },
  labelSecondary: {
    color: theme.colors.text,
  },
  labelGhost: {
    color: theme.colors.primary,
  },
});

export default Button;
