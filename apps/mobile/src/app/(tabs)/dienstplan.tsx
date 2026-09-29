import React from "react";
import { Screen, ViewState } from "../../components/ui/Screen";
import { strings } from "../../strings";

const emptyState: ViewState<never> = {
  status: "empty",
  message: strings.tabs.comingSoon,
};

export default function DienstplanScreen(): React.ReactElement {
  return (
    <Screen testID="screen-dienstplan" title={strings.tabs.dienstplan} viewState={emptyState}>
      {null}
    </Screen>
  );
}
