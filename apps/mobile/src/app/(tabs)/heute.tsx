import React from "react";
import { Screen, ViewState } from "../../components/ui/Screen";
import { strings } from "../../strings";

const emptyState: ViewState<never> = {
  status: "empty",
  message: strings.tabs.comingSoon,
};

export default function HeuteScreen(): React.ReactElement {
  return (
    <Screen testID="screen-heute" title={strings.tabs.heute} viewState={emptyState}>
      {null}
    </Screen>
  );
}
