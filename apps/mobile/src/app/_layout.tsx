import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Stack } from "expo-router";
// Imported for its side effect: connects NetInfo to TanStack Query's onlineManager.
import "../lib/network";
import { asyncStoragePersister, queryClient } from "../lib/query";

// The auth session is not persisted: Supabase keeps it in secure storage and stays the
// source of truth, so a stale cached user can never outlive a logout.
const persistOptions = {
  persister: asyncStoragePersister,
  maxAge: 1000 * 60 * 60 * 24,
  dehydrateOptions: {
    shouldDehydrateQuery: (query: { queryKey: readonly unknown[] }) => query.queryKey[0] !== "auth",
  },
};

export default function RootLayout() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="anmeldung" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </PersistQueryClientProvider>
  );
}
