import React from "react";
import { StyleSheet, View } from "react-native";
import { Screen } from "../../components/ui/Screen";
import { TeamGroupSection, formatTeamDate } from "../../features/team/components";
import { useTeamDay } from "../../features/team/hooks";
import { theme } from "../../lib/theme";
import { strings } from "../../strings";

export interface TeamScreenProps {
  date?: string;
}

export default function TeamScreen({ date }: TeamScreenProps = {}): React.ReactElement {
  const viewState = useTeamDay(date);

  const title =
    viewState.status === "success" || viewState.status === "offline"
      ? strings.team.headerTitle(formatTeamDate(viewState.data.date))
      : strings.team.title;

  return (
    <Screen testID="screen-team" title={title} viewState={viewState}>
      {(data) => (
        <View style={styles.container}>
          {data.groups.map((group) => (
            <TeamGroupSection key={group.id} group={group} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: theme.space[4],
  },
});
