import React, { useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Screen, type ViewState } from "../../components/ui/Screen";
import {
  TodayGuestsCard,
  TodayMenuCard,
  TodayShiftCard,
  TodayTasksCard,
} from "../../features/today/components";
import { useToday } from "../../features/today/hooks";
import type { TodayCardId, TodayView } from "../../features/today/model";
import { theme } from "../../lib/theme";
import { strings } from "../../strings";

import { berlinToday } from "../../features/today/components/helpers";

export { berlinToday };

export interface HeuteScreenProps {
  date?: string;
  onNavigateToTasks?: () => void;
}

export default function HeuteScreen({
  date: propDate,
  onNavigateToTasks,
}: HeuteScreenProps = {}): React.ReactElement {
  const date = propDate ?? berlinToday();
  const viewState = useToday(date);

  const handleNavigateToTasks = useCallback(() => {
    if (onNavigateToTasks) {
      onNavigateToTasks();
    } else {
      router.navigate("/(tabs)/aufgaben");
    }
  }, [onNavigateToTasks]);

  const dateLabel = viewState.data?.dateLabel;
  const screenTitle = dateLabel ? `${strings.tabs.heute} · ${dateLabel}` : strings.tabs.heute;

  // Garantit la transmission de « Stand HH:MM » fourni par le modèle au Screen
  const effectiveViewState: ViewState<TodayView> = {
    ...viewState,
    updatedAt:
      viewState.updatedAt ??
      viewState.data?.lastUpdatedAt ??
      (viewState.data?.lastUpdatedLabel
        ? viewState.data.lastUpdatedLabel.replace(/^Stand\s*/, "")
        : undefined),
  };

  const renderCard = (cardId: TodayCardId, data: TodayView) => {
    switch (cardId) {
      case "my_shift":
        return <TodayShiftCard key="my_shift" shift={data.myShift} />;
      case "my_tasks":
        return (
          <TodayTasksCard
            key="my_tasks"
            tasks={data.myTasks}
            onNavigateToTasks={handleNavigateToTasks}
          />
        );
      case "guests":
        return (
          <TodayGuestsCard key="guests" guests={data.guests} isKitchenRole={data.isKitchenRole} />
        );
      case "menu":
        return <TodayMenuCard key="menu" menu={data.menu} />;
    }
  };

  return (
    <Screen testID="screen-heute" title={screenTitle} viewState={effectiveViewState}>
      {(data) => (
        <View style={styles.cardsContainer}>
          {data.cardOrder.map((cardId) => renderCard(cardId, data))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardsContainer: {
    gap: theme.spacing.cardGap,
    paddingBottom: theme.space[4],
  },
});
