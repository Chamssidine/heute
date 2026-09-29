import React from "react";
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { theme } from "../../lib/theme";
import { strings } from "../../strings";

export type BannerVariant = "info" | "warning" | "danger";

export interface BannerProps {
  variant?: BannerVariant;
  text: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onPress: () => void;
  };
  onClose?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const Banner: React.FC<BannerProps> = ({
  variant = "info",
  text,
  icon,
  action,
  onClose,
  style,
  testID,
}) => {
  return (
    <View
      testID={testID}
      accessible={true}
      accessibilityRole="alert"
      accessibilityLabel={text}
      style={[styles.container, styles[variant], style]}
    >
      <View style={styles.contentRow}>
        {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
        <Text
          style={[
            styles.text,
            variant === "info" && styles.textInfo,
            variant === "warning" && styles.textWarning,
            variant === "danger" && styles.textDanger,
          ]}
        >
          {text}
        </Text>
      </View>

      <View style={styles.actionsRow}>
        {action ? (
          <Pressable
            onPress={action.onPress}
            hitSlop={theme.space[1]}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
          >
            <Text
              style={[
                styles.actionLabel,
                variant === "info" && styles.textInfo,
                variant === "warning" && styles.textWarning,
                variant === "danger" && styles.textDanger,
              ]}
            >
              {action.label}
            </Text>
          </Pressable>
        ) : null}

        {onClose ? (
          <Pressable
            onPress={onClose}
            hitSlop={theme.space[1]}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={strings.common.close}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <Text
              style={[
                styles.closeLabel,
                variant === "info" && styles.textInfo,
                variant === "warning" && styles.textWarning,
                variant === "danger" && styles.textDanger,
              ]}
            >
              ✕
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.radius.sm,
    borderWidth: theme.borders.width,
    padding: theme.space[3],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: theme.layout.minTouchTarget,
  },
  info: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primary,
  },
  warning: {
    backgroundColor: theme.colors.warningSoft,
    borderColor: theme.colors.warning,
  },
  danger: {
    backgroundColor: theme.colors.dangerSoft,
    borderColor: theme.colors.danger,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: theme.space[2],
  },
  iconContainer: {
    marginRight: theme.space[2],
  },
  text: {
    ...theme.typography.body,
    flex: 1,
  },
  textInfo: {
    color: theme.colors.onPrimarySoft,
  },
  textWarning: {
    color: theme.colors.onWarningSoft,
  },
  textDanger: {
    color: theme.colors.onDangerSoft,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    minHeight: theme.layout.minTouchTarget,
    minWidth: theme.layout.minTouchTarget,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.space[2],
  },
  actionLabel: {
    ...theme.typography.label,
    textDecorationLine: "underline",
  },
  closeButton: {
    minHeight: theme.layout.minTouchTarget,
    minWidth: theme.layout.minTouchTarget,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.space[2],
  },
  closeLabel: {
    ...theme.typography.bodyStrong,
  },
  pressed: {
    opacity: theme.opacities.pressed,
  },
});

export default Banner;
