import React from "react";
import { Redirect } from "expo-router";

export default function LoginRoute(): React.ReactElement {
  return <Redirect href="/anmeldung" />;
}
