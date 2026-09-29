import React from "react";
import { StyleSheet, Text } from "react-native";
import { Screen } from "../../components/ui/Screen";
import { TasksList } from "../../features/tasks/components";
import { useTasksDay } from "../../features/tasks/hooks.ts";
import { theme } from "../../lib/theme";
import { strings } from "../../strings";

// Date du jour au format YYYY-MM-DD, fuseau Europe/Berlin (en-CA donne ce format).
function berlinToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
}

// « Di, 30.09. » (screens.md §6.2).
function formatDayLabel(date: string): string {
  const [, month, day] = date.split("-");
  const weekday = strings.tasks.weekdaysShort[new Date(`${date}T12:00:00Z`).getUTCDay()];
  return `${weekday}, ${day}.${month}.`;
}

export default function AufgabenScreen(): React.ReactElement {
  const date = berlinToday();
  const viewState = useTasksDay(date);
  const progress = viewState.data?.progressLabel;

  return (
    <Screen
      testID="screen-aufgaben"
      title={`${strings.tasks.title} · ${formatDayLabel(date)}`}
      viewState={viewState}
      headerRight={progress ? <Text style={styles.progress}>{progress}</Text> : undefined}
    >
      {(day) => <TasksList day={day} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: {
    ...theme.typography.label,
    color: theme.colors.textMuted,
  },
});
