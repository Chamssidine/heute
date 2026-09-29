import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Screen } from "../../components/ui/Screen";
import {
  ShiftRow,
  ShiftsBalanceHeader,
  ViewModeSelector,
  type ShiftViewMode,
} from "../../features/shifts/components";
import { useMyShifts } from "../../features/shifts/hooks";
import { myShiftsFixture } from "../../features/shifts/model";
import { theme } from "../../lib/theme";
import { strings } from "../../strings";

export default function DienstplanScreen(): React.ReactElement {
  const [viewMode, setViewMode] = useState<ShiftViewMode>("woche");
  const viewState = useMyShifts(myShiftsFixture.month);

  return (
    <Screen
      testID="screen-dienstplan"
      title={strings.shifts.title}
      viewState={viewState}
      headerRight={<ViewModeSelector mode={viewMode} onChange={setViewMode} />}
    >
      {(data) => {
        const displayedDays = viewMode === "woche" ? data.days.slice(0, 7) : data.days;

        return (
          <View style={styles.container}>
            <ShiftsBalanceHeader month={data.month} ist={data.ist} soll={data.soll} />

            <View style={styles.listContainer}>
              {displayedDays.map((day, index) => (
                <ShiftRow key={day.date} day={day} isLast={index === displayedDays.length - 1} />
              ))}
            </View>
          </View>
        );
      }}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: theme.space[4],
  },
  listContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: theme.borders.width,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
});
