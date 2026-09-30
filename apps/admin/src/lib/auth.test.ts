import assert from "node:assert/strict";
import { test } from "node:test";
import { de } from "../strings/de.ts";
import { canAccessAdmin, loginErrorMessage, profileFromEmployee } from "./auth.ts";

test("profileFromEmployee : ligne absente ou inactive → erreur explicite", () => {
  const disabled = { status: "error", message: de.accountDisabled };
  assert.deepEqual(profileFromEmployee(null), disabled);
  assert.deepEqual(
    profileFromEmployee({ display_name: "A", role: "admin", active: false }),
    disabled,
  );
});

test("profileFromEmployee : rôle et accès", () => {
  assert.deepEqual(profileFromEmployee({ display_name: "A", role: "staff", active: true }), {
    status: "forbidden",
    displayName: "A",
  });
  assert.deepEqual(profileFromEmployee({ display_name: "A", role: "admin", active: true }), {
    status: "ready",
    displayName: "A",
    role: "admin",
  });
});

test("canAccessAdmin : admin et kitchen_lead seulement", () => {
  assert.equal(canAccessAdmin("admin"), true);
  assert.equal(canAccessAdmin("kitchen_lead"), true);
  assert.equal(canAccessAdmin("staff"), false);
});

test("loginErrorMessage : messages allemands", () => {
  assert.equal(
    loginErrorMessage(new Error("Invalid login credentials")),
    de.login.invalidCredentials,
  );
  assert.equal(loginErrorMessage(new Error("Failed to fetch")), de.login.networkError);
  assert.equal(loginErrorMessage(new Error("boom")), de.login.genericError);
});
