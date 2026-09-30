import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { handleRealtimeTableEvent } from "./handler.ts";
import {
  isRealtimeSubscribed,
  setupRealtimeAuthSync,
  subscribeToRealtime,
  unsubscribeFromRealtime,
  _resetRealtimeState,
  REALTIME_CHANNEL_NAME,
  type RealtimeSubscriptionChannel,
  type RealtimeSupabaseClient,
} from "./subscription.ts";

describe("Temps réel mobile : abonnement et invalidation (P4-01)", () => {
  beforeEach(() => {
    _resetRealtimeState();
  });

  describe("handleRealtimeTableEvent et confidentialité", () => {
    it("invalide les clés de shifts, today et team lors d'un événement sur shifts", async () => {
      const invalidatedKeys: unknown[] = [];
      const mockInvalidator = {
        invalidateQueries: async (opts: { queryKey: readonly unknown[] }) => {
          invalidatedKeys.push(opts.queryKey);
        },
      };

      await handleRealtimeTableEvent("shifts", mockInvalidator);

      assert.deepEqual(invalidatedKeys, [["shifts"], ["today"], ["team"]]);
    });

    it("invalide les clés de tasks et today lors d'un événement sur room_tasks", async () => {
      const invalidatedKeys: unknown[] = [];
      const mockInvalidator = {
        invalidateQueries: async (opts: { queryKey: readonly unknown[] }) => {
          invalidatedKeys.push(opts.queryKey);
        },
      };

      await handleRealtimeTableEvent("room_tasks", mockInvalidator);

      assert.deepEqual(invalidatedKeys, [["tasks"], ["today"]]);
    });

    it("invalide les clés de kitchen et today lors d'un événement sur meal_counts", async () => {
      const invalidatedKeys: unknown[] = [];
      const mockInvalidator = {
        invalidateQueries: async (opts: { queryKey: readonly unknown[] }) => {
          invalidatedKeys.push(opts.queryKey);
        },
      };

      await handleRealtimeTableEvent("meal_counts", mockInvalidator);

      assert.deepEqual(invalidatedKeys, [["kitchen"], ["today"]]);
    });

    it("invalide les clés de kitchen et today lors d'un événement sur menu_items", async () => {
      const invalidatedKeys: unknown[] = [];
      const mockInvalidator = {
        invalidateQueries: async (opts: { queryKey: readonly unknown[] }) => {
          invalidatedKeys.push(opts.queryKey);
        },
      };

      await handleRealtimeTableEvent("menu_items", mockInvalidator);

      assert.deepEqual(invalidatedKeys, [["kitchen"], ["today"]]);
    });

    it("n'invalide rien pour une table inconnue", async () => {
      const invalidatedKeys: unknown[] = [];
      const mockInvalidator = {
        invalidateQueries: async (opts: { queryKey: readonly unknown[] }) => {
          invalidatedKeys.push(opts.queryKey);
        },
      };

      await handleRealtimeTableEvent("unknown", mockInvalidator);
      assert.equal(invalidatedKeys.length, 0);
    });

    it("garantit l'absence totale de données de santé dans les logs", async () => {
      const loggedMessages: string[] = [];
      const mockLogger = (msg: string) => {
        loggedMessages.push(msg);
      };

      const mockInvalidator = {
        invalidateQueries: async () => {},
      };

      await handleRealtimeTableEvent("shifts", mockInvalidator, mockLogger);
      await handleRealtimeTableEvent("meal_counts", mockInvalidator, mockLogger);

      assert.ok(loggedMessages.length > 0);
      for (const log of loggedMessages) {
        const lower = log.toLowerCase();
        // Vérification stricte : aucun mot relatif à la santé ou aux motifs personnels
        assert.equal(lower.includes("krank"), false, "Interdiction du terme krank dans les logs");
        assert.equal(
          lower.includes("allerg"),
          false,
          "Interdiction des détails d'allergie dans les logs",
        );
        assert.equal(lower.includes("nuss"), false, "Interdiction des allergènes");
        assert.equal(lower.includes("gluten"), false, "Interdiction des allergènes");
        assert.equal(
          lower.includes("note"),
          false,
          "Interdiction des notes médicales ou personnelles",
        );
      }
    });
  });

  describe("Abonnement Supabase Realtime", () => {
    function createMockSupabase() {
      const listeners: Record<string, () => void> = {};
      let channelCreatedCount = 0;
      let removedChannel: unknown = null;

      const mockChannel: RealtimeSubscriptionChannel = {
        on: (_type, filter, callback) => {
          listeners[filter.table] = callback as () => void;
          return mockChannel;
        },
        subscribe: (cb) => {
          if (cb) cb("SUBSCRIBED");
          return mockChannel;
        },
        unsubscribe: async () => "ok",
      };

      const mockClient: RealtimeSupabaseClient = {
        channel: (name) => {
          assert.equal(name, REALTIME_CHANNEL_NAME);
          channelCreatedCount++;
          return mockChannel;
        },
        removeChannel: async (chan) => {
          removedChannel = chan;
          return "ok";
        },
      };

      return {
        mockClient,
        mockChannel,
        listeners,
        getChannelCount: () => channelCreatedCount,
        getRemoved: () => removedChannel,
      };
    }

    it("abonne les 4 tables au canal et la RLS fait foi (invalidation sans filtrage local)", async () => {
      const { mockClient, listeners, getChannelCount } = createMockSupabase();
      const invalidatedKeys: unknown[] = [];
      const mockInvalidator = {
        invalidateQueries: async (opts: { queryKey: readonly unknown[] }) => {
          invalidatedKeys.push(opts.queryKey);
        },
      };

      const channel = subscribeToRealtime(mockClient, mockInvalidator);
      assert.ok(channel != null);
      assert.equal(isRealtimeSubscribed(), true);
      assert.equal(getChannelCount(), 1);

      // Vérifie que les écouteurs sont enregistrés pour les 4 tables
      assert.ok(listeners["shifts"] != null);
      assert.ok(listeners["room_tasks"] != null);
      assert.ok(listeners["meal_counts"] != null);
      assert.ok(listeners["menu_items"] != null);

      // Déclenchement d'un événement sur shifts : la RLS fait foi
      listeners["shifts"]?.();
      assert.deepEqual(invalidatedKeys, [["shifts"], ["today"], ["team"]]);
    });

    it("aucun abonnement en double : des appels successifs renvoient l'abonnement actif", () => {
      const { mockClient, getChannelCount } = createMockSupabase();
      const mockInvalidator = { invalidateQueries: async () => {} };

      const chan1 = subscribeToRealtime(mockClient, mockInvalidator);
      const chan2 = subscribeToRealtime(mockClient, mockInvalidator);

      assert.equal(chan1, chan2);
      assert.equal(getChannelCount(), 1, "Un seul canal doit être créé, aucun doublon");
    });

    it("unsubscribeFromRealtime ferme et supprime le canal", async () => {
      const { mockClient, mockChannel, getRemoved } = createMockSupabase();
      const mockInvalidator = { invalidateQueries: async () => {} };

      subscribeToRealtime(mockClient, mockInvalidator);
      assert.equal(isRealtimeSubscribed(), true);

      await unsubscribeFromRealtime(mockClient);
      assert.equal(isRealtimeSubscribed(), false);
      assert.equal(getRemoved(), mockChannel);
    });

    it("unsubscribeFromRealtime gère les erreurs de fermeture avec journalisation explicite sans bloquer", async () => {
      const { mockClient } = createMockSupabase();
      const mockInvalidator = { invalidateQueries: async () => {} };

      mockClient.removeChannel = async () => {
        throw new Error("Erreur réseau de fermeture");
      };

      subscribeToRealtime(mockClient, mockInvalidator);
      assert.equal(isRealtimeSubscribed(), true);

      const logged: string[] = [];
      await unsubscribeFromRealtime(mockClient, (msg) => {
        logged.push(msg);
      });

      assert.equal(isRealtimeSubscribed(), false);
      assert.ok(logged.some((m) => m.includes("Erreur")));
    });
  });

  describe("setupRealtimeAuthSync (déconnexion et reconnexion)", () => {
    it("ferme les abonnements à la déconnexion et s'abonne à la connexion", async () => {
      const holder: {
        authCallback: ((event: string, session: { user?: unknown } | null) => void) | null;
      } = {
        authCallback: null,
      };
      let unsubscribeCalled = false;
      let channelCreatedCount = 0;
      let removeChannelCalled = false;

      const mockChannel: RealtimeSubscriptionChannel = {
        on: () => mockChannel,
        subscribe: () => mockChannel,
        unsubscribe: async () => {
          unsubscribeCalled = true;
          return "ok";
        },
      };

      const mockClient: RealtimeSupabaseClient = {
        channel: () => {
          channelCreatedCount++;
          return mockChannel;
        },
        removeChannel: async () => {
          removeChannelCalled = true;
          return "ok";
        },
        auth: {
          getSession: async () => ({ data: { session: null } }),
          onAuthStateChange: (cb) => {
            holder.authCallback = cb;
            return {
              data: {
                subscription: {
                  unsubscribe: () => {
                    unsubscribeCalled = true;
                  },
                },
              },
            };
          },
        },
      };

      const mockInvalidator = { invalidateQueries: async () => {} };

      const cleanup = setupRealtimeAuthSync(mockClient, mockInvalidator);

      assert.ok(holder.authCallback != null);
      assert.equal(isRealtimeSubscribed(), false);

      // 1. Connexion de l'utilisateur
      holder.authCallback("SIGNED_IN", { user: { id: "emp-1" } });
      assert.equal(isRealtimeSubscribed(), true);
      assert.equal(channelCreatedCount, 1);

      // 2. Déconnexion de l'utilisateur -> fermeture des abonnements
      await holder.authCallback("SIGNED_OUT", null);
      assert.equal(isRealtimeSubscribed(), false);
      assert.equal(removeChannelCalled, true, "L'abonnement doit être fermé lors du logout");

      cleanup();
      assert.equal(unsubscribeCalled, true);
    });

    it("s'abonne immédiatement si une session est déjà active à l'initialisation", async () => {
      let channelCreatedCount = 0;
      const mockChannel: RealtimeSubscriptionChannel = {
        on: () => mockChannel,
        subscribe: () => mockChannel,
        unsubscribe: async () => "ok",
      };

      const mockClient: RealtimeSupabaseClient = {
        channel: () => {
          channelCreatedCount++;
          return mockChannel;
        },
        removeChannel: async () => "ok",
        auth: {
          getSession: async () => ({ data: { session: { user: { id: "emp-init" } } } }),
          onAuthStateChange: () => ({
            data: { subscription: { unsubscribe: () => {} } },
          }),
        },
      };

      const cleanup = setupRealtimeAuthSync(mockClient, { invalidateQueries: async () => {} });
      // Attendre la résolution de la promesse getSession
      await new Promise((resolve) => setTimeout(resolve, 10));

      assert.equal(isRealtimeSubscribed(), true);
      assert.equal(channelCreatedCount, 1);
      cleanup();
    });

    it("gère l'échec de getSession avec un message générique sans détail de session", async () => {
      const logged: string[] = [];
      const mockClient: RealtimeSupabaseClient = {
        channel: () => {
          throw new Error("ne devrait pas être appelé");
        },
        removeChannel: async () => "ok",
        auth: {
          getSession: async () => {
            throw new Error("Erreur réseau temporaire");
          },
          onAuthStateChange: () => ({
            data: { subscription: { unsubscribe: () => {} } },
          }),
        },
      };

      const cleanup = setupRealtimeAuthSync(
        mockClient,
        { invalidateQueries: async () => {} },
        (msg) => {
          logged.push(msg);
        },
      );

      // Attendre la résolution du catch
      await new Promise((resolve) => setTimeout(resolve, 10));

      assert.equal(isRealtimeSubscribed(), false);
      assert.ok(logged.some((m) => m.includes("Erreur lors de la récupération de la session")));
      cleanup();
    });
  });
});
