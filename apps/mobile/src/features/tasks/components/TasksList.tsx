import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "../../../lib/theme";
import { strings } from "../../../strings";
import type { TasksDay } from "../model.ts";
import { TaskRow } from "./TaskRow";

export interface TasksListProps {
  day: TasksDay;
}

export const TasksList: React.FC<TasksListProps> = ({ day }) => {
  return (
    <View testID="tasks-list" style={styles.container}>
      {day.floors.map((group) => {
        const openTasks = group.openTasks ?? [];
        if (openTasks.length === 0) {
          return null;
        }
        return (
          <View key={group.floor} style={styles.section}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {group.floorLabel}
            </Text>
            {openTasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </View>
        );
      })}

      {day.completedTasks.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {strings.tasks.completedSection(day.completedTasks.length)}
          </Text>
          {day.completedTasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: theme.space[4],
    paddingVertical: theme.space[2],
  },
  section: {
    gap: theme.space[2],
  },
  sectionTitle: {
    ...theme.typography.heading,
    color: theme.colors.text,
  },
});

export default TasksList;
