import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Card } from "../../../components/ui/Card";
import { Chip } from "../../../components/ui/Chip";
import { theme, type ChipVariant } from "../../../lib/theme";
import { strings } from "../../../strings";
import type { TodayShift } from "../model";

const SHIFT_TYPE_TO_CHIP: Record<TodayShift["type"], ChipVariant> = {
  normal: "dienst",
  td: "teildienst",
  sem: "seminar",
  urlaub: "urlaub",
  krank: "krank",
  frei: "frei",
};

export interface TodayShiftCardProps {
  shift: TodayShift | null;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const TodayShiftCard: React.FC<TodayShiftCardProps> = ({
  shift,
  style,
  testID = "today-card-shift",
}) => {
  const chipVariant = shift ? SHIFT_TYPE_TO_CHIP[shift.type] : undefined;
  const hoursText = shift ? shift.hours : strings.today.noShift;
  const a11yLabel = `${strings.today.myShift}: ${hoursText}${shift ? `, ${shift.badgeLabel}` : ""}`;

  return (
    <Card
      testID={testID}
      title={strings.today.myShift}
      style={style}
      accessibilityLabel={a11yLabel}
    >
      <View style={styles.row}>
        <Text testID="today-shift-hours" style={styles.hours} android_hyphenationFrequency="normal">
          {hoursText}
        </Text>
        {shift && chipVariant ? (
          <Chip testID="today-shift-chip" label={shift.badgeLabel} variant={chipVariant} />
        ) : null}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hours: {
    ...theme.typography.bodyStrong,
    ...theme.tabularNums,
    color: theme.colors.text,
  },
});

export default TodayShiftCard;
