import React from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { formatHHMM } from "@heute/domain";
import { theme } from "../../../lib/theme";
import { strings } from "../../../strings";
import { formatShiftMonth } from "./formatters";

export interface ShiftsBalanceHeaderProps {
  month: string;
  ist: number;
  soll: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const ShiftsBalanceHeader: React.FC<ShiftsBalanceHeaderProps> = ({
  month,
  ist,
  soll,
  style,
  testID = "shifts-balance-header",
}) => {
  const monthName = formatShiftMonth(month);
  const istFormatted = formatHHMM(ist);
  const sollFormatted = formatHHMM(soll);
  const balanceLabel = strings.shifts.balanceHeader(istFormatted, sollFormatted);

  const a11yLabel = `${monthName}, ${balanceLabel}`;

  return (
    <View
      testID={testID}
      accessible={true}
      accessibilityRole="summary"
      accessibilityLabel={a11yLabel}
      style={[styles.container, style]}
    >
      <View style={styles.topRow}>
        <Text style={styles.monthTitle} accessibilityRole="header">
          {monthName}
        </Text>
        <Text style={styles.balanceText}>{balanceLabel}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: theme.borders.width,
    borderColor: theme.colors.border,
    padding: theme.spacing.cardPadding,
    marginBottom: theme.spacing.cardGap,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: theme.space[2],
  },
  monthTitle: {
    ...theme.typography.heading,
    color: theme.colors.text,
  },
  balanceText: {
    ...theme.typography.bodyStrong,
    ...theme.tabularNums,
    color: theme.colors.text,
  },
});

export default ShiftsBalanceHeader;
