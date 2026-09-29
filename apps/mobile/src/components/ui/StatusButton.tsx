import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { theme } from "../../lib/theme";
import { strings } from "../../strings";
import { Banner } from "./Banner";
import { Button } from "./Button";

export type TaskStatus = "offen" | "in_arbeit" | "erledigt";

export interface StatusButtonProps {
  status: TaskStatus;
  onStatusChange: (nextStatus: TaskStatus) => void | Promise<void>;
  isLoading?: boolean;
  errorMessage?: string;
  onDismissError?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const StatusButton: React.FC<StatusButtonProps> = ({
  status,
  onStatusChange,
  isLoading = false,
  errorMessage,
  onDismissError,
  style,
  testID,
}) => {
  const getNextStatus = (): TaskStatus => {
    switch (status) {
      case "offen":
        return "in_arbeit";
      case "in_arbeit":
        return "erledigt";
      case "erledigt":
        return "offen";
    }
  };

  const getButtonConfig = () => {
    switch (status) {
      case "offen":
        return {
          title: strings.tasks.start,
          variant: "primary" as const,
        };
      case "in_arbeit":
        return {
          title: strings.tasks.done,
          variant: "primary" as const,
        };
      case "erledigt":
        return {
          title: strings.tasks.reopen,
          variant: "ghost" as const,
        };
    }
  };

  const config = getButtonConfig();
  const nextStatus = getNextStatus();

  return (
    <View style={[styles.container, style]} testID={testID}>
      {errorMessage ? (
        <Banner
          variant="danger"
          text={errorMessage}
          onClose={onDismissError}
          style={styles.errorBanner}
        />
      ) : null}

      <Button
        title={config.title}
        variant={config.variant}
        size="large"
        fullWidth={true}
        loading={isLoading}
        onPress={() => onStatusChange(nextStatus)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  errorBanner: {
    marginBottom: theme.space[2],
  },
});

export default StatusButton;
