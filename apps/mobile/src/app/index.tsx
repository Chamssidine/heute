import * as domain from "@heute/domain";
import { StyleSheet, Text, View } from "react-native";

export default function IndexScreen() {
  const isDomainLoaded = typeof domain === "object";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Heute</Text>
      <Text style={styles.subtitle}>
        {isDomainLoaded ? "Domain verbunden" : "Domain nicht verfügbar"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 16,
    color: "#666666",
    marginTop: 8,
  },
});
