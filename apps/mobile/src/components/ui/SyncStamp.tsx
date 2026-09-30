import React from "react";
import { StyleSheet, Text, TextStyle, StyleProp, View, ViewStyle } from "react-native";
import { theme } from "../../lib/theme";
import { strings } from "../../strings";

export interface SyncStampProps {
  time?: string;
  isOffline?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}

export const SyncStamp: React.FC<SyncStampProps> = ({
  time,
  isOffline = false,
  style,
  textStyle,
  testID,
}) => {
  const normalizedTime = time?.startsWith(strings.common.stand)
    ? time.slice(strings.common.stand.length).trim()
    : time;

  const displayText = isOffline
    ? normalizedTime
      ? strings.common.offlineStand(normalizedTime)
      : strings.common.offline
    : normalizedTime
      ? strings.common.lastUpdated(normalizedTime)
      : "";

  if (!displayText) {
    return null;
  }

  return (
    <View
      testID={testID}
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
