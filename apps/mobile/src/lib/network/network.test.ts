import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  handleNetworkStateChange,
  isNetworkConnected,
  setupNetworkListenerWithSource,
  _resetNetworkState,
  type NetInfoListenerSource,
} from "./connection.ts";

describe("Network listener et reconnexion (P4-01)", () => {
  beforeEach(() => {
    _resetNetworkState(true);
  });

  describe("isNetworkConnected", () => {
    it("renvoie true lorsque connecté et internet accessible", () => {
      assert.equal(isNetworkConnected({ isConnected: true, isInternetReachable: true }), true);
    });

    it("renvoie false lorsque non connecté", () => {
      assert.equal(isNetworkConnected({ isConnected: false, isInternetReachable: false }), false);
    });

    it("renvoie false si isInternetReachable est explicitement false", () => {
      assert.equal(isNetworkConnected({ isConnected: true, isInternetReachable: false }), false);
    });
  });

  describe("handleNetworkStateChange", () => {
    it("déclenche une nouvelle lecture (invalidation) quand le réseau revient", () => {
      let invalidationCount = 0;
      let onlineState = true;

      const mockClient = {
        invalidateQueries: async () => {
          invalidationCount++;
        },
      };

      // 1. Passage hors ligne
      handleNetworkStateChange(
        { isConnected: false, isInternetReachable: false },
        mockClient,
        (online) => {
          onlineState = online;
        },
      );

      assert.equal(onlineState, false);
      assert.equal(invalidationCount, 0, "Pas d'invalidation lors de la coupure");

      // 2. Retour en ligne
      handleNetworkStateChange(
        { isConnected: true, isInternetReachable: true },
        mockClient,
        (online) => {
          onlineState = online;
        },
      );

      assert.equal(onlineState, true);
      assert.equal(
        invalidationCount,
        1,
        "Doit déclencher une invalidation au retour de la connexion",
      );
    });

    it("ne déclenche pas d'invalidation répétée si le réseau reste en ligne", () => {
      let invalidationCount = 0;
      const mockClient = {
        invalidateQueries: async () => {
          invalidationCount++;
        },
      };

      _resetNetworkState(true);
      handleNetworkStateChange({ isConnected: true, isInternetReachable: true }, mockClient);

      assert.equal(invalidationCount, 0, "Déjà en ligne, pas d'invalidation supplémentaire");
    });

    it("setupNetworkListenerWithSource transmet les événements et se désabonne", () => {
      const holder: { listener: ((state: { isConnected: boolean }) => void) | null } = {
        listener: null,
      };
      let unsubscribed = false;

      const mockSource: NetInfoListenerSource = {
        addEventListener: (fn) => {
          holder.listener = fn;
          return () => {
            unsubscribed = true;
          };
        },
      };

      let invalidationCount = 0;
      const mockClient = {
        invalidateQueries: async () => {
          invalidationCount++;
        },
      };

      _resetNetworkState(false);
      const unsubscribe = setupNetworkListenerWithSource(mockSource, mockClient);

      assert.ok(holder.listener != null);
      holder.listener({ isConnected: true });
      assert.equal(invalidationCount, 1);

      unsubscribe();
      assert.equal(unsubscribed, true);
    });
  });
});
