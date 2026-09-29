import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { theme } from "../../lib/theme";
import { strings } from "../../strings";

export interface CountTileProps {
  label: string;
  count?: number | null;
  isCancelled?: boolean;
  cancelledText?: string;
  modified?: {
    time: string;
    previousCount: number | string;
  } | null;
  chips?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const CountTile: React.FC<CountTileProps> = ({
  label,
  count,
  isCancelled = false,
  cancelledText = strings.meals.noLunch,
  modified,
  chips,
  style,
  testID,
}) => {
  const getAccessibilityLabel = (): string => {
    if (isCancelled) {
      return `${label}: ${cancelledText}`;
    }
    const countPart = `${label}: ${count ?? 0}`;
    if (modified) {
      return `${countPart}, ${strings.meals.modified(modified.time, modified.previousCount)}`;
    }
    return countPart;
  };

  return (
    <View
      testID={testID}
      accessible={true}
      accessibilityRole="summary"
      accessibilityLabel={getAccessibilityLabel()}
      style={[
        styles.container,
        isCancelled ? styles.cancelledContainer : styles.normalContainer,
        style,
      ]}
    >
      <Text style={styles.label}>{label}</Text>

      <View style={styles.valueRow}>
        {isCancelled ? (
          <Text style={styles.cancelledText} android_hyphenationFrequency="normal">
            {cancelledText}
          </Text>
        ) : (
          <View>
            {modified ? (
              <>
                <View style={styles.markerBadge}>
                  <Text style={[styles.count, styles.markerCount]}>{count ?? 0}</Text>
                </View>
                <Text style={styles.modifiedText}>
                  {strings.meals.modified(modified.time, modified.previousCount)}
                </Text>
              </>
            ) : (
              <Text style={[styles.count, styles.normalCount]}>{count ?? 0}</Text>
            )}
          </View>
        )}
      </View>

      {chips ? <View style={styles.chipsContainer}>{chips}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.radius.md,
    borderWidth: theme.borders.width,
    borderColor: theme.colors.border,
    padding: theme.spacing.cardPadding,
  },
  normalContainer: {
    backgroundColor: theme.colors.surface,
  },
  cancelledContainer: {
    backgroundColor: theme.colors.surfaceMuted,
  },
  label: {
    ...theme.typography.label,
    color: theme.colors.textMuted,
    marginBottom: theme.space[2],
  },
  valueRow: {
    marginVertical: theme.space[1],
  },
  count: {
    ...theme.typography.display,
    ...theme.tabularNums,
  },
  normalCount: {
    color: theme.colors.text,
  },
  markerBadge: {
    backgroundColor: theme.colors.marker,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.space[2],
    alignSelf: "flex-start",
  },
  markerCount: {
    color: theme.colors.onMarker,
  },
  modifiedText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.space[1],
  },
  cancelledText: {
    ...theme.typography.heading,
    color: theme.colors.textMuted,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: theme.space[3],
    gap: theme.space[2],
  },
});

export default CountTile;
