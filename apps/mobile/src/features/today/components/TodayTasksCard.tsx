import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { router } from "expo-router";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { theme } from "../../../lib/theme";
import { strings } from "../../../strings";
import type { TodayTasks } from "../model";

export interface TodayTasksCardProps {
  tasks: TodayTasks | null;
  onNavigateToTasks?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const TodayTasksCard: React.FC<TodayTasksCardProps> = ({
  tasks,
  onNavigateToTasks,
  style,
  testID = "today-card-tasks",
}) => {
  const handlePressAllTasks = () => {
    if (onNavigateToTasks) {
      onNavigateToTasks();
    } else {
      router.navigate("/(tabs)/aufgaben");
    }
  };

  const renderHeaderRight = () => {
    if (!tasks?.progressLabel) {
      return null;
    }
    return (
      <Text testID="today-tasks-progress" style={styles.progressText}>
        {tasks.progressLabel}
      </Text>
    );
  };

  const renderTaskInfo = () => {
    if (tasks?.nextTask) {
      return (
        <Text
          testID="today-tasks-next"
          style={styles.nextTaskText}
          android_hyphenationFrequency="normal"
        >
          <Text style={styles.nextTaskPrefix}>{strings.today.nextPrefix}</Text>
          {tasks.nextTask.label}
        </Text>
      );
    }

    if (!tasks || !tasks.hasTasks) {
      return (
        <Text
          testID="today-tasks-empty"
          style={styles.emptyText}
          android_hyphenationFrequency="normal"
        >
          {strings.today.noTasks}
        </Text>
      );
    }

    if (tasks.completed === tasks.total && tasks.total > 0) {
      return (
        <Text
          testID="today-tasks-completed"
          style={styles.completedText}
          android_hyphenationFrequency="normal"
        >
          {strings.today.allTasksDone}
        </Text>
      );
    }

    return null;
  };

  return (
    <Card
      testID={testID}
      title={strings.today.myTasks}
      headerRight={renderHeaderRight()}
      style={style}
    >
      <View style={styles.content}>
        {renderTaskInfo()}
        <Button
          testID="today-button-all-tasks"
          title={strings.today.allTasks}
          variant="secondary"
          fullWidth
          onPress={handlePressAllTasks}
          style={styles.button}
        />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: theme.space[3],
  },
  progressText: {
    ...theme.typography.label,
    ...theme.tabularNums,
    color: theme.colors.textMuted,
  },
  nextTaskText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  nextTaskPrefix: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  completedText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  button: {
    marginTop: theme.space[1],
  },
});

export default TodayTasksCard;
