import React from "react";
import { Redirect } from "expo-router";
import { useAuth } from "../features/auth/hooks";

export default function IndexScreen(): React.ReactElement | null {
  const { isAuthenticated, status } = useAuth();

  if (status === "loading") {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/anmeldung" />;
  }

  return <Redirect href="/(tabs)/heute" />;
}
