import React from "react";
import { Screen, ViewState } from "../../components/ui/Screen";
import { strings } from "../../strings";

const emptyState: ViewState<never> = {
  status: "empty",
  message: strings.tabs.comingSoon,
};

export default function AufgabenScreen(): React.ReactElement {
  return (
    <Screen testID="screen-aufgaben" title={strings.tabs.aufgaben} viewState={emptyState}>
      {null}
    </Screen>
  );
}
