import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
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
  const [viewMode, setViewMode] = useState<ShiftViewMode>("monat");
  // Provisoire : mois de la fixture, en attendant le branchement Supabase (voir issue #35).
  const viewState = useMyShifts(myShiftsFixture.month);

  return (
    <Screen
      testID="screen-dienstplan"
      title={strings.shifts.title}
      viewState={viewState}
      headerRight={<ViewModeSelector mode={viewMode} onChange={setViewMode} />}
    >
      {(data) => (
        <View style={styles.container}>
          <ShiftsBalanceHeader month={data.month} ist={data.ist} soll={data.soll} />

          {viewMode === "woche" ? (
            <Text style={styles.notice}>{strings.shifts.weekUnavailable}</Text>
          ) : (
            <View style={styles.listContainer}>
              {data.days.map((day, index) => (
                <ShiftRow key={day.date} day={day} isLast={index === data.days.length - 1} />
              ))}
            </View>
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: theme.space[4],
  },
  notice: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  listContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: theme.borders.width,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
});
