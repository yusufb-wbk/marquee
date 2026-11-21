import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { clientAddress } from "./client-address.ts";

describe("client address", () => {
  it("uses the first forwarded address", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.4, 10.0.0.1",
    });
    assert.equal(clientAddress(headers), "203.0.113.4");
  });

  it("falls back when the header is missing", () => {
    assert.equal(clientAddress(new Headers()), "unknown");
  });
});
