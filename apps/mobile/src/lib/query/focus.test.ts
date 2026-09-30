import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { focusManager } from "@tanstack/react-query";
import {
  handleAppStateFocus,
  setupFocusAppStateListener,
  _resetLastAppState,
  type AppStateSource,
  type AppStateStatus,
} from "./focus.ts";

describe("AppState focus et refetch (P4-01)", () => {
  beforeEach(() => {
    _resetLastAppState("active");
  });

  it("met à jour focusManager et ne déclenche pas d'invalidation quand l'état reste 'active'", async () => {
    let invalidated = false;
    const mockClient = {
      invalidateQueries: async () => {
        invalidated = true;
      },
    };

    handleAppStateFocus("active", mockClient);

    assert.equal(focusManager.isFocused(), true);
    assert.equal(invalidated, false, "Pas d'invalidation superflue si déjà actif");
  });

  it("passe focusManager à false sans invalider lors du passage en arrière-plan", async () => {
    let invalidated = false;
    const mockClient = {
      invalidateQueries: async () => {
        invalidated = true;
      },
    };

    handleAppStateFocus("background", mockClient);

    assert.equal(focusManager.isFocused(), false);
    assert.equal(invalidated, false, "L'arrière-plan ne doit pas déclencher d'invalidation");
  });

  it("déclenche une nouvelle lecture (invalidation) au retour au premier plan depuis background", async () => {
    let invalidationCount = 0;
    const mockClient = {
      invalidateQueries: async () => {
        invalidationCount++;
      },
    };

    _resetLastAppState("background");
    handleAppStateFocus("active", mockClient);

    assert.equal(focusManager.isFocused(), true);
    assert.equal(invalidationCount, 1, "Doit invalider les requêtes au retour au premier plan");
  });

  it("déclenche une nouvelle lecture (invalidation) au retour au premier plan depuis inactive", async () => {
    let invalidationCount = 0;
    const mockClient = {
      invalidateQueries: async () => {
        invalidationCount++;
      },
    };

    _resetLastAppState("inactive");
    handleAppStateFocus("active", mockClient);

    assert.equal(focusManager.isFocused(), true);
    assert.equal(invalidationCount, 1, "Doit invalider les requêtes depuis l'état inactive");
  });

  it("setupFocusAppStateListener enregistre l'écouteur et se désabonne correctement", () => {
    const holder: { listener: ((state: AppStateStatus) => void) | null } = {
      listener: null,
    };
    let removed = false;

    const mockAppState: AppStateSource = {
      addEventListener: (_type, listener) => {
        holder.listener = listener;
        return {
          remove: () => {
            removed = true;
          },
        };
      },
    };

    let invalidationCount = 0;
    const mockClient = {
      invalidateQueries: async () => {
        invalidationCount++;
      },
    };

    _resetLastAppState("background");
    const cleanup = setupFocusAppStateListener(mockAppState, mockClient);

    assert.ok(holder.listener != null);
    holder.listener("active");
    assert.equal(invalidationCount, 1);

    cleanup();
    assert.equal(removed, true);
  });
});
