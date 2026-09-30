import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Card } from "../../../components/ui/Card";
import { theme } from "../../../lib/theme";
import { strings } from "../../../strings";
import type { TodayGuests } from "../model";

export interface TodayGuestsCardProps {
  guests: TodayGuests;
  isKitchenRole?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const TodayGuestsCard: React.FC<TodayGuestsCardProps> = ({
  guests,
  isKitchenRole = false,
  style,
  testID = "today-card-guests",
}) => {
  const lpLabel =
    guests.mittag.subLabel ??
    (guests.lunchpaketCount > 0 ? `${strings.chips.lp} ${guests.lunchpaketCount}` : null);

  const a11yLabel = `${strings.today.guestsToday}: ${guests.frueh.label} ${guests.frueh.count}, ${
    guests.mittag.label
  } ${guests.mittag.count}${lpLabel ? `, ${lpLabel}` : ""}, ${guests.abend.label} ${
    guests.abend.count
  }`;

  return (
    <Card
      testID={testID}
      title={strings.today.guestsToday}
      style={style}
      accessibilityLabel={a11yLabel}
    >
      <View style={styles.content}>
        <View style={styles.mealsRow}>
          {/* Früh */}
          <View testID="today-guests-frueh" style={styles.mealGroup}>
            <Text style={styles.mealLabel}>{guests.frueh.label}</Text>
            {guests.frueh.highlight ? (
              <View testID="today-guests-frueh-marker" style={styles.markerBadge}>
                <Text style={[styles.mealCount, styles.markerCount]}>{guests.frueh.count}</Text>
              </View>
            ) : (
              <Text style={styles.mealCount}>{guests.frueh.count}</Text>
            )}
          </View>

          {/* Mittag + LP */}
          <View testID="today-guests-mittag" style={styles.mealGroup}>
            <Text style={styles.mealLabel}>{guests.mittag.label}</Text>
            {guests.mittag.highlight ? (
              <View testID="today-guests-mittag-marker" style={styles.markerBadge}>
                <Text style={[styles.mealCount, styles.markerCount]}>{guests.mittag.count}</Text>
              </View>
            ) : (
              <Text style={styles.mealCount}>{guests.mittag.count}</Text>
            )}
            {lpLabel ? (
              <Text testID="today-guests-lp" style={styles.subCount}>
                {" · " + lpLabel}
              </Text>
            ) : null}
          </View>

          {/* Abend */}
          <View testID="today-guests-abend" style={styles.mealGroup}>
            <Text style={styles.mealLabel}>{guests.abend.label}</Text>
            {guests.abend.highlight ? (
              <View testID="today-guests-marker" style={styles.markerBadge}>
                <Text style={[styles.mealCount, styles.markerCount]}>{guests.abend.count}</Text>
              </View>
            ) : (
              <Text style={styles.mealCount}>{guests.abend.count}</Text>
            )}
            {guests.abend.subLabel && !lpLabel ? (
              <Text style={styles.subCount}>{" · " + guests.abend.subLabel}</Text>
            ) : null}
          </View>
        </View>

        {/* Change Notices */}
        {[guests.frueh.changeNotice, guests.mittag.changeNotice, guests.abend.changeNotice]
          .filter((notice): notice is string => Boolean(notice))
          .map((notice, index) => (
            <Text
              key={index}
              testID={index === 0 ? "today-guests-change-notice" : undefined}
              style={styles.changeNotice}
              android_hyphenationFrequency="normal"
            >
              {notice}
            </Text>
          ))}

        {/* Régimes alimentaires pour les rôles cuisine */}
        {isKitchenRole && guests.abend.dietsSummary ? (
          <Text
            testID="today-guests-diets"
            style={styles.dietsSummary}
            android_hyphenationFrequency="normal"
          >
            {guests.abend.dietsSummary}
          </Text>
        ) : null}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: theme.space[2],
  },
  mealsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: theme.space[2],
  },
  mealGroup: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: theme.space[1],
  },
  mealLabel: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  mealCount: {
    ...theme.typography.bodyStrong,
    ...theme.tabularNums,
    color: theme.colors.text,
  },
  subCount: {
    ...theme.typography.body,
    ...theme.tabularNums,
    color: theme.colors.textMuted,
  },
  markerBadge: {
    backgroundColor: theme.colors.marker,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.space[1],
    paddingVertical: 1,
  },
  markerCount: {
    color: theme.colors.onMarker,
    fontWeight: theme.fontWeights.bold,
  },
  changeNotice: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.space[1],
  },
  dietsSummary: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.space[1],
  },
});

export default TodayGuestsCard;
