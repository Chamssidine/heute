import { useEffect, useRef } from "react";
import { getSupabase } from "./supabase.ts";

// Sous-ensemble du client supabase-js utilisé ici : permet un faux client dans les tests.
export type RealtimeChannelLike = {
  on(
    type: "postgres_changes",
    filter: { event: "*"; schema: "public"; table: string },
    callback: () => void,
  ): RealtimeChannelLike;
  subscribe(): RealtimeChannelLike;
};

export type RealtimeClientLike = {
  channel(name: string): RealtimeChannelLike;
  removeChannel(channel: RealtimeChannelLike): unknown;
};

// Retourne la fonction de désabonnement.
export function subscribeToTables(
  client: RealtimeClientLike,
  tables: readonly string[],
  onChange: () => void,
): () => void {
  let channel = client.channel(`admin-refresh-${tables.join("-")}`);
  for (const table of tables) {
    channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, onChange);
  }
  const subscribed = channel.subscribe();
  return () => {
    void client.removeChannel(subscribed);
  };
}

// Appelle `onChange` à chaque modification des tables ; se désabonne au démontage de la page.
export function useRealtimeRefresh(tables: readonly string[], onChange: () => void): void {
  const latest = useRef(onChange);
  latest.current = onChange;
  const key = tables.join(",");

  useEffect(() => {
    return subscribeToTables(getSupabase(), key.split(","), () => latest.current());
  }, [key]);
}
