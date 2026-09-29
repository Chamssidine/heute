import React from "react";
import { Screen, ViewState } from "../../components/ui/Screen";
import { strings } from "../../strings";

const emptyState: ViewState<never> = {
  status: "empty",
  message: strings.tabs.comingSoon,
};

export default function KuecheScreen(): React.ReactElement {
  return (
    <Screen testID="screen-kueche" title={strings.tabs.kueche} viewState={emptyState}>
      {null}
    </Screen>
  );
}
