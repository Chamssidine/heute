import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Chip } from "../../../components/ui";
import { theme, type ChipVariant } from "../../../lib/theme";
import type { TaskItem, TaskStatus } from "../model.ts";

const STATUS_VARIANTS: Record<TaskStatus, ChipVariant> = {
  offen: "offen",
  in_arbeit: "inArbeit",
  erledigt: "erledigt",
};

export interface TaskRowProps {
  task: TaskItem;
}

export const TaskRow: React.FC<TaskRowProps> = ({ task }) => {
  const isDone = task.status === "erledigt";
  const details = `${task.floorLabel} · ${task.typeLabel}`;

  return (
    <View
      testID={`task-row-${task.id}`}
      accessible={true}
      accessibilityLabel={`${task.title}, ${details}, ${task.statusLabel}`}
      style={styles.container}
    >
      <Text
        style={[styles.title, isDone && styles.titleDone]}
        android_hyphenationFrequency="normal"
      >
        {task.title}
      </Text>
      <Text style={styles.details} android_hyphenationFrequency="normal">
        {details}
      </Text>
      <Chip label={task.statusLabel} variant={STATUS_VARIANTS[task.status]} style={styles.chip} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: theme.layout.listRowMinHeight,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: theme.borders.width,
    borderColor: theme.colors.border,
    padding: theme.spacing.cardPadding,
  },
  title: {
    ...theme.typography.bodyStrong,
    color: theme.colors.text,
  },
  titleDone: {
    color: theme.colors.textMuted,
  },
  details: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.space[1],
  },
  chip: {
    marginTop: theme.space[2],
  },
});

export default TaskRow;
