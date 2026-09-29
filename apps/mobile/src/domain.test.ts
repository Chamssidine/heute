import assert from "node:assert/strict";
import { test } from "node:test";
import * as domain from "@heute/domain";

test("packages/domain is resolved and imported successfully", () => {
  assert.equal(typeof domain, "object");
});
