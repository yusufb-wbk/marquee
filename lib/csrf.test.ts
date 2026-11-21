import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { csrfForRequest, csrfMatches, isCsrfToken, newCsrfToken } from "./csrf.ts";

describe("csrf token", () => {
  it("accepts only the cookie value copied into the form", () => {
    const token = newCsrfToken();
    assert.equal(isCsrfToken(token), true);
    assert.equal(csrfMatches(token, token), true);
    const last = token.endsWith("0") ? "1" : "0";
    assert.equal(csrfMatches(token, `${token.slice(0, -1)}${last}`), false);
    assert.equal(csrfMatches(token, ""), false);
    assert.equal(csrfMatches(undefined, token), false);
  });

  it("reuses a valid cookie and replaces anything else", () => {
    const token = newCsrfToken();
    assert.equal(csrfForRequest(token), token);
    const minted = csrfForRequest("nope");
    assert.equal(isCsrfToken(minted), true);
    assert.notEqual(minted, "nope");
  });
});
