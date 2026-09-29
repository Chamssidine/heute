import React from "react";
import { StyleSheet, Text, TextStyle, StyleProp, View, ViewStyle } from "react-native";
import { theme } from "../../lib/theme";
import { strings } from "../../strings";

export interface SyncStampProps {
  time?: string;
  isOffline?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const SyncStamp: React.FC<SyncStampProps> = ({
  time,
  isOffline = false,
  style,
  textStyle,
}) => {
  const displayText = isOffline
    ? time
      ? strings.common.offlineStand(time)
      : strings.common.offline
    : time
      ? strings.common.lastUpdated(time)
      : "";

  if (!displayText) {
    return null;
  }

  return (
    <View
      style={[styles.container, style]}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={displayText}
    >
      <Text style={[styles.text, isOffline ? styles.offlineText : styles.normalText, textStyle]}>
        {displayText}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "flex-end",
  },
  text: {
    ...theme.typography.caption,
    ...theme.tabularNums,
  },
  normalText: {
    color: theme.colors.textMuted,
  },
  offlineText: {
    color: theme.colors.warning,
  },
});

export default SyncStamp;
