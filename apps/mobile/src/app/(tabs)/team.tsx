import React from "react";
import { Screen, ViewState } from "../../components/ui/Screen";
import { strings } from "../../strings";

const emptyState: ViewState<never> = {
  status: "empty",
  message: strings.tabs.comingSoon,
};

export default function TeamScreen(): React.ReactElement {
  return (
    <Screen testID="screen-team" title={strings.tabs.team} viewState={emptyState}>
      {null}
    </Screen>
  );
}
