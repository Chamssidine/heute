import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Banner, EmptyState, Screen } from "../../components/ui";
import {
  berlinToday,
  DaySelector,
  formatDayLabel,
  KitchenGroupsSection,
  KitchenMenuSection,
  KitchenTotalsSection,
} from "../../features/kitchen/components";
import { useKitchenDay } from "../../features/kitchen/hooks";
import { theme } from "../../lib/theme";
import { strings } from "../../strings";

export interface KuecheScreenProps {
  initialDate?: string;
}

export default function KuecheScreen({ initialDate }: KuecheScreenProps = {}): React.ReactElement {
  const today = berlinToday();
  const [selectedDate, setSelectedDate] = useState<string>(initialDate ?? today);
  const viewState = useKitchenDay(selectedDate);

  return (
    <Screen
      testID="screen-kueche"
      title={`${strings.tabs.kueche} · ${formatDayLabel(selectedDate)}`}
      viewState={viewState}
      headerRight={
        <DaySelector currentDate={selectedDate} onDateChange={setSelectedDate} todayDate={today} />
      }
      renderEmpty={() => <EmptyState message={strings.kitchen.emptyDay} />}
    >
      {(day) => (
        <View style={styles.container}>
          <Banner
            variant="warning"
            text={strings.kitchen.allergyBanner}
            testID="kitchen-allergy-banner"
            style={styles.banner}
          />

          <KitchenTotalsSection totals={day.totals} noLunch={day.noLunch} noDinner={day.noDinner} />

          <KitchenGroupsSection groups={day.groups} />

          <KitchenMenuSection menu={day.menu} noLunch={day.noLunch} noDinner={day.noDinner} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: theme.space[4],
  },
  banner: {
    marginBottom: theme.space[3],
  },
});
