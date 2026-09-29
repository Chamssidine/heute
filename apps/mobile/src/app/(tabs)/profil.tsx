import React from "react";
import { Screen, ViewState } from "../../components/ui/Screen";
import { strings } from "../../strings";

const emptyState: ViewState<never> = {
  status: "empty",
  message: strings.tabs.comingSoon,
};

export default function ProfilScreen(): React.ReactElement {
  return (
    <Screen testID="screen-profil" title={strings.tabs.profil} viewState={emptyState}>
      {null}
    </Screen>
  );
}
