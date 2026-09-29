import React, { useEffect, useRef } from "react";
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { theme } from "../../lib/theme";
import { strings } from "../../strings";

export interface SnackbarProps {
  visible: boolean;
  message: string;
  onUndo?: () => void;
  undoLabel?: string;
  duration?: number;
  onDismiss?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const Snackbar: React.FC<SnackbarProps> = ({
  visible,
  message,
  onUndo,
  undoLabel = strings.common.undo,
  duration = theme.animations.snackbarDurationMs,
  onDismiss,
  style,
  testID,
}) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible && duration > 0 && onDismiss) {
      timerRef.current = setTimeout(() => {
        onDismiss();
      }, duration);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [visible, duration, onDismiss]);

  if (!visible) {
    return null;
  }

  const handleUndo = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (onUndo) {
      onUndo();
    }
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <View
      testID={testID}
      accessible={true}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={message}
      style={[styles.container, style]}
    >
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>

      {onUndo ? (
        <Pressable
          onPress={handleUndo}
          hitSlop={theme.space[1]}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={undoLabel}
          style={({ pressed }) => [styles.undoButton, pressed && styles.pressed]}
        >
          <Text style={styles.undoText}>{undoLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: theme.layout.snackbarBottomOffset,
    left: theme.spacing.screenMargin,
    right: theme.spacing.screenMargin,
    minHeight: theme.layout.snackbarHeight,
    backgroundColor: theme.colors.text,
    borderRadius: theme.radius.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[2],
    zIndex: 1000,
  },
  message: {
    ...theme.typography.body,
    color: theme.colors.surface,
    flex: 1,
    marginRight: theme.space[2],
  },
  undoButton: {
    minHeight: theme.layout.minTouchTarget,
    minWidth: theme.layout.minTouchTarget,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.space[2],
  },
  undoText: {
    ...theme.typography.label,
    color: theme.colors.marker,
  },
  pressed: {
    opacity: theme.opacities.pressed,
  },
});

export default Snackbar;
