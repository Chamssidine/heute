import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { theme } from "../../lib/theme";
import { Button } from "./Button";

export interface EmptyStateProps {
  message: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onPress: () => void | Promise<void>;
  };
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ message, icon, action, style, testID }) => {
  return (
    <View
      testID={testID}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={message}
      style={[styles.container, style]}
    >
      {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
      <Text style={styles.message} android_hyphenationFrequency="normal">
        {message}
      </Text>
      {action ? (
        <View style={styles.actionContainer}>
          <Button
            title={action.label}
            onPress={action.onPress}
            variant="secondary"
            size="default"
          />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: theme.layout.emptyStatePaddingVertical,
    paddingHorizontal: theme.spacing.screenMargin,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    marginBottom: theme.space[3],
  },
  message: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: "center",
  },
  actionContainer: {
    marginTop: theme.space[4],
  },
});

export default EmptyState;
