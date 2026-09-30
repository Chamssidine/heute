import assert from "node:assert/strict";
import { test } from "node:test";
import {
  subscribeToTables,
  type RealtimeChannelLike,
  type RealtimeClientLike,
} from "./realtime.ts";

function fakeClient() {
  const listeners = new Map<string, () => void>();
  const log: string[] = [];
  const channel: RealtimeChannelLike = {
    on(_type, filter, callback) {
      listeners.set(filter.table, callback);
      return channel;
    },
    subscribe() {
      log.push("subscribe");
      return channel;
    },
  };
  const client: RealtimeClientLike = {
    channel(name) {
      log.push(`channel:${name}`);
      return channel;
    },
    removeChannel(removed) {
      assert.equal(removed, channel);
      log.push("remove");
    },
  };
  return { client, listeners, log };
}

test("subscribeToTables : un écouteur par table, relecture à chaque changement", () => {
  const { client, listeners, log } = fakeClient();
  let calls = 0;
  subscribeToTables(client, ["room_tasks", "rooms"], () => {
    calls += 1;
  });
  assert.deepEqual([...listeners.keys()], ["room_tasks", "rooms"]);
  assert.deepEqual(log, ["channel:admin-refresh-room_tasks-rooms", "subscribe"]);
  listeners.get("room_tasks")?.();
  listeners.get("rooms")?.();
  assert.equal(calls, 2);
});

test("subscribeToTables : le désabonnement retire le canal", () => {
  const { client, log } = fakeClient();
  const unsubscribe = subscribeToTables(client, ["shifts"], () => {});
  unsubscribe();
  assert.equal(log.at(-1), "remove");
});
