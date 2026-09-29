import assert from "node:assert/strict";
import { test } from "node:test";
import { RPC_ERROR_CODES, RPC_ERROR_MESSAGES, rpcErrorMessage } from "./index.ts";

test("chaque code d'erreur RPC a un message", () => {
  for (const code of Object.values(RPC_ERROR_CODES)) {
    assert.ok(RPC_ERROR_MESSAGES[code].length > 0);
    assert.equal(rpcErrorMessage(code), RPC_ERROR_MESSAGES[code]);
  }
});

test("un code inconnu donne le message générique", () => {
  assert.equal(rpcErrorMessage("XX000"), "Etwas ist schiefgelaufen. Bitte versuche es erneut.");
  assert.equal(rpcErrorMessage(undefined), "Etwas ist schiefgelaufen. Bitte versuche es erneut.");
});
