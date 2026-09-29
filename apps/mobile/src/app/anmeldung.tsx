import React from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LoginForm } from "../features/auth/components";
import { theme } from "../lib/theme";

export default function AnmeldungScreen(): React.ReactElement {
  return (
    <SafeAreaView
      testID="screen-anmeldung"
      style={styles.safeArea}
      edges={["top", "bottom", "left", "right"]}
    >
      <LoginForm
        onSuccess={() => {
          router.replace("/(tabs)/heute");
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
});
