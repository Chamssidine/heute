import assert from "node:assert/strict";
import { test } from "node:test";
import { de } from "../strings/de.ts";
import { canAccessAdmin, loginErrorMessage } from "./auth.ts";

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
