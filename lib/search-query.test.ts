import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeSearchQuery } from "./search-query.ts";

describe("search query", () => {
  it("collapses whitespace and keeps a usable title", () => {
    assert.equal(normalizeSearchQuery("  Breaking   Bad "), "Breaking Bad");
  });

  it("rejects one character and anything over 80", () => {
    assert.equal(normalizeSearchQuery(" a "), null);
    assert.equal(normalizeSearchQuery("x".repeat(81)), null);
    assert.equal(normalizeSearchQuery("ok"), "ok");
  });
});
