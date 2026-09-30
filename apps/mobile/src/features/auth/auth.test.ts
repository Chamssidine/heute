/// <reference types="node" />

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  authApi,
  fetchEmployeeProfile,
  fetchSession,
  mapAuthError,
  onAuthStateChange,
  signInWithEmail,
  signOut,
  type HeuteSupabaseClient,
} from "./api.ts";
import { useAuth } from "./hooks.ts";
import { AUTH_MESSAGES, authSessionFixture, authUserFixture, toAuthViewState } from "./model.ts";

describe("features/auth (P2-02 [L])", () => {
  describe("model.ts - types et toAuthViewState", () => {
    it("définit des fixtures valides sans secret ni token", () => {
      assert.equal(authUserFixture.email, "karl.koch@musterberg.test");
      assert.equal(authUserFixture.displayName, "Karl Musterkoch");
      assert.equal(authUserFixture.role, "staff");
      assert.equal(authUserFixture.department, "kueche");
      assert.equal(authSessionFixture.user, authUserFixture);
      // Aucun token brut dans la session exposée
      assert.equal("accessToken" in authSessionFixture, false);
      assert.equal("token" in authSessionFixture, false);
    });

    it("toAuthViewState renvoie l'état loading quand isLoading est vrai", () => {
      const state = toAuthViewState({ isLoading: true });
      assert.equal(state.status, "loading");
    });

    it("toAuthViewState renvoie l'état unauthorized pour un utilisateur non connecté", () => {
      const state = toAuthViewState({ session: null });
      assert.equal(state.status, "unauthorized");
      assert.equal(state.message, AUTH_MESSAGES.unauthorizedMessage);
      assert.equal(state.data, undefined);
    });

    it("toAuthViewState renvoie l'état success quand une session valide est présente", () => {
      const state = toAuthViewState({ session: authSessionFixture });
      assert.equal(state.status, "success");
      assert.equal(state.data, authSessionFixture);
    });

    it("toAuthViewState renvoie l'état offline avec les données en cache en mode hors ligne", () => {
      const state = toAuthViewState({
        session: authSessionFixture,
        isOffline: true,
      });
      assert.equal(state.status, "offline");
      assert.equal(state.data, authSessionFixture);
    });

    it("toAuthViewState renvoie l'état error avec le message d'erreur", () => {
      const state = toAuthViewState({
        error: new Error(AUTH_MESSAGES.invalidCredentials),
      });
      assert.equal(state.status, "error");
      assert.equal(state.message, AUTH_MESSAGES.invalidCredentials);
    });
  });

  describe("api.ts - gestion des erreurs et cartographie allemande", () => {
    it("mappe les identifiants invalides vers le message allemand adéquat", () => {
      const err = mapAuthError(new Error("Invalid login credentials"));
      assert.equal(err.message, AUTH_MESSAGES.invalidCredentials);
    });

    it("mappe les pannes réseau vers le message allemand de connectivité", () => {
      const err = mapAuthError(new Error("Failed to fetch"));
      assert.equal(err.message, AUTH_MESSAGES.networkError);
    });

    it("mappe les comptes inactifs vers le message de désactivation", () => {
      const err = mapAuthError(new Error("Benutzer ist deaktiviert"));
      assert.equal(err.message, AUTH_MESSAGES.userInactive);
    });

    it("mappe les erreurs inconnues vers le message générique", () => {
      const err = mapAuthError(new Error("Unknown server issue"));
      assert.equal(err.message, AUTH_MESSAGES.genericError);
    });
  });

  describe("api.ts - appels Supabase avec client mock", () => {
    it("signInWithEmail récupère le compte et le profil employé associé", async () => {
      const mockClient = {
        auth: {
          signInWithPassword: async () => ({
            data: {
              user: { id: "user-123", email: "karl.koch@musterberg.test" },
              session: { expires_at: 1800000000 },
            },
            error: null,
          }),
        },
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "emp-123",
                  user_id: "user-123",
                  display_name: "Karl Musterkoch",
                  role: "staff",
                  department: "kueche",
                  active: true,
                },
                error: null,
              }),
            }),
          }),
        }),
      } as unknown as HeuteSupabaseClient;

      const session = await signInWithEmail(
        { email: "karl.koch@musterberg.test", password: "demo-Passwort-2026" },
        mockClient,
      );

      assert.equal(session.user.id, "emp-123");
      assert.equal(session.user.userId, "user-123");
      assert.equal(session.user.displayName, "Karl Musterkoch");
      assert.equal(session.user.role, "staff");
      assert.equal(session.user.department, "kueche");
      assert.equal(session.expiresAt, 1800000000);
    });

    it("fetchEmployeeProfile renvoie un profil par défaut si l'employé n'est pas encore créé", async () => {
      const mockClient = {
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      } as unknown as HeuteSupabaseClient;

      const profile = await fetchEmployeeProfile("unknown-user-id", mockClient);
      assert.equal(profile.displayName, "Mitarbeiter");
      assert.equal(profile.role, "staff");
      assert.equal(profile.department, "housekeeping");
    });

    it("signInWithEmail rejette si le compte est inactif", async () => {
      const mockClient = {
        auth: {
          signInWithPassword: async () => ({
            data: {
              user: { id: "user-inactive", email: "inactive@musterberg.test" },
              session: { expires_at: 1800000000 },
            },
            error: null,
          }),
        },
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "emp-inactive",
                  user_id: "user-inactive",
                  display_name: "Inaktiver Mitarbeiter",
                  role: "staff",
                  department: "kueche",
                  active: false,
                },
                error: null,
              }),
            }),
          }),
        }),
      } as unknown as HeuteSupabaseClient;

      await assert.rejects(
        () => signInWithEmail({ email: "inactive@musterberg.test", password: "pwd" }, mockClient),
        (err: Error) => err.message === AUTH_MESSAGES.userInactive,
      );
    });

    it("signOut appelle auth.signOut et gère le succès", async () => {
      let signedOut = false;
      const mockClient = {
        auth: {
          signOut: async () => {
            signedOut = true;
            return { error: null };
          },
        },
      } as unknown as HeuteSupabaseClient;

      await signOut(mockClient);
      assert.equal(signedOut, true);
    });

    it("fetchSession renvoie null si aucune session n'est enregistrée", async () => {
      const mockClient = {
        auth: {
          getSession: async () => ({
            data: { session: null },
            error: null,
          }),
        },
      } as unknown as HeuteSupabaseClient;

      const session = await fetchSession(mockClient);
      assert.equal(session, null);
    });

    it("onAuthStateChange gère l'abonnement et le désabonnement", () => {
      let unsubscribed = false;
      const mockClient = {
        auth: {
          onAuthStateChange: () => ({
            data: {
              subscription: {
                unsubscribe: () => {
                  unsubscribed = true;
                },
              },
            },
          }),
        },
      } as unknown as HeuteSupabaseClient;

      const unsubscribe = onAuthStateChange(() => {}, mockClient);
      unsubscribe();
      assert.equal(unsubscribed, true);
    });
  });

  describe("hooks.ts - useAuth (états connexion, erreur et déconnexion)", () => {
    it("état déconnexion : session nulle -> statut unauthorized et messages en allemand", () => {
      const auth = useAuth({ mockSession: null });

      assert.equal(auth.status, "unauthorized");
      assert.equal(auth.isAuthenticated, false);
      assert.equal(auth.session, null);
      assert.equal(auth.user, null);
      assert.equal(auth.message, AUTH_MESSAGES.unauthorizedMessage);
      assert.equal(auth.state.status, "unauthorized");
    });

    it("état connexion : session présente -> statut success et données utilisateur", () => {
      const auth = useAuth({ mockSession: authSessionFixture });

      assert.equal(auth.status, "success");
      assert.equal(auth.isAuthenticated, true);
      assert.ok(auth.session);
      assert.equal(auth.user?.displayName, "Karl Musterkoch");
      assert.equal(auth.user?.role, "staff");
      assert.equal(auth.user?.department, "kueche");
      assert.equal(auth.state.status, "success");
    });

    it("connexion réussie via signIn(credentials)", async () => {
      const mockApi = {
        ...authApi,
        signInWithEmail: async () => authSessionFixture,
        signOut: async () => {},
      };

      const auth = useAuth({ mockSession: null, api: mockApi });
      assert.equal(auth.isAuthenticated, false);

      await auth.signIn({
        email: "karl.koch@musterberg.test",
        password: "demo-Passwort-2026",
      });

      assert.equal(auth.isAuthenticated, true);
      assert.equal(auth.status, "success");
      assert.equal(auth.user?.displayName, "Karl Musterkoch");
    });

    it("connexion réussie avec signature signIn(email, password)", async () => {
      let receivedEmail = "";
      let receivedPassword = "";
      const mockApi = {
        ...authApi,
        signInWithEmail: async (creds: { email: string; password: string }) => {
          receivedEmail = creds.email;
          receivedPassword = creds.password;
          return authSessionFixture;
        },
        signOut: async () => {},
      };

      const auth = useAuth({ mockSession: null, api: mockApi });
      await auth.signIn("karl.koch@musterberg.test", "demo-Passwort-2026");

      assert.equal(receivedEmail, "karl.koch@musterberg.test");
      assert.equal(receivedPassword, "demo-Passwort-2026");
      assert.equal(auth.isAuthenticated, true);
    });

    it("état erreur : échec de connexion avec identifiants erronés", async () => {
      const mockApi = {
        ...authApi,
        signInWithEmail: async () => {
          throw new Error(AUTH_MESSAGES.invalidCredentials);
        },
        signOut: async () => {},
      };

      const auth = useAuth({ mockSession: null, api: mockApi });

      await assert.rejects(
        () => auth.signIn("faux@musterberg.test", "mauvais_mdp"),
        (err: Error) => err.message === AUTH_MESSAGES.invalidCredentials,
      );

      assert.equal(auth.isAuthenticated, false);
      assert.equal(auth.status, "error");
      assert.equal(auth.message, AUTH_MESSAGES.invalidCredentials);
    });

    it("déconnexion réussie via signOut() ramenant à l'état unauthorized", async () => {
      let signedOut = false;
      const mockApi = {
        ...authApi,
        signInWithEmail: async () => authSessionFixture,
        signOut: async () => {
          signedOut = true;
        },
      };

      const auth = useAuth({ mockSession: authSessionFixture, api: mockApi });
      assert.equal(auth.isAuthenticated, true);

      await auth.signOut();

      assert.equal(signedOut, true);
      assert.equal(auth.isAuthenticated, false);
      assert.equal(auth.session, null);
      assert.equal(auth.user, null);
      assert.equal(auth.status, "unauthorized");
      assert.equal(auth.message, AUTH_MESSAGES.unauthorizedMessage);
    });
  });
});
