import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { consumeRateLimit, resetRateLimits } from "./rate-limit.ts";

describe("rate limit", () => {
  it("allows a fixed number of hits, then pauses until the window moves", () => {
    resetRateLimits();
    const window = { limit: 2, windowMs: 1_000 };
    assert.equal(consumeRateLimit("search", window, 0), true);
    assert.equal(consumeRateLimit("search", window, 10), true);
    assert.equal(consumeRateLimit("search", window, 20), false);
    assert.equal(consumeRateLimit("other", window, 20), true);
    assert.equal(consumeRateLimit("search", window, 1_010), true);
  });
});
